"""
Services Module — detect insecure/unnecessary running services.
"""
import asyncio
import platform
import logging

logger = logging.getLogger(__name__)

INSECURE_SERVICES = {
    "telnet": {"severity": "critical", "reason": "Transmits data in plaintext"},
    "rsh": {"severity": "critical", "reason": "Insecure remote shell, no encryption"},
    "rlogin": {"severity": "critical", "reason": "Insecure remote login"},
    "rexec": {"severity": "critical", "reason": "Insecure remote execution"},
    "vsftpd": {"severity": "high", "reason": "FTP transmits credentials in plaintext"},
    "proftpd": {"severity": "high", "reason": "FTP transmits credentials in plaintext"},
    "tftp": {"severity": "high", "reason": "Trivial FTP — no authentication"},
    "snmpd": {"severity": "medium", "reason": "SNMP v1/v2 uses community strings (weak auth)"},
    "nfs": {"severity": "medium", "reason": "NFS can expose filesystem if misconfigured"},
    "rpcbind": {"severity": "medium", "reason": "RPC portmapper increases attack surface"},
}


class ServicesModule:
    async def scan(self) -> list:
        if platform.system() == "Darwin":
            return await self._scan_macos()
        return await self._scan_linux()

    async def _scan_linux(self) -> list:
        proc = await asyncio.create_subprocess_shell(
            "systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        return self._parse_services(stdout.decode())

    async def _scan_macos(self) -> list:
        proc = await asyncio.create_subprocess_shell(
            "launchctl list 2>/dev/null | grep -v '^-'",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        return self._parse_services(stdout.decode())

    def _parse_services(self, output: str) -> list:
        findings = []
        lower_output = output.lower()

        for svc, info in INSECURE_SERVICES.items():
            if svc in lower_output:
                findings.append({
                    "module": "services",
                    "check": f"{svc}_running",
                    "severity": info["severity"],
                    "description": f"Insecure service running: {svc}",
                    "reason": info["reason"],
                    "platform": platform.system().lower(),
                })

        if not findings:
            findings.append({
                "module": "services",
                "check": "services_ok",
                "severity": "info",
                "description": "No obviously insecure services detected",
            })

        return findings
