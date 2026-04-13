"""
Planner — converts analyzed issues into a prioritized, ordered remediation plan.
"""
import logging

logger = logging.getLogger(__name__)

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}


class Planner:
    def __init__(self, config: dict):
        self.config = config

    def build(self, issues: list) -> list:
        """
        Take a list of analyzed issues and return a sorted, deduplicated
        remediation plan with concrete actions attached.
        """
        seen = set()
        plan = []

        sorted_issues = sorted(
            issues,
            key=lambda x: SEVERITY_ORDER.get(x.get("severity", "info"), 99)
        )

        for issue in sorted_issues:
            key = (issue.get("module"), issue.get("check"))
            if key in seen:
                continue
            seen.add(key)

            steps = self._map_to_actions(issue)
            for step in steps:
                plan.append({
                    "issue": issue.get("description", "Unknown issue"),
                    "severity": issue.get("severity", "info"),
                    "module": issue.get("module", "unknown"),
                    "action": step["action"],
                    "command": step.get("command"),
                    "reversible": step.get("reversible", True),
                    "requires_sudo": step.get("requires_sudo", False),
                    "explanation": issue.get("explanation", ""),
                })

        logger.info(f"Plan built: {len(plan)} steps across {len(issues)} issues")
        return plan

    def _map_to_actions(self, issue: dict) -> list:
        """Map a finding to one or more concrete shell actions."""
        check = issue.get("check", "")
        platform = issue.get("platform", "linux")

        action_map = {
            "telnet_open": [
                {"action": "Disable telnet service",
                 "command": "sudo systemctl stop telnet && sudo systemctl disable telnet",
                 "reversible": True, "requires_sudo": True}
            ],
            "ftp_open": [
                {"action": "Disable FTP service",
                 "command": "sudo systemctl stop vsftpd && sudo systemctl disable vsftpd",
                 "reversible": True, "requires_sudo": True}
            ],
            "ssh_root_login": [
                {"action": "Disable SSH root login",
                 "command": "sudo sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && sudo systemctl reload sshd",
                 "reversible": True, "requires_sudo": True}
            ],
            "ssh_password_auth": [
                {"action": "Disable SSH password authentication (key-only)",
                 "command": "sudo sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && sudo systemctl reload sshd",
                 "reversible": True, "requires_sudo": True}
            ],
            "ufw_disabled": [
                {"action": "Enable UFW firewall with default deny",
                 "command": "sudo ufw default deny incoming && sudo ufw default allow outgoing && sudo ufw --force enable",
                 "reversible": True, "requires_sudo": True}
            ],
            "pf_disabled": [
                {"action": "Enable macOS pf firewall",
                 "command": "sudo pfctl -e",
                 "reversible": True, "requires_sudo": True}
            ],
        }

        return action_map.get(check, [
            {"action": f"Manual review required: {issue.get('description', check)}",
             "command": None, "reversible": True, "requires_sudo": False}
        ])
