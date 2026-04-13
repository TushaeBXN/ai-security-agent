"""
AI Reasoning Engine — uses Claude (or Ollama) to interpret scan results
and produce human-readable risk explanations + prioritized issue list.
"""
import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert network security analyst and system hardening specialist.
Your job is to analyze raw security scan findings from a local machine and:
1. Identify real risks (ignore false positives when context makes it clear)
2. Explain each risk in plain language a developer can understand
3. Assign severity: critical / high / medium / low / info
4. Return a structured JSON list of issues

Always respond with ONLY valid JSON — a list of objects with these keys:
  module, check, description, severity, explanation, recommendation

Be concise but specific. Don't pad the output."""


class ReasoningEngine:
    def __init__(self, config: dict):
        self.config = config
        self.provider = config.get("ai", {}).get("provider", "anthropic")
        self.model = config.get("ai", {}).get("model", "claude-sonnet-4-6")
        self.ollama_model = config.get("ai", {}).get("ollama_model", "llama3")
        self.ollama_url = config.get("ai", {}).get("ollama_base_url", "http://localhost:11434")

    async def analyze(self, findings: dict) -> list:
        """Send findings to AI and return parsed issue list."""
        prompt = self._build_prompt(findings)
        raw = await self._call_ai(prompt)
        return self._parse_response(raw)

    def _build_prompt(self, findings: dict) -> str:
        summary = json.dumps(findings, indent=2)
        return f"""Below are raw security scan findings from a local machine.
Analyze them and return the JSON issue list as described.

FINDINGS:
{summary}
"""

    async def _call_ai(self, prompt: str) -> str:
        if self.provider == "anthropic":
            return await self._call_anthropic(prompt)
        elif self.provider == "ollama":
            return await self._call_ollama(prompt)
        else:
            raise ValueError(f"Unknown AI provider: {self.provider}")

    async def _call_anthropic(self, prompt: str) -> str:
        import anthropic

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError("ANTHROPIC_API_KEY not set")

        client = anthropic.AsyncAnthropic(api_key=api_key)
        message = await client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    async def _call_ollama(self, prompt: str) -> str:
        payload = {
            "model": self.ollama_model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{self.ollama_url}/api/chat", json=payload)
            resp.raise_for_status()
            return resp.json()["message"]["content"]

    def _parse_response(self, raw: str) -> list:
        """Extract JSON list from AI response, tolerating markdown fences."""
        text = raw.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])

        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, dict) and "issues" in parsed:
                return parsed["issues"]
            return [parsed]
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}\nRaw:\n{raw[:500]}")
            return []
