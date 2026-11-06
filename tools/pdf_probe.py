#!/usr/bin/env python3
"""Native-text PDF preflight. Writes source-derived material only into a private directory.

Requires: python -m pip install pymupdf
Usage: python tools/pdf_probe.py --pdf /private/BOOK.pdf --out .swffg-work/books/BOOK/ingest --extract
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def main() -> int:
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--pdf", type=Path, required=True)
    cli.add_argument("--out", type=Path, required=True)
    cli.add_argument("--extract", action="store_true", help="Save native text blocks in private page JSON files")
    ns = cli.parse_args()
    if not ns.pdf.is_file():
        cli.error("PDF not found")
    if ".swffg-work" not in ns.out.resolve().parts:
        cli.error("Output must be inside .swffg-work (private; never Git public)")
    try:
        import fitz  # PyMuPDF: text and geometric blocks, no OCR implied
    except ImportError:
        print("Install PyMuPDF first: python -m pip install pymupdf", file=sys.stderr)
        return 2
    ns.out.mkdir(parents=True, exist_ok=True)
    result = {"source_pdf": str(ns.pdf.resolve()), "sha256": sha256(ns.pdf),
              "pages": [], "toc": [], "warnings": [],
              "notice": "Native extraction only; render and visually inspect complex or uncertain pages."}
    with fitz.open(str(ns.pdf)) as doc:
        result["page_count"] = len(doc)
        result["toc"] = doc.get_toc()
        for idx in range(len(doc)):
            page = doc[idx]
            blocks = page.get_text("blocks", sort=False)
            rows = []
            for seq, raw in enumerate(blocks, 1):
                kind = "text" if raw[6] == 0 else "image"
                rows.append({"id": "P%04d-B%03d" % (idx+1, seq),
                             "bbox": [round(float(v), 2) for v in raw[:4]],
                             "kind": kind,
                             "text": raw[4] if kind == "text" else "",
                             "order_observed": seq})
            chars = sum(len(b["text"]) for b in rows)
            text_blocks = sum(b["kind"] == "text" for b in rows)
            image_blocks = sum(b["kind"] == "image" for b in rows)
            needs_inspection = (chars < 60) or (image_blocks > 0 and chars < 200)
            result["pages"].append({"pdf_page": idx+1,
                                    "printed_page": None,
                                    "native_characters": chars,
                                    "native_text_blocks": text_blocks,
                                    "image_blocks": image_blocks,
                                    "inspect_visually": needs_inspection,
                                    "ocr_candidate": chars < 60 and image_blocks > 0})
            if ns.extract:
                p = ns.out / "pages" / ("%04d.json" % (idx+1))
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(json.dumps({"pdf_page": idx+1, "blocks": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    dest = ns.out / "inventory.json"
    dest.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print("PDF pages:", result["page_count"])
    print("Suspect pages for visual inspection:", sum(p["inspect_visually"] for p in result["pages"]))
    print("Image-only OCR candidates:", sum(p["ocr_candidate"] for p in result["pages"]))
    print("Private inventory:", dest)
    return 0

if __name__ == "__main__":
    sys.exit(main())
