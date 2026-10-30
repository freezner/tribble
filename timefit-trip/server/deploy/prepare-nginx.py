#!/usr/bin/env python3
"""Prepare one reviewed location insertion; never overwrite an existing file."""
import argparse
import hashlib
from pathlib import Path
import re
import sys


def prepare(source: bytes, snippet: str, expected_sha256: str) -> bytes:
    if not re.fullmatch(r"[0-9a-f]{64}", expected_sha256):
        raise ValueError("Expected SHA-256 must contain 64 lowercase hex characters")
    if hashlib.sha256(source).hexdigest() != expected_sha256:
        raise ValueError("Nginx source hash changed; review the current configuration first")
    text = source.decode("utf-8")
    anchor = "    # The new image serves static files; health routes reach Django and its DB.\n"
    canonical = "    server_name pastelinkers.com;\n"
    if text.count(anchor) != 1 or text.count(canonical) != 1 or "/tribble/" in text:
        raise ValueError("Expected canonical HTTPS block is missing, ambiguous or already configured")
    position = text.index(anchor)
    server_start = text.rfind("\nserver {\n", 0, position)
    if server_start == -1 or not server_start < text.index(canonical) < position:
        raise ValueError("Insertion point is outside the canonical pastelinkers.com server")
    prefix = text[server_start:position]
    if "    listen 443 ssl;\n" not in prefix or "\n}\n" in prefix:
        raise ValueError("Insertion point is not in the expected HTTPS server")
    if snippet.count("location ^~ /tribble/") != 1:
        raise ValueError("Unexpected Tribble location snippet")
    return (text[:position] + snippet.rstrip() + "\n\n" + text[position:]).encode("utf-8")


def main() -> None:
    directory = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--expected-sha256", default=(directory / "expected-nginx.sha256").read_text().strip())
    args = parser.parse_args()
    try:
        prepared = prepare(args.source.read_bytes(), (directory / "nginx-tribble-location.conf").read_text(), args.expected_sha256)
        # Exclusive creation also rejects symlinks and accidental in-place changes.
        with args.output.open("xb") as output:
            output.write(prepared)
    except (OSError, UnicodeError, ValueError) as error:
        print(f"Preparation refused: {error}", file=sys.stderr)
        raise SystemExit(1)
    print(f"Prepared configuration: {args.output}")


if __name__ == "__main__":
    main()
