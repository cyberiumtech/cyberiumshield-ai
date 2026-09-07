"""Safe parsing and normalization for submitted RFC 5322 email text."""

from __future__ import annotations

import html
import re
from email import policy
from email.parser import Parser

TAG_PATTERN = re.compile(r"<[^>]+>")
SPACE_PATTERN = re.compile(r"\s+")


def _body_from_message(message) -> str:
    if message.is_multipart():
        parts = []
        for part in message.walk():
            if part.get_content_disposition() == "attachment":
                continue
            if part.get_content_type() in {"text/plain", "text/html"}:
                try:
                    parts.append(part.get_content())
                except (LookupError, UnicodeDecodeError):
                    continue
        return "\n".join(parts)
    try:
        return message.get_content()
    except (LookupError, UnicodeDecodeError):
        return str(message.get_payload())


def parse_email(sender: str, subject: str, content: str) -> dict:
    message = Parser(policy=policy.default).parsestr(content)
    parsed_sender = sender.strip() or str(message.get("from", "")).strip() or "Unknown sender"
    parsed_subject = subject.strip() or str(message.get("subject", "")).strip() or "(No subject)"
    body = _body_from_message(message)
    if not list(message.keys()):
        body = content

    plain_body = SPACE_PATTERN.sub(" ", html.unescape(TAG_PATTERN.sub(" ", body))).strip()
    model_text = f"Subject: {parsed_subject}\nFrom: {parsed_sender}\n\n{plain_body}"
    return {
        "sender": parsed_sender[:320],
        "subject": parsed_subject[:500],
        "body": plain_body,
        "model_text": model_text[:100_000],
        "headers": {key.lower(): str(value) for key, value in message.items()},
    }
