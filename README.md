# AI Security Hardening Agent

A local AI-powered network and system hardening agent. It audits your machine, explains risks in plain English using Claude, and optionally executes remediations.

```
scan → AI analysis → remediation plan → execute (optional) → verify
```

## Features

- **Modular scanning** — recon, auth, services, patches, firewall, encryption
- **AI-powered analysis** — Claude explains each risk and recommends fixes
- **Two modes** — `safe` (recommendations only) or `aggressive` (auto-fix)
- **Continuous monitoring** — alert on new issues at a configurable interval
- **Full audit trail** — SQLite DB + JSON reports
- **macOS + Linux** — aware of platform differences (pf vs ufw, FileVault vs LUKS, etc.)

## Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Or switch to local Ollama in config.yaml:
# ai:
#   provider: ollama
#   ollama_model: llama3
```

## Usage

```bash
# Full scan + AI analysis
python cli.py scan

# Scan a specific module only
python cli.py scan --module recon
python cli.py scan --module auth
python cli.py scan --module firewall

# Scan without AI (raw findings only)
python cli.py scan --no-ai

# Generate remediation plan and confirm each step
python cli.py fix

# Auto-execute all remediations (aggressive mode)
python cli.py fix --auto

# Fix from a saved report
python cli.py fix --report data/reports/report_20260413_120000.json

# Continuous monitoring (default: every 30 minutes)
python cli.py monitor
python cli.py monitor --interval 10

# View scan history
python cli.py history
python cli.py history --limit 50
```

## Configuration

Edit `config.yaml` to control behavior:

```yaml
agent:
  mode: "safe"        # safe = recommendations only, aggressive = auto-fix

ai:
  provider: "anthropic"   # or "ollama"
  model: "claude-sonnet-4-6"

scan:
  ports: true
  services: true
  auth: true
  firewall: true
  patches: true
  encryption: true

monitor:
  enabled: false
  interval_minutes: 30

remediation:
  confirm_before_execute: true
  backup_configs: true
```

## Modules

| Module | What it checks |
|--------|---------------|
| `recon` | Open ports, risky services exposed on the network |
| `auth` | SSH root login, password auth, empty passwords, weak protocols |
| `services` | Telnet, FTP, rsh, rlogin and other insecure daemons |
| `patch` | OS updates (softwareupdate / apt / yum), Homebrew outdated packages |
| `firewall` | UFW / iptables (Linux), macOS Application Firewall + pf |
| `encryption` | FileVault / LUKS disk encryption, weak SSH host key types |

## Architecture

```
security-agent/
├── core/
│   ├── agent.py       # Orchestrator — coordinates all modules
│   ├── planner.py     # Converts findings into a remediation plan
│   └── executor.py    # Runs shell commands safely with backup
├── modules/
│   ├── recon.py
│   ├── auth.py
│   ├── services.py
│   ├── patch.py
│   ├── firewall.py
│   └── encryption.py
├── ai/
│   └── reasoning.py   # Claude / Ollama integration
├── data/
│   ├── security_agent.db   # SQLite audit trail
│   ├── reports/            # JSON scan reports
│   └── backups/            # Config backups before changes
├── cli.py
└── config.yaml
```

## Safety

- **Safe mode by default** — no changes are made without switching to `aggressive`
- **Config backups** — `/etc/ssh/sshd_config` and other files are backed up before modification
- **Per-step confirmation** — `fix` prompts before each command unless `--auto` is passed
- **No data leaves your machine** — only the scan findings summary is sent to the AI API

## Extending

Add a new module by creating `modules/yourmodule.py` with an async `scan()` method that returns a list of finding dicts:

```python
class YourModule:
    async def scan(self) -> list:
        return [{
            "module": "yourmodule",
            "check": "some_check_key",
            "severity": "high",   # critical | high | medium | low | info
            "description": "What was found",
        }]
```

Then register it in `core/agent.py` `_init_modules()`.
