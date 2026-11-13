"""Sync the shared head / header / footer into every page.

Edit the files in partials/, then run from the site folder:

    python tools/build.py

Each page has marker comments such as <!-- @include header --> ... <!-- @end header -->.
Everything between a pair of markers is replaced with the matching partial, so
never hand-edit inside them. The script also:
  * marks the current page in the nav ({{current page.html}} -> aria-current="page")
  * stamps CSS/JS links with a short content hash (?v=...), so browsers
    re-download them only when they actually change
  * fills in {{updated}} with the current month for the footer

Plain HTML stays the source of truth: GitHub Pages serves the files as they are.
"""
import datetime
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["index.html", "ares.html", "about.html", "contact.html"]
PARTIALS = ["head", "header", "footer"]


def file_hash(rel):
    return hashlib.sha1((ROOT / rel).read_bytes()).hexdigest()[:8]


def render(name, page):
    text = (ROOT / "partials" / f"{name}.html").read_text(encoding="utf-8")
    text = re.sub(
        r"\{\{current ([\w.-]+)\}\}",
        lambda m: ' aria-current="page"' if m.group(1) == page else "",
        text,
    )
    text = re.sub(r"\{\{hash ([\w./-]+)\}\}", lambda m: file_hash(m.group(1)), text)
    text = text.replace("{{updated}}", datetime.date.today().strftime("%B %Y"))
    return text


def build_page(page):
    path = ROOT / page
    html = path.read_text(encoding="utf-8")
    original = html
    for name in PARTIALS:
        pattern = re.compile(
            rf"(<!-- @include {name} -->\n).*?[ \t]*<!-- @end {name} -->", re.S
        )
        if not pattern.search(html):
            sys.exit(f"{page}: missing <!-- @include {name} --> markers")
        body = render(name, page).rstrip("\n")
        end = f"\n  <!-- @end {name} -->"
        html = pattern.sub(lambda m: m.group(1) + body + end, html)
    # Page-specific scripts at the bottom of <body> get hashes too.
    html = re.sub(
        r'(assets/js/([\w-]+)\.js)\?v=[\w]+',
        lambda m: f"{m.group(1)}?v={file_hash(m.group(1))}",
        html,
    )
    if html != original:
        path.write_text(html, encoding="utf-8", newline="\n")
        print(f"updated {page}")
    else:
        print(f"unchanged {page}")


if __name__ == "__main__":
    for p in PAGES:
        build_page(p)
