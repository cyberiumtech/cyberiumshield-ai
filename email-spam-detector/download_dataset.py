"""Download and normalize the public Apache SpamAssassin email corpus."""

from __future__ import annotations

import bz2
import csv
import hashlib
import io
import json
import tarfile
import urllib.request
from email import policy
from email.parser import BytesParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
OUTPUT_FILE = DATA_DIR / "emails.csv"
METADATA_FILE = DATA_DIR / "source_metadata.json"

SOURCES = [
    ("easy_ham", 0, "https://spamassassin.apache.org/old/publiccorpus/20030228_easy_ham.tar.bz2"),
    ("easy_ham_2", 0, "https://spamassassin.apache.org/old/publiccorpus/20030228_easy_ham_2.tar.bz2"),
    ("hard_ham", 0, "https://spamassassin.apache.org/old/publiccorpus/20030228_hard_ham.tar.bz2"),
    ("spam", 1, "https://spamassassin.apache.org/old/publiccorpus/20030228_spam.tar.bz2"),
    ("spam_2", 1, "https://spamassassin.apache.org/old/publiccorpus/20050311_spam_2.tar.bz2"),
]


def message_body(message) -> str:
    if message.is_multipart():
        plain_parts = []
        html_parts = []
        for part in message.walk():
            if part.get_content_disposition() == "attachment":
                continue
            if part.get_content_type() == "text/plain":
                try:
                    plain_parts.append(part.get_content())
                except (LookupError, UnicodeDecodeError):
                    pass
            elif part.get_content_type() == "text/html":
                try:
                    html_parts.append(part.get_content())
                except (LookupError, UnicodeDecodeError):
                    pass
        return "\n".join(plain_parts or html_parts)
    try:
        return message.get_content()
    except (LookupError, UnicodeDecodeError):
        payload = message.get_payload(decode=True) or b""
        return payload.decode("utf-8", errors="replace")


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "CyberiumShield-DatasetBuilder/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    seen = set()
    source_counts = {}

    for source_name, label, url in SOURCES:
        print(f"Downloading {source_name} from {url}")
        archive_bytes = download(url)
        archive_hash = hashlib.sha256(archive_bytes).hexdigest()
        accepted = 0

        with tarfile.open(fileobj=io.BytesIO(bz2.decompress(archive_bytes)), mode="r:") as archive:
            for member in archive.getmembers():
                if not member.isfile() or member.name.endswith("cmds"):
                    continue
                extracted = archive.extractfile(member)
                if extracted is None:
                    continue
                raw = extracted.read()
                message_hash = hashlib.sha256(raw).hexdigest()
                if message_hash in seen:
                    continue
                seen.add(message_hash)
                message = BytesParser(policy=policy.default).parsebytes(raw)
                subject = str(message.get("subject", ""))
                sender = str(message.get("from", ""))
                body = message_body(message)
                text = f"Subject: {subject}\nFrom: {sender}\n\n{body}".replace("\x00", "").strip()
                if len(text) < 20:
                    continue
                rows.append({"message_id": message_hash, "source": source_name, "label": label, "text": text})
                accepted += 1

        source_counts[source_name] = {
            "url": url,
            "archive_sha256": archive_hash,
            "messages": accepted,
            "label": "spam" if label else "ham",
        }
        print(f"  accepted {accepted} messages")

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=["message_id", "source", "label", "text"])
        writer.writeheader()
        writer.writerows(rows)

    metadata = {
        "name": "Apache SpamAssassin Public Corpus",
        "homepage": "https://spamassassin.apache.org/old/publiccorpus/",
        "description": "Real public ham and spam emails normalized without modification to labels.",
        "messages": len(rows),
        "ham": sum(row["label"] == 0 for row in rows),
        "spam": sum(row["label"] == 1 for row in rows),
        "sources": source_counts,
    }
    METADATA_FILE.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} real emails to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
