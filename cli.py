#!/usr/bin/env python3
"""
AI Security Hardening Agent — CLI entry point.
"""
import asyncio
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich import box
from rich.progress import Progress, SpinnerColumn, TextColumn
import yaml

console = Console()

SEVERITY_COLORS = {
    "critical": "bold red",
    "high": "red",
    "medium": "yellow",
    "low": "cyan",
    "info": "dim",
}

SEVERITY_ICONS = {
    "critical": "[!]",
    "high": "[!]",
    "medium": "[~]",
    "low": "[i]",
    "info": "[ ]",
}


def get_agent(config: str):
    from core.agent import SecurityAgent
    return SecurityAgent(config_path=config)


def print_banner():
    console.print(Panel(
        "[bold cyan]AI Security Hardening Agent[/bold cyan]\n"
        "[dim]Local network & system hardening — powered by Claude[/dim]",
        box=box.DOUBLE_EDGE,
        style="cyan",
    ))


def print_findings_table(findings: dict):
    table = Table(title="Scan Findings", box=box.ROUNDED, show_lines=True)
    table.add_column("Module", style="bold", width=12)
    table.add_column("Severity", width=10)
    table.add_column("Description", width=55)

    for module, items in findings.items():
        for item in items:
            sev = item.get("severity", "info")
            color = SEVERITY_COLORS.get(sev, "white")
            icon = SEVERITY_ICONS.get(sev, " ")
            table.add_row(
                module,
                f"[{color}]{icon} {sev.upper()}[/{color}]",
                item.get("description", "-"),
            )

    console.print(table)


def print_issues(issues: list):
    if not issues:
        console.print("[green]No issues identified by AI analysis.[/green]")
        return

    console.print(f"\n[bold]AI Analysis — {len(issues)} issue(s) found[/bold]\n")
    for i, issue in enumerate(issues, 1):
        sev = issue.get("severity", "info")
        color = SEVERITY_COLORS.get(sev, "white")
        icon = SEVERITY_ICONS.get(sev, " ")

        console.print(
            Panel(
                f"[bold]{issue.get('description', 'Unknown')}[/bold]\n\n"
                f"[italic]{issue.get('explanation', '')}[/italic]\n\n"
                f"[dim]Recommendation: {issue.get('recommendation', 'See description')}[/dim]",
                title=f"[{color}]{icon} {sev.upper()} — {issue.get('module','').upper()}[/{color}]",
                border_style=color,
            )
        )


def print_plan(plan: list):
    if not plan:
        console.print("[green]Nothing to remediate.[/green]")
        return

    table = Table(title="Remediation Plan", box=box.ROUNDED, show_lines=True)
    table.add_column("#", width=4)
    table.add_column("Severity", width=10)
    table.add_column("Action", width=40)
    table.add_column("Command", width=40, style="dim")

    for i, step in enumerate(plan, 1):
        sev = step.get("severity", "info")
        color = SEVERITY_COLORS.get(sev, "white")
        table.add_row(
            str(i),
            f"[{color}]{sev.upper()}[/{color}]",
            step["action"],
            step.get("command") or "[manual]",
        )

    console.print(table)


@click.group()
@click.option("--config", default="config.yaml", show_default=True, help="Config file path")
@click.option("--verbose", "-v", is_flag=True, help="Verbose logging")
@click.pass_context
def cli(ctx, config, verbose):
    """AI Security Hardening Agent — audit, analyze, and harden your system."""
    ctx.ensure_object(dict)
    ctx.obj["config"] = config
    level = logging.DEBUG if verbose else logging.WARNING
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    print_banner()


@cli.command()
@click.option("--module", "-m", default="all",
              type=click.Choice(["all", "recon", "auth", "services", "patch", "firewall", "encryption"]),
              help="Module to run")
@click.option("--ai/--no-ai", default=True, help="Enable AI analysis")
@click.pass_context
def scan(ctx, module, ai):
    """Scan the system for security issues."""
    agent = get_agent(ctx.obj["config"])

    if module != "all":
        # Restrict to requested module
        agent.modules = {k: v for k, v in agent.modules.items() if k == module}

    async def _run():
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as p:
            task = p.add_task("Scanning system...", total=None)
            findings = await agent.run_scan()
            p.update(task, description="Scan complete")

        print_findings_table(findings)

        if ai:
            with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as p:
                task = p.add_task("Analyzing with AI...", total=None)
                try:
                    issues = await agent.analyze(findings)
                    p.update(task, description="Analysis complete")
                    print_issues(issues)

                    plan = agent.build_plan(issues)
                    if plan:
                        console.print()
                        print_plan(plan)
                        _save_report(findings, issues, plan, ctx.obj["config"])
                except Exception as e:
                    p.stop()
                    console.print(f"[yellow]AI analysis skipped: {e}[/yellow]")
                    console.print("[dim]Set ANTHROPIC_API_KEY or switch to ollama in config.yaml[/dim]")

    asyncio.run(_run())


