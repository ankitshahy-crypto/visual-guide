#!/usr/bin/env python3
"""Validate golden guide JSON against schema.py and keep the two copies identical."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from schema import Guide  # noqa: E402

COPIES = [
    ROOT / "golden" / "newtral-magich-pro.json",
    ROOT / "src" / "data" / "golden" / "newtral-magich-pro.json",
]


def main() -> None:
    bodies: list[bytes] = []
    for path in COPIES:
        data = json.loads(path.read_text())
        guide = Guide.model_validate(data)
        rel = path.relative_to(ROOT)
        print(f"OK: {rel} — {guide.title} — {len(guide.steps)} steps, {len(guide.parts)} parts")
        bodies.append(path.read_bytes())
    if bodies[0] != bodies[1]:
        sys.exit("golden JSON copies differ (golden/ vs src/data/golden/)")


if __name__ == "__main__":
    main()
