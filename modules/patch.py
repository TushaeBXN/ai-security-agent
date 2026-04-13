"""
Patch Module — check for pending OS/package updates and known outdated software.
"""
import asyncio
import platform
import logging

logger = logging.getLogger(__name__)


class PatchModule:
    async def scan(self) -> list:
        os_name = platform.system()
        if os_name == "Darwin":
            return await self._scan_macos()
        elif os_name == "Linux":
            return await self._scan_linux()
        return [{
            "module": "patch",
            "check": "patch_scan_unsupported",
            "severity": "info",
            "description": f"Patch scanning not yet supported on {os_name}",
        }]

    async def _scan_macos(self) -> list:
        findings = []

        # Check for softwareupdate available updates
        proc = await asyncio.create_subprocess_shell(
            "softwareupdate -l 2>&1",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=60)
        output = stdout.decode()

        if "No new software available" in output:
            findings.append({
                "module": "patch",
                "check": "macos_updates_current",
                "severity": "info",
                "description": "macOS is up to date",
            })
        elif "recommended" in output.lower() or "restart" in output.lower():
            findings.append({
                "module": "patch",
                "check": "macos_updates_available",
                "severity": "high",
                "description": "macOS system updates are available",
                "raw": output[:500],
            })
        else:
            findings.append({
                "module": "patch",
                "check": "macos_updates_unknown",
                "severity": "medium",
                "description": "Could not determine macOS update status",
                "raw": output[:200],
            })

        # Check Homebrew if available
        brew_check = await asyncio.create_subprocess_shell(
            "which brew && brew outdated --quiet 2>/dev/null | head -20",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        brew_stdout, _ = await brew_check.communicate()
        brew_output = brew_stdout.decode().strip()

        if brew_output and "/brew" in brew_output:
            packages = [l for l in brew_output.splitlines() if not l.startswith("/")]
            if packages:
                findings.append({
                    "module": "patch",
                    "check": "homebrew_outdated",
                    "severity": "medium",
                    "description": f"{len(packages)} Homebrew packages are outdated",
                    "packages": packages,
                })

        return findings

    async def _scan_linux(self) -> list:
        findings = []

        # Try apt first, then yum/dnf
        for cmd, distro in [
            ("apt-get -s upgrade 2>/dev/null | grep -c '^Inst'", "debian"),
            ("yum check-update --quiet 2>/dev/null | wc -l", "rhel"),
        ]:
            proc = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            try:
                count = int(stdout.decode().strip())
                if count > 0:
                    findings.append({
                        "module": "patch",
                        "check": "linux_updates_available",
                        "severity": "high",
                        "description": f"{count} package updates available",
                        "distro": distro,
                    })
                else:
                    findings.append({
                        "module": "patch",
                        "check": "linux_updates_current",
                        "severity": "info",
                        "description": "System packages appear up to date",
                    })
                break
            except ValueError:
                continue

        return findings or [{
            "module": "patch",
            "check": "patch_check_failed",
            "severity": "medium",
            "description": "Could not determine update status — check manually",
        }]
