"""
Core orchestrator — coordinates scanning, analysis, planning, and execution.
"""
import asyncio
import logging
import sqlite3
import json
from datetime import datetime
from pathlib import Path

import yaml

from modules.recon import ReconModule
from modules.auth import AuthModule
from modules.services import ServicesModule
from modules.patch import PatchModule
from modules.firewall import FirewallModule
from modules.encryption import EncryptionModule
from core.planner import Planner
from core.executor import Executor
from ai.reasoning import ReasoningEngine

logger = logging.getLogger(__name__)


class SecurityAgent:
    def __init__(self, config_path: str = "config.yaml"):
        with open(config_path) as f:
            self.config = yaml.safe_load(f)

        self._init_db()
        self._init_modules()

        self.planner = Planner(self.config)
        self.executor = Executor(self.config)
        self.ai = ReasoningEngine(self.config)

    def _init_db(self):
        db_path = Path(self.config["data"]["db_path"])
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(db_path))
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                module TEXT,
                findings TEXT,
                severity TEXT
            )
        """)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS remediations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                issue TEXT,
                action TEXT,
                result TEXT,
                mode TEXT
            )
        """)
        self.db.commit()

    def _init_modules(self):
        cfg = self.config.get("scan", {})
        self.modules = {}
        if cfg.get("ports", True) or cfg.get("services", True):
            self.modules["recon"] = ReconModule()
        if cfg.get("auth", True):
            self.modules["auth"] = AuthModule()
        if cfg.get("services", True):
            self.modules["services"] = ServicesModule()
        if cfg.get("patches", True):
            self.modules["patch"] = PatchModule()
        if cfg.get("firewall", True):
            self.modules["firewall"] = FirewallModule()
        if cfg.get("encryption", True):
            self.modules["encryption"] = EncryptionModule()

    async def run_scan(self) -> dict:
        """Run all enabled scan modules and return aggregated findings."""
        all_findings = {}
        tasks = {name: asyncio.create_task(mod.scan()) for name, mod in self.modules.items()}

        for name, task in tasks.items():
            try:
                findings = await task
                all_findings[name] = findings
                self._store_findings(name, findings)
                logger.info(f"Module [{name}] completed: {len(findings)} findings")
            except Exception as e:
                logger.error(f"Module [{name}] failed: {e}")
                all_findings[name] = []

        return all_findings

    def _store_findings(self, module: str, findings: list):
        for f in findings:
            self.db.execute(
                "INSERT INTO scans (timestamp, module, findings, severity) VALUES (?,?,?,?)",
                (datetime.now().isoformat(), module, json.dumps(f), f.get("severity", "info"))
            )
        self.db.commit()

    async def analyze(self, findings: dict) -> list:
        """Send findings to AI for analysis and risk explanation."""
        return await self.ai.analyze(findings)

    def build_plan(self, analyzed_issues: list) -> list:
        """Turn analyzed issues into a prioritized remediation plan."""
        return self.planner.build(analyzed_issues)

    async def execute_plan(self, plan: list, auto: bool = False) -> list:
        """Execute remediation plan, optionally auto-running without prompts."""
        results = []
        mode = self.config["agent"]["mode"]
        confirm = self.config["remediation"]["confirm_before_execute"] and not auto

        for step in plan:
            result = await self.executor.run(step, confirm=confirm, mode=mode)
            results.append(result)
            self.db.execute(
                "INSERT INTO remediations (timestamp, issue, action, result, mode) VALUES (?,?,?,?,?)",
                (datetime.now().isoformat(), step["issue"], step["action"],
                 json.dumps(result), mode)
            )
            self.db.commit()

        return results

    async def full_cycle(self, auto: bool = False) -> dict:
        """Complete scan → analyze → plan → execute cycle."""
        logger.info("Starting full security audit cycle")

        findings = await self.run_scan()
        issues = await self.analyze(findings)
        plan = self.build_plan(issues)
        results = await self.execute_plan(plan, auto=auto)

        return {
            "findings": findings,
            "issues": issues,
            "plan": plan,
            "results": results,
            "timestamp": datetime.now().isoformat(),
        }

    def get_history(self, limit: int = 20) -> list:
        rows = self.db.execute(
            "SELECT timestamp, module, findings, severity FROM scans ORDER BY id DESC LIMIT ?",
            (limit,)
        ).fetchall()
        return [{"timestamp": r[0], "module": r[1], "findings": json.loads(r[2]), "severity": r[3]} for r in rows]
