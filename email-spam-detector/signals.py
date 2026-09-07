"""Human-readable signals supplementing the statistical classifier."""

from __future__ import annotations

import re

URL_PATTERN = re.compile(r"\b(?:https?://|www\.)[^\s<>\"']+", re.I)


def _domain(value: str) -> str:
    match = re.search(r"@([a-z0-9.-]+\.[a-z]{2,})", value, re.I)
    return match.group(1).lower() if match else ""


def explain_email(parsed: dict) -> tuple[list[dict], int]:
    text = f"{parsed['subject']}\n{parsed['body']}"
    headers = parsed["headers"]
    links = URL_PATTERN.findall(text)
    urgent = len(re.findall(r"\b(urgent|act now|immediately|final warning|last chance|verify now|account (?:locked|suspended))\b", text, re.I))
    rewards = len(re.findall(r"\b(winner|won|prize|lottery|free gift|cash bonus|million dollars?)\b", text, re.I))
    credentials = bool(re.search(r"\b(password|login credentials?|bank details?|credit card|wallet seed|verification code)\b", text, re.I))
    suspicious_links = sum(bool(re.search(r"(?:bit\.ly|tinyurl\.com|t\.co|https?://\d{1,3}(?:\.\d{1,3}){3}|xn--|%[0-9a-f]{2})", link, re.I)) for link in links)
    authentication = headers.get("authentication-results", "")
    auth_failure = bool(re.search(r"\b(?:spf|dkim|dmarc)\s*=\s*(?:fail|softfail|temperror|permerror)\b", authentication, re.I))
    sender_domain = _domain(parsed["sender"])
    reply_domain = _domain(headers.get("reply-to", ""))
    mismatch = bool(sender_domain and reply_domain and sender_domain != reply_domain)
    risky_attachment = bool(re.search(r"(?:filename|name)\s*=\s*[\"']?[^\s\"']+\.(?:exe|scr|js|vbs|bat|cmd|ps1|iso|img|zip)", text, re.I))

    signals = [
        {"id": "urgent", "label": "Pressure or urgency", "detail": f"{urgent} high-pressure phrase(s) found" if urgent else "No high-pressure language found", "detected": urgent > 0},
        {"id": "reward", "label": "Prize or money bait", "detail": f"{rewards} reward claim(s) found" if rewards else "No reward bait found", "detected": rewards > 0},
        {"id": "credentials", "label": "Sensitive data request", "detail": "Requests credentials or financial information" if credentials else "No sensitive-data request found", "detected": credentials},
        {"id": "links", "label": "Suspicious links", "detail": f"{suspicious_links} shortened, encoded, or IP-based link(s)" if suspicious_links else f"{len(links)} link(s) found; none structurally suspicious", "detected": suspicious_links > 0},
        {"id": "reply-to", "label": "Sender mismatch", "detail": f"Reply-To uses {reply_domain}, not {sender_domain}" if mismatch else "Sender and Reply-To domains are consistent", "detected": mismatch},
        {"id": "authentication", "label": "Authentication failure", "detail": "SPF, DKIM, or DMARC reports a failure" if auth_failure else "No authentication failure was supplied", "detected": auth_failure},
        {"id": "attachment", "label": "Risky attachment", "detail": "Potentially executable attachment referenced" if risky_attachment else "No risky attachment filename found", "detected": risky_attachment},
    ]
    return signals, len(links)
