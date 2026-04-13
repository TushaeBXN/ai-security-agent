"""
Encryption Module — disk encryption status, TLS config checks.
"""
import asyncio
import platform
import logging

logger = logging.getLogger(__name__)


class EncryptionModule:
    async def scan(self) -> list:
        findings = []
        findings += await self._check_disk_encryption()
        findings += await self._check_ssh_key_types()
        return findings

    async def _check_disk_encryption(self) -> list:
        os_name = platform.system()

        if os_name == "Darwin":
            proc = await asyncio.create_subprocess_shell(
                "fdesetup status 2>/dev/null",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            output = stdout.decode()

            if "On" in output:
                return [{
                    "module": "encryption",
                    "check": "filevault_enabled",
                    "severity": "info",
                    "description": "FileVault disk encryption is enabled",
                    "platform": "darwin",
                }]
            elif "Off" in output:
                return [{
                    "module": "encryption",
                    "check": "filevault_disabled",
                    "severity": "high",
                    "description": "FileVault disk encryption is DISABLED — data at rest is unprotected",
                    "platform": "darwin",
                }]

        elif os_name == "Linux":
            proc = await asyncio.create_subprocess_shell(
                "lsblk -o NAME,TYPE,MOUNTPOINT 2>/dev/null | grep -i crypt",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            if stdout.decode().strip():
                return [{
                    "module": "encryption",
                    "check": "luks_enabled",
                    "severity": "info",
                    "description": "LUKS encrypted volumes detected",
                    "platform": "linux",
                }]
            else:
                return [{
                    "module": "encryption",
                    "check": "luks_not_detected",
                    "severity": "medium",
                    "description": "No LUKS encrypted volumes detected — disk may be unencrypted",
                    "platform": "linux",
                }]

        return [{
            "module": "encryption",
            "check": "encryption_check_unsupported",
            "severity": "info",
            "description": f"Disk encryption check not supported on {os_name}",
        }]

    async def _check_ssh_key_types(self) -> list:
        """Check for weak SSH host key types."""
        import os
        findings = []

        weak_keys = []
        for key_file in ["/etc/ssh/ssh_host_dsa_key", "/etc/ssh/ssh_host_rsa_key"]:
            if os.path.exists(key_file):
                weak_keys.append(key_file)

        if "/etc/ssh/ssh_host_dsa_key" in weak_keys:
            findings.append({
                "module": "encryption",
                "check": "ssh_dsa_key_present",
                "severity": "medium",
                "description": "DSA SSH host key found — DSA is deprecated and weak",
            })

        return findings
