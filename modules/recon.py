"""
Recon Module — open ports, listening services, basic network topology.
Works on macOS (using netstat/lsof) and Linux (using ss/netstat).
"""
import asyncio
import platform
import re
import logging

logger = logging.getLogger(__name__)

RISKY_PORTS = {
    21: "FTP",
    23: "Telnet",
    25: "SMTP (unauthenticated relay risk)",
    53: "DNS",
    80: "HTTP (unencrypted)",
    110: "POP3",
    143: "IMAP",
    161: "SNMP",
    389: "LDAP (unencrypted)",
    445: "SMB",
    512: "rexec",
    513: "rlogin",
    514: "rsh/syslog",
    3306: "MySQL (exposed)",
    5432: "PostgreSQL (exposed)",
    6379: "Redis (exposed)",
    27017: "MongoDB (exposed)",
}


class ReconModule:
    async def scan(self) -> list:
        findings = []
        findings += await self._scan_open_ports()
        findings += await self._scan_network_interfaces()
        return findings

    async def _scan_open_ports(self) -> list:
        os_name = platform.system()
        if os_name == "Darwin":
            cmd = "netstat -an -p tcp | grep LISTEN"
        else:
            cmd = "ss -tulnp 2>/dev/null || netstat -tulnp 2>/dev/null"

        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode()

        findings = []
        open_ports = set()

        for line in output.splitlines():
            match = re.search(r"[:\.](\d+)\s+(LISTEN|\*)", line)
            if not match:
                match = re.search(r"\*\.(\d+)\s+", line)  # macOS netstat format
            if match:
                try:
                    port = int(match.group(1))
                    open_ports.add(port)
                except ValueError:
                    pass

        for port in open_ports:
            finding = {
                "module": "recon",
                "check": f"port_{port}_open",
                "port": port,
                "severity": "info",
                "description": f"Port {port} is open",
                "raw": output,
            }
            if port in RISKY_PORTS:
                finding["severity"] = "high" if port in (23, 21, 512, 513, 514) else "medium"
                finding["description"] = f"Port {port} open — {RISKY_PORTS[port]}"
                finding["check"] = self._port_check_key(port)
            findings.append(finding)

        logger.info(f"Recon found {len(open_ports)} open ports, {len([f for f in findings if f['severity'] != 'info'])} risky")
        return findings

    async def _scan_network_interfaces(self) -> list:
        cmd = "ifconfig" if platform.system() == "Darwin" else "ip addr show"
        proc = await asyncio.create_subprocess_shell(
            cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        return [{
            "module": "recon",
            "check": "network_interfaces",
            "severity": "info",
            "description": "Network interface snapshot",
            "raw": stdout.decode(),
        }]

    def _port_check_key(self, port: int) -> str:
        mapping = {21: "ftp_open", 23: "telnet_open", 25: "smtp_open",
                   6379: "redis_exposed", 27017: "mongo_exposed"}
        return mapping.get(port, f"port_{port}_open")
