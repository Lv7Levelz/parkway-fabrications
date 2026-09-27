#!/usr/bin/env python3
"""Build an explicit staging or approved-production static deploy directory."""
from argparse import ArgumentParser
from pathlib import Path
import shutil
import json

root=Path(__file__).resolve().parents[1]
parser=ArgumentParser();parser.add_argument('--mode',choices=['staging','production'],required=True);parser.add_argument('--api-url',required=True);parser.add_argument('--approve-production-indexing',action='store_true');args=parser.parse_args()
if args.mode=='production' and not args.approve_production_indexing:raise SystemExit('Production requires --approve-production-indexing after launch approval')
dist=root/'dist';shutil.rmtree(dist,ignore_errors=True);dist.mkdir()
for pattern in ('*.html','*.css','*.js','*.xml','*.txt','*.svg','*.jpg','*.webp'):
 for source in root.glob(pattern):shutil.copy2(source,dist/source.name)
shutil.copytree(root/'assets',dist/'assets')
(dist/'public-config.js').write_text(f"window.PARKWAY_CONFIG = Object.freeze({{ apiBase: {json.dumps(args.api_url.rstrip('/'))} }});\n")
if args.mode=='staging':
 for page in dist.glob('*.html'):
  content=page.read_text().replace('content="index,follow,max-image-preview:large"','content="noindex,nofollow"')
  page.write_text(content)
 (dist/'robots.txt').write_text('User-agent: *\nDisallow: /\n')
print(f'Built {args.mode} frontend in {dist}')


if args.mode=='production':
 for page in dist.glob('*.html'):
  if page.name not in {'404.html','privacy.html'}:
   page.write_text(page.read_text().replace('content="noindex,nofollow"','content="index,follow,max-image-preview:large"'))
 (dist/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://www.parkwayfabrications.co.uk/sitemap.xml\n')
