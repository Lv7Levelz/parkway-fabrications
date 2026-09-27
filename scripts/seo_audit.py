#!/usr/bin/env python3
"""Dependency-free checks for the static site's launch-critical SEO contracts."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = {p.name for p in ROOT.glob("*.html") if p.name not in {"404.html", "privacy.html"}}


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.description = []
        self.canonical = []
        self.robots = []
        self.h1 = 0
        self.links = []
        self.images = []
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == "title": self._in_title = True
        if tag == "h1": self.h1 += 1
        if tag == "meta" and data.get("name") == "description": self.description.append(data.get("content", ""))
        if tag == "meta" and data.get("name") == "robots": self.robots.append(data.get("content", ""))
        if tag == "link" and data.get("rel") == "canonical": self.canonical.append(data.get("href", ""))
        if tag == "a" and data.get("href"): self.links.append(data["href"])
        if tag == "img": self.images.append(data)

    def handle_endtag(self, tag):
        if tag == "title": self._in_title = False

    def handle_data(self, data):
        if self._in_title: self.title += data


errors, titles, descriptions, pages = [], {}, {}, {}
for filename in sorted(PUBLIC):
    source = (ROOT / filename).read_text()
    page = PageParser(); page.feed(source)
    pages[filename] = page
    for label, value in (("title", page.title.strip()), ("description", page.description[0] if len(page.description) == 1 else "")):
        if not value: errors.append(f"{filename}: missing/duplicate {label}")
        seen = titles if label == "title" else descriptions
        if value in seen: errors.append(f"{filename}: duplicate {label} also used by {seen[value]}")
        seen[value] = filename
    if page.h1 != 1: errors.append(f"{filename}: expected one H1; found {page.h1}")
    if len(page.canonical) != 1 or not page.canonical[0].startswith("https://www.parkwayfabrications.co.uk/"):
        errors.append(f"{filename}: invalid canonical")
    if len(page.robots) != 1 or "noindex" in page.robots[0]: errors.append(f"{filename}: not indexable")
    for image in page.images:
        if not image.get("alt"): errors.append(f"{filename}: image missing alt")
        if not image.get("width") or not image.get("height"): errors.append(f"{filename}: image missing dimensions")
    for href in page.links:
        if href.startswith(("http:", "https:", "mailto:", "tel:", "#")): continue
        target = href.split("?", 1)[0].split("#", 1)[0]
        if target and not (ROOT / target).exists(): errors.append(f"{filename}: broken link {href}")
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', source, re.S):
        try: json.loads(block)
        except json.JSONDecodeError as exc: errors.append(f"{filename}: invalid JSON-LD ({exc})")

inbound = {name: 0 for name in PUBLIC}
for source_name, page in pages.items():
    for href in page.links:
        target = href.split("?", 1)[0].split("#", 1)[0]
        if not target: target = source_name
        if target in inbound and target != source_name: inbound[target] += 1
for filename, count in inbound.items():
    if filename != "index.html" and count == 0: errors.append(f"{filename}: orphaned from public HTML pages")

sitemap = ET.parse(ROOT / "sitemap.xml")
locs = {node.text.rsplit("/", 1)[-1] or "index.html" for node in sitemap.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")}
if locs != PUBLIC: errors.append(f"sitemap mismatch: missing={sorted(PUBLIC-locs)}, extra={sorted(locs-PUBLIC)}")
robots = (ROOT / "robots.txt").read_text()
if "Disallow: /\n" in robots: errors.append("robots.txt blocks the whole site")
if "Sitemap: https://www.parkwayfabrications.co.uk/sitemap.xml" not in robots: errors.append("robots.txt has no production sitemap")

if errors:
    print("SEO audit failed:\n- " + "\n- ".join(errors)); sys.exit(1)
print(f"SEO audit passed for {len(PUBLIC)} indexable pages: unique titles/descriptions/H1s, canonicals, sitemap, robots, images, links and JSON-LD syntax.")