@cli.command()
@click.option("--auto", is_flag=True, help="Execute without confirmation prompts (aggressive mode)")
@click.option("--report", "-r", default=None, help="Path to a previous scan report JSON to use")
@click.pass_context
def fix(ctx, auto, report):
    """Generate and optionally execute a remediation plan."""
    agent = get_agent(ctx.obj["config"])

    async def _run():
        if report:
            with open(report) as f:
                data = json.load(f)
            issues = data.get("issues", [])
            plan = agent.build_plan(issues)
        else:
            with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as p:
                task = p.add_task("Running full cycle...", total=None)
                findings = await agent.run_scan()
                try:
                    issues = await agent.analyze(findings)
                except Exception as e:
                    console.print(f"[red]AI analysis failed: {e}[/red]")
                    return
                plan = agent.build_plan(issues)
                p.update(task, description="Ready")

        print_plan(plan)

        if not plan:
            return

        mode = agent.config["agent"]["mode"]
        if auto:
            mode = "aggressive"
            agent.config["agent"]["mode"] = "aggressive"
            agent.config["remediation"]["confirm_before_execute"] = False

        if mode == "safe":
            console.print("\n[yellow]Running in SAFE mode — no changes will be made.[/yellow]")
            console.print("[dim]Use --auto to execute, or change mode to 'aggressive' in config.yaml[/dim]")
            return

        for step in plan:
            if step.get("command") is None:
                console.print(f"[dim]  Manual: {step['action']}[/dim]")
                continue

            if not auto:
                answer = click.confirm(f"\n  Execute: {step['action']}?", default=False)
                if not answer:
                    console.print("[dim]  Skipped.[/dim]")
                    continue

            console.print(f"  [cyan]Running:[/cyan] {step['command']}")
            result = await agent.executor.run(step, confirm=False, mode="aggressive")
            if result["executed"]:
                console.print(f"  [green]Done.[/green] {result.get('output', '')[:100]}")
            elif result.get("error"):
                console.print(f"  [red]Error:[/red] {result['error']}")

    asyncio.run(_run())


@cli.command()
@click.option("--interval", "-i", default=30, show_default=True, help="Scan interval in minutes")
@click.pass_context
def monitor(ctx, interval):
    """Continuously monitor the system and alert on changes."""
    import time
    agent = get_agent(ctx.obj["config"])
    console.print(f"[bold cyan]Monitoring mode — scanning every {interval} minutes[/bold cyan]")
    console.print("[dim]Press Ctrl+C to stop[/dim]\n")

    previous_issues = set()

    async def _scan_once():
        findings = await agent.run_scan()
        try:
            issues = await agent.analyze(findings)
        except Exception:
            issues = []
        return findings, issues

    try:
        while True:
            console.print(f"[dim]{datetime.now().strftime('%H:%M:%S')}[/dim] Scanning...")
            findings, issues = asyncio.run(_scan_once())

            current_keys = {(i.get("module"), i.get("check")) for i in issues}
            new_issues = current_keys - previous_issues

            if new_issues:
                console.print(f"[red bold]  {len(new_issues)} NEW issue(s) detected![/red bold]")
                for issue in issues:
                    key = (issue.get("module"), issue.get("check"))
                    if key in new_issues:
                        sev = issue.get("severity", "info")
                        color = SEVERITY_COLORS.get(sev, "white")
                        console.print(f"  [{color}]{issue.get('description')}[/{color}]")
            else:
                console.print("[green]  No new issues.[/green]")

            previous_issues = current_keys
            console.print(f"[dim]  Next scan in {interval} minutes...[/dim]")
            time.sleep(interval * 60)

    except KeyboardInterrupt:
        console.print("\n[yellow]Monitor stopped.[/yellow]")


@cli.command()
@click.option("--limit", "-n", default=20, show_default=True, help="Number of records to show")
@click.pass_context
def history(ctx, limit):
    """Show scan history from the local database."""
    agent = get_agent(ctx.obj["config"])
    rows = agent.get_history(limit)

    if not rows:
        console.print("[dim]No scan history yet.[/dim]")
        return

    table = Table(title="Scan History", box=box.ROUNDED)
    table.add_column("Time", width=20)
    table.add_column("Module", width=12)
    table.add_column("Severity", width=10)
    table.add_column("Finding", width=50)

    for row in rows:
        f = row["findings"]
        sev = row["severity"]
        color = SEVERITY_COLORS.get(sev, "white")
        table.add_row(
            row["timestamp"][:19],
            row["module"],
            f"[{color}]{sev}[/{color}]",
            f.get("description", str(f))[:50],
        )

    console.print(table)


def _save_report(findings, issues, plan, config_path):
    with open(config_path) as f:
        cfg = yaml.safe_load(f)
    reports_dir = Path(cfg["data"]["reports_dir"])
    reports_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = reports_dir / f"report_{ts}.json"
    with open(path, "w") as f:
        json.dump({"timestamp": ts, "findings": findings, "issues": issues, "plan": plan}, f, indent=2)
    console.print(f"\n[dim]Report saved: {path}[/dim]")


if __name__ == "__main__":
    cli(obj={})
