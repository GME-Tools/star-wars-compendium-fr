#!/usr/bin/env python3
"""Index OggDude XML without copying copyrighted descriptions into output.
Usage: python tools/oggdude_index.py --data /path/to/DataCustom --commit PINNED_SHA --out .swffg-work/shared/oggdude/index.json
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

SKIP_TEXT = {"Description", "LongDescription", "Narrative", "History", "Story", "Text", "FlavorText"}
ATTR_NAMES = {"Key", "Name", "Source", "Sources", "ActivationValue", "ForceTalent",
              "Ranked", "Category", "Type", "Silhouette", "SkillKey", "ClassKey"}
SCALAR_LIMIT = 120

def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]

def parse_sources(node: ET.Element) -> list[dict]:
    found = []
    for el in node.iter():
        if local(el.tag) == "Source" and (el.text or "").strip():
            found.append({"name": el.text.strip(), "page": el.attrib.get("Page")})
    return found

def candidates(root: ET.Element) -> list[ET.Element]:
    # Files can contain one entity (Career.xml) or collections (Talents.xml).
    children = list(root)
    if not children: return [root]
    singulars = {"Career", "Specialization", "Talent", "Species", "ForcePower",
                 "Weapon", "Armor", "Gear", "Vehicle", "ItemAttachment",
                 "SignatureAbility", "Motivation", "Obligation"}
    if local(root.tag) in singulars: return [root]
    if any(local(x.tag) == "Key" for x in children): return [root]
    return children

def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--data", type=Path, required=True)
    a.add_argument("--commit", required=True, help="Pinned Git commit of the external dataset")
    a.add_argument("--out", type=Path, required=True)
    ns = a.parse_args()
    if not ns.data.is_dir(): a.error("DataCustom directory not found")
    if not re.fullmatch(r"[0-9a-fA-F]{40}", ns.commit): a.error("Require full 40-character commit SHA")
    if ".swffg-work" not in ns.out.resolve().parts: a.error("Output must be inside .swffg-work")
    docs, errors = [], []
    for file in sorted(ns.data.rglob("*.xml")):
        try: root = ET.parse(file).getroot()
        except ET.ParseError as exc:
            errors.append({"file": str(file.relative_to(ns.data)), "error": str(exc)})
            continue
        for el in candidates(root):
            direct = {local(c.tag): (c.text or "").strip() for c in list(el)
                      if len(list(c)) == 0 and local(c.tag) in ATTR_NAMES
                      and local(c.tag) not in SKIP_TEXT
                      and len((c.text or "").strip()) <= SCALAR_LIMIT}
            # Do not emit full text or images: output is a candidate-index only.
            if not (direct.get("Key") or direct.get("Name")): continue
            docs.append({"dataset_commit": ns.commit, "file": str(file.relative_to(ns.data)),
                         "kind": local(el.tag), "key": direct.get("Key"),
                         "name_en": direct.get("Name"), "sources": parse_sources(el),
                         "scalar_hints": {k: v for k, v in direct.items() if k not in ("Key", "Name")}})
    keys = {}
    dupes = []
    for obj in docs:
        key = (obj["kind"], obj["key"])
        if obj["key"] and key in keys: dupes.append({"kind": key[0], "key": key[1], "paths": [keys[key], obj["file"]]})
        if obj["key"]: keys[key] = obj["file"]
    result = {"dataset_commit": ns.commit, "dataset_root": str(ns.data.resolve()),
              "records": docs, "duplicate_keys": dupes, "parse_errors": errors,
              "notice": "Candidate index only; source/pagination may refer to English editions. Not a complete rules transcription."}
    ns.out.parent.mkdir(parents=True, exist_ok=True)
    ns.out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"records": len(docs), "duplicate_keys": len(dupes),
                      "parse_errors": len(errors), "out": str(ns.out)}, ensure_ascii=False))
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
