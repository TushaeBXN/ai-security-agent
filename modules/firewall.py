"""
Firewall Module — check firewall status on macOS (pf) and Linux (ufw/iptables).
"""
import asyncio
import platform
import logging

logger = logging.getLogger(__name__)


class FirewallModule:
    async def scan(self) -> list:
        os_name = platform.system()
        if os_name == "Darwin":
            return await self._scan_macos()
        return await self._scan_linux()

    async def _scan_macos(self) -> list:
        findings = []

        # Check Application Firewall (socketfilterfw)
        proc = await asyncio.create_subprocess_shell(
            "/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode()

        if "disabled" in output.lower():
            findings.append({
                "module": "firewall",
                "check": "macos_appfw_disabled",
                "severity": "high",
                "description": "macOS Application Firewall is disabled",
                "platform": "darwin",
            })
        elif "enabled" in output.lower():
            findings.append({
                "module": "firewall",
                "check": "macos_appfw_enabled",
                "severity": "info",
                "description": "macOS Application Firewall is enabled",
                "platform": "darwin",
            })
        else:
            findings.append({
                "module": "firewall",
                "check": "macos_appfw_unknown",
                "severity": "medium",
                "description": "Could not determine macOS Application Firewall state",
                "platform": "darwin",
            })

        # Check pf (packet filter)
        proc = await asyncio.create_subprocess_shell(
            "sudo pfctl -si 2>/dev/null | head -3",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        pf_output = stdout.decode()

        if "disabled" in pf_output.lower():
            findings.append({
                "module": "firewall",
                "check": "pf_disabled",
                "severity": "medium",
                "description": "macOS pf (packet filter) is disabled",
                "platform": "darwin",
            })

        return findings

    async def _scan_linux(self) -> list:
        findings = []

        # Check UFW
        proc = await asyncio.create_subprocess_shell(
            "ufw status 2>/dev/null",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        ufw_output = stdout.decode()

        if "inactive" in ufw_output.lower():
            findings.append({
                "module": "firewall",
                "check": "ufw_disabled",
                "severity": "high",
                "description": "UFW firewall is inactive",
                "platform": "linux",
            })
        elif "active" in ufw_output.lower():
            findings.append({
                "module": "firewall",
                "check": "ufw_active",
                "severity": "info",
                "description": "UFW firewall is active",
                "platform": "linux",
            })
        else:
            # Try iptables
            proc = await asyncio.create_subprocess_shell(
                "iptables -L INPUT -n 2>/dev/null | wc -l",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            try:
                rule_count = int(stdout.decode().strip())
                if rule_count <= 2:
                    findings.append({
                        "module": "firewall",
                        "check": "iptables_no_rules",
                        "severity": "high",
                        "description": "iptables has no INPUT rules — firewall may be open",
                        "platform": "linux",
                    })
                else:
                    findings.append({
                        "module": "firewall",
                        "check": "iptables_rules_exist",
                        "severity": "info",
                        "description": f"iptables has {rule_count - 2} INPUT rules configured",
                        "platform": "linux",
                    })
            except ValueError:
                findings.append({
                    "module": "firewall",
                    "check": "firewall_unknown",
                    "severity": "medium",
                    "description": "Could not determine firewall status",
                })

        return findings
