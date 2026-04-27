"""
Bulk-map legacy blue/indigo Tailwind tokens to DigiClinic teal/slate across src/.
Run from repo root: python scripts/restyle_digiclinic_bulk.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

# Longer / more specific patterns first
REPLACEMENTS: list[tuple[str, str]] = [
    ("from-blue-600 via-indigo-600 to-purple-600", "from-teal-600 via-teal-700 to-teal-800"),
    ("via-indigo-600 to-purple-600", "via-teal-700 to-teal-800"),
    ("bg-gradient-to-r from-blue-600 to-indigo-600", "bg-gradient-to-r from-teal-600 to-teal-700"),
    ("from-blue-600 to-indigo-600", "from-teal-600 to-teal-700"),
    ("from-blue-500 to-indigo-600", "from-teal-500 to-teal-700"),
    ("from-blue-500 to-blue-600", "from-teal-500 to-teal-600"),
    ("from-blue-400 to-indigo-500", "from-teal-500 to-teal-600"),
    ("hover:from-blue-700 hover:to-indigo-700", "hover:from-teal-700 hover:to-teal-800"),
    ("hover:from-blue-600 hover:to-indigo-700", "hover:from-teal-600 hover:to-teal-800"),
    ("shadow-blue-500/40", "shadow-teal-900/25"),
    ("shadow-blue-500/30", "shadow-teal-900/20"),
    ("shadow-blue-500/20", "shadow-teal-900/15"),
    ("focus:ring-blue-500/20", "focus:ring-teal-500/20"),
    ("focus:border-blue-500/20", "focus:border-teal-500/20"),
    ("focus-visible:ring-blue-500", "focus-visible:ring-teal-500"),
    ("focus:ring-2 focus:ring-blue-500", "focus:ring-2 focus:ring-teal-500"),
    ("focus:ring-blue-500", "focus:ring-teal-500"),
    ("focus:border-blue-500", "focus:border-teal-500"),
    ("ring-blue-500", "ring-teal-500"),
    ("border-blue-600", "border-teal-600"),
    ("border-blue-500", "border-teal-500"),
    ("border-blue-400", "border-teal-400"),
    ("border-blue-300", "border-teal-300"),
    ("border-blue-200", "border-teal-200"),
    ("border-blue-100", "border-teal-100"),
    ("border-t-blue-600", "border-t-teal-600"),
    ("border-b-blue-600", "border-b-teal-600"),
    ("border-l-blue-600", "border-l-teal-600"),
    ("hover:border-blue-300", "hover:border-teal-300"),
    ("hover:border-blue-200", "hover:border-teal-200"),
    ("divide-blue-200", "divide-teal-200"),
    ("bg-blue-600", "bg-teal-600"),
    ("bg-blue-700", "bg-teal-700"),
    ("hover:bg-blue-700", "hover:bg-teal-700"),
    ("hover:bg-blue-600", "hover:bg-teal-600"),
    ("bg-blue-50", "bg-teal-50"),
    ("bg-blue-100", "bg-teal-100"),
    ("bg-blue-500", "bg-teal-600"),
    ("text-blue-900", "text-teal-900"),
    ("text-blue-800", "text-teal-800"),
    ("text-blue-700", "text-teal-800"),
    ("text-blue-600", "text-teal-700"),
    ("text-blue-500", "text-teal-600"),
    ("text-blue-400", "text-teal-500"),
    ("from-slate-50 via-blue-50/30 to-indigo-50/20", "from-slate-50 via-teal-50/35 to-slate-100"),
    ("via-blue-50/30 to-indigo-50/20", "via-teal-50/35 to-slate-100"),
    ("via-blue-50/30", "via-teal-50/40"),
    ("via-blue-50", "via-teal-50/50"),
    ("to-indigo-50/50", "to-slate-100"),
    ("to-indigo-50/20", "to-slate-100"),
    ("to-indigo-50", "to-slate-100"),
    ("from-indigo-50", "from-slate-50"),
    ("via-indigo-50", "via-teal-50/30"),
    ("bg-indigo-600", "bg-teal-600"),
    ("hover:bg-indigo-700", "hover:bg-teal-700"),
    ("bg-indigo-700", "bg-teal-700"),
    ("text-indigo-600", "text-teal-700"),
    ("text-indigo-700", "text-teal-800"),
    ("text-indigo-800", "text-teal-900"),
    ("border-indigo-200", "border-teal-200"),
    ("border-indigo-300", "border-teal-300"),
    ("from-indigo-600 to-purple-700", "from-teal-600 to-teal-800"),
    ("from-indigo-500 to-purple-600", "from-teal-600 to-teal-800"),
    ("from-purple-600 to-pink-600", "from-teal-600 to-teal-800"),
    ("from-purple-500 to-pink-600", "from-teal-600 to-teal-800"),
    ("from-violet-600 to-purple-600", "from-teal-600 to-teal-800"),
    ("border-b-2 border-blue-600", "border-b-2 border-teal-600"),
    ("border-b-2 border-blue-500", "border-b-2 border-teal-600"),
    ("ring-offset-blue-50", "ring-offset-teal-50"),
    ("stroke-blue-600", "stroke-teal-600"),
    ("fill-blue-600", "fill-teal-600"),
    # second-pass / edge tokens
    ("border-l-blue-500", "border-l-teal-500"),
    ("ring-blue-100", "ring-teal-100"),
    ("ring-blue-200", "ring-teal-200"),
    ("ring-blue-300", "ring-teal-300"),
    ("from-blue-50 to-blue-100", "from-teal-50 to-slate-100"),
    ("from-blue-50 to-blue-100/50", "from-teal-50 to-slate-100/80"),
    ("bg-blue-200/20", "bg-teal-200/20"),
    ("bg-blue-200", "bg-teal-200"),
    ("to-blue-100/50", "to-slate-100/80"),
    ("to-blue-50/30", "to-teal-50/40"),
    ("from-gray-50 to-blue-50/30", "from-slate-50 to-teal-50/40"),
    ("min-h-screen bg-gradient-to-br from-gray-50 to-blue-50", "min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/50"),
    ("text-purple-600", "text-teal-700"),
    ("text-purple-700", "text-teal-800"),
    ("text-purple-800", "text-teal-900"),
    ("bg-purple-600", "bg-teal-600"),
    ("hover:bg-purple-700", "hover:bg-teal-700"),
    ("bg-purple-700", "bg-teal-700"),
    ("border-purple-600", "border-teal-600"),
    ("text-purple-600 border-purple-600", "text-teal-700 border-teal-600"),
    ("from-purple-500 to-purple-600", "from-teal-600 to-teal-700"),
    ("shadow-purple-500/30", "shadow-teal-900/20"),
    ("text-indigo-900", "text-slate-900"),
    ("text-indigo-500", "text-teal-600"),
    ("bg-indigo-50", "bg-teal-50"),
    ("bg-indigo-100", "bg-teal-100"),
    ("border-l-indigo-500", "border-l-teal-500"),
    ("to-indigo-100", "to-slate-100"),
    ("from-slate-50 to-indigo-100", "from-slate-50 to-teal-50"),
    ("from-blue-50 to-slate-100", "from-teal-50 to-slate-100"),
    ("from-cyan-500 to-blue-600", "from-teal-500 to-teal-700"),
    ("from-slate-500 to-purple-600", "from-slate-600 to-teal-700"),
    ("group-hover:ring-blue-300", "group-hover:ring-teal-300"),
    # purple / pink accents → clinical teal (or rose for vitals-only cues)
    ("border-l-purple-500", "border-l-teal-500"),
    ("border-l-pink-500", "border-l-teal-500"),
    ("border-2 border-purple-500", "border-2 border-teal-600"),
    ("text-purple-500", "text-teal-600"),
    ("text-purple-900", "text-teal-900"),
    ("bg-purple-50", "bg-teal-50"),
    ("bg-purple-100", "bg-teal-100"),
    ("border-purple-200", "border-teal-200"),
    ("border-purple-50", "border-teal-50"),
    ("from-purple-50 to-purple-100", "from-teal-50 to-slate-100"),
    ("from-purple-50 to-purple-100/50", "from-teal-50 to-slate-100/90"),
    ("bg-purple-200/20", "bg-teal-200/20"),
    ("to-purple-50/30", "to-teal-50/35"),
    ("from-gray-50 to-purple-50/30", "from-slate-50 to-teal-50/35"),
    ("bg-purple-500", "bg-teal-600"),
    ("'bg-purple-500'", "'bg-teal-600'"),
    ("p-4 bg-purple-50", "p-4 bg-teal-50"),
    ("bg-pink-100", "bg-teal-50"),
    ("text-pink-800", "text-rose-800"),
    ("text-pink-600", "text-rose-600"),
    ("text-pink-500", "text-rose-500"),
    ("from-blue-50 to-white", "from-teal-50/60 to-white"),
]


def patch_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    orig = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return 1
    return 0


def main() -> int:
    exts = {".jsx", ".js", ".css"}
    changed = 0
    files = 0
    for p in SRC.rglob("*"):
        if p.suffix.lower() not in exts:
            continue
        if "node_modules" in p.parts:
            continue
        files += 1
        changed += patch_file(p)
    print(f"Scanned {files} files under src/, modified {changed} files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
