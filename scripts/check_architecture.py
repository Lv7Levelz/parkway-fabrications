"""Static navigation and relationship checks shared by source and staging audits."""
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

SERVICES = {
    'laser-cutting.html': ('laser', 'manufacturing'),
    'bending-folding.html': ('folding', 'manufacturing'),
    'welding.html': ('welding', 'construction'),
    'granulator-screens.html': ('granulator', 'recycling'),
    'perforated-metal.html': ('perforated', 'architectural'),
    'fabrication.html': ('bespoke', 'general-industry'),
}


class Structure(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.duplicates, self.links, self.main_links = set(), set(), [], []
        self.nav_links, self.dropdown_links, self.robots = [], [], []
        self.in_main = self.in_nav = self.in_dropdown = False
        self.main_count = 0

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if d.get('id'):
            if d['id'] in self.ids:
                self.duplicates.add(d['id'])
            self.ids.add(d['id'])
        if tag == 'main':
            self.in_main = True
            self.main_count += 1
        if tag == 'nav' and d.get('id') == 'primary-navigation':
            self.in_nav = True
        if tag == 'ul' and 'services-dropdown' in (d.get('class') or '').split():
            self.in_dropdown = True
        if tag == 'meta' and d.get('name') == 'robots':
            self.robots.append(d.get('content'))
        if tag == 'a' and d.get('href'):
            self.links.append(d['href'])
            if self.in_main:
                self.main_links.append(d['href'])
            if self.in_nav:
                self.nav_links.append(d['href'])
            if self.in_dropdown:
                self.dropdown_links.append(d['href'])

    def handle_endtag(self, tag):
        if tag == 'main': self.in_main = False
        if tag == 'nav': self.in_nav = False
        if tag == 'ul': self.in_dropdown = False


def check(root, mode='staging'):
    errors, pages = [], {}
    for path in root.glob('*.html'):
        page = Structure()
        page.feed(path.read_text())
        pages[path.name] = page
    for name, page in pages.items():
        if page.duplicates:
            errors.append(f'{name}: duplicate IDs {sorted(page.duplicates)}')
        if page.main_count != 1 or 'main-content' not in page.ids:
            errors.append(f'{name}: expected one main landmark and skip-link target')
        if mode == 'staging' and page.robots != ['noindex,nofollow']:
            errors.append(f'{name}: staging must remain noindex,nofollow')
        expected = {'index.html', 'services.html', 'sectors.html', 'capabilities.html', 'projects.html', 'about.html', 'contact.html'}
        if not expected.issubset(page.nav_links):
            errors.append(f'{name}: incomplete primary navigation')
        if len(page.dropdown_links) != 6 or set(page.dropdown_links) != set(SERVICES):
            errors.append(f'{name}: expected exactly six service dropdown links')
        for href in page.links:
            target = urlsplit(href)
            if target.scheme or target.netloc: continue
            filename = unquote(target.path) or name
            if target.fragment and filename in pages and unquote(target.fragment) not in pages[filename].ids:
                errors.append(f'{name}: broken fragment {href}')
    for name, (capability, sector) in SERVICES.items():
        expected = {'services.html', f'sectors.html#{sector}', f'capabilities.html#{capability}', 'projects.html#case-study-template'}
        if name not in pages or not expected.issubset(pages[name].main_links):
            errors.append(f'{name}: missing contextual service/sector/capability/project relationship')
        if name not in pages.get('services.html', Structure()).main_links:
            errors.append(f'{name}: missing from services hub content')
        if name not in pages.get('capabilities.html', Structure()).main_links:
            errors.append(f'{name}: missing reciprocal capability link')
    return errors
