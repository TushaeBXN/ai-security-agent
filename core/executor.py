"""
Executor — runs remediation steps safely with optional backup and confirmation.
"""
import asyncio
import logging
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class Executor:
    def __init__(self, config: dict):
        self.config = config
        backup_dir = config.get("remediation", {}).get("backup_dir", "data/backups")
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    async def run(self, step: dict, confirm: bool = True, mode: str = "safe") -> dict:
        """
        Execute a single remediation step.
        - safe mode: print recommendation only
        - aggressive mode: run the command (with optional confirmation)
        """
        result = {
            "step": step["action"],
            "executed": False,
            "output": "",
            "error": "",
            "skipped": False,
        }

        if mode == "safe" or step.get("command") is None:
            result["skipped"] = True
            result["output"] = "[safe mode] Would run: " + (step.get("command") or "manual action")
            return result

        if confirm:
            # In CLI usage, confirmation is handled by cli.py before calling executor.
            # This flag allows programmatic callers to skip the prompt.
            pass

        if self.config.get("remediation", {}).get("backup_configs", True):
            self._maybe_backup(step)

        try:
            proc = await asyncio.create_subprocess_shell(
                step["command"],
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
            result["executed"] = True
            result["output"] = stdout.decode().strip()
            result["error"] = stderr.decode().strip()
            result["return_code"] = proc.returncode
            if proc.returncode != 0:
                logger.warning(f"Step exited with code {proc.returncode}: {step['action']}")
            else:
                logger.info(f"Step completed OK: {step['action']}")
        except asyncio.TimeoutError:
            result["error"] = "Command timed out after 30s"
            logger.error(f"Timeout: {step['action']}")
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Execution error for '{step['action']}': {e}")

        return result

    def _maybe_backup(self, step: dict):
        """Back up common config files before modifying them."""
        config_files = ["/etc/ssh/sshd_config", "/etc/ufw/ufw.conf"]
        for cf in config_files:
            p = Path(cf)
            if p.exists():
                dest = self.backup_dir / f"{p.name}.{datetime.now().strftime('%Y%m%d_%H%M%S')}.bak"
                try:
                    shutil.copy2(cf, dest)
                    logger.info(f"Backed up {cf} → {dest}")
                except PermissionError:
                    logger.warning(f"Could not back up {cf} (no permission)")
