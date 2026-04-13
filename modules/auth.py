"""
Auth Module — SSH config, root login, password auth, empty passwords.
"""
import asyncio
import platform
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class AuthModule:
    async def scan(self) -> list:
        findings = []
        findings += await self._check_ssh_config()
        findings += await self._check_root_account()
        return findings

    async def _check_ssh_config(self) -> list:
        findings = []
        sshd_config = Path("/etc/ssh/sshd_config")

        if not sshd_config.exists():
            return [{
                "module": "auth",
                "check": "ssh_not_installed",
                "severity": "info",
                "description": "SSH server not installed or config not found",
            }]

        try:
            content = sshd_config.read_text()
        except PermissionError:
            # Try with sudo
            proc = await asyncio.create_subprocess_shell(
                "sudo cat /etc/ssh/sshd_config",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            content = stdout.decode()

        checks = {
            "ssh_root_login": {
                "pattern": lambda c: self._ssh_setting_enabled(c, "PermitRootLogin", ["yes"]),
                "severity": "critical",
                "description": "SSH allows root login",
            },
            "ssh_password_auth": {
                "pattern": lambda c: self._ssh_setting_enabled(c, "PasswordAuthentication", ["yes"]),
                "severity": "high",
                "description": "SSH password authentication is enabled",
            },
            "ssh_empty_passwords": {
                "pattern": lambda c: self._ssh_setting_enabled(c, "PermitEmptyPasswords", ["yes"]),
                "severity": "critical",
                "description": "SSH allows empty passwords",
            },
            "ssh_x11_forwarding": {
                "pattern": lambda c: self._ssh_setting_enabled(c, "X11Forwarding", ["yes"]),
                "severity": "low",
                "description": "SSH X11 forwarding is enabled",
            },
            "ssh_protocol_v1": {
                "pattern": lambda c: "Protocol 1" in c,
                "severity": "critical",
                "description": "SSHv1 protocol enabled (deprecated and insecure)",
            },
        }

        for check_key, check in checks.items():
            if check["pattern"](content):
                findings.append({
                    "module": "auth",
                    "check": check_key,
                    "severity": check["severity"],
                    "description": check["description"],
                    "platform": platform.system().lower(),
                })

        if not findings:
            findings.append({
                "module": "auth",
                "check": "ssh_config_ok",
                "severity": "info",
                "description": "SSH configuration looks secure",
            })

        return findings

    def _ssh_setting_enabled(self, content: str, key: str, bad_values: list) -> bool:
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("#"):
                continue
            if line.lower().startswith(key.lower()):
                parts = line.split()
                if len(parts) >= 2 and parts[1].lower() in bad_values:
                    return True
        return False

    async def _check_root_account(self) -> list:
        if platform.system() == "Darwin":
            # macOS root is typically disabled
            proc = await asyncio.create_subprocess_shell(
                "dscl . -read /Users/root UserShell 2>/dev/null",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            output = stdout.decode()
            if "/bin/bash" in output or "/bin/sh" in output:
                return [{
                    "module": "auth",
                    "check": "root_account_enabled",
                    "severity": "high",
                    "description": "Root account has a login shell enabled on macOS",
                    "platform": "darwin",
                }]
        return []
