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
        self.nav_links, self.robots = [], []
        self.in_main = self.in_nav = False
        self.main_count = 0
        self.dropdown_groups, self.disclosure_names, self.summary_labels = [], [], []
        self.active_dropdown = None

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
        if self.in_nav and tag == 'details' and 'nav-disclosure' in d.get('class', '').split():
            self.disclosure_names.append(d.get('name'))
        if self.in_nav and tag == 'summary':
            self.summary_labels.append(d.get('aria-label', '').strip())
        if self.in_nav and tag == 'ul' and 'nav-dropdown' in d.get('class', '').split():
            self.active_dropdown = {'hub': self.nav_links[-1] if self.nav_links else '', 'links': []}
            self.dropdown_groups.append(self.active_dropdown)
        if tag == 'meta' and d.get('name') == 'robots':
            self.robots.append(d.get('content'))
        if tag == 'a' and d.get('href'):
            self.links.append(d['href'])
            if self.active_dropdown is not None:
                self.active_dropdown['links'].append(d['href'])
            if self.in_main:
                self.main_links.append(d['href'])
            if self.in_nav:
                self.nav_links.append(d['href'])

    def handle_endtag(self, tag):
        if tag == 'main': self.in_main = False
        if tag == 'nav': self.in_nav = False
        if tag == 'ul':
            self.active_dropdown = None


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
        expected_groups = {
            'services.html': set(SERVICES),
            'sectors.html': {'sectors.html#' + key for key in ('manufacturing', 'recycling', 'construction', 'transportation', 'oil-gas', 'agriculture', 'architectural', 'general-industry')},
            'capabilities.html': {'capabilities.html#' + key for key, _ in SERVICES.values()},
        }
        if len(page.dropdown_groups) != 3 or {group['hub'] for group in page.dropdown_groups} != set(expected_groups):
            errors.append(f'{name}: expected three dropdowns with independently clickable hub links')
        for group in page.dropdown_groups:
            expected_links = expected_groups.get(group['hub'], set())
            if set(group['links']) != expected_links or len(group['links']) != len(expected_links):
                errors.append(f"{name}: incorrect dropdown destinations for {group['hub']}")
        if page.disclosure_names != ['primary-dropdown'] * 3:
            errors.append(f'{name}: dropdowns must share the native exclusive disclosure name')
        if len(page.summary_labels) != 3 or not all(page.summary_labels):
            errors.append(f'{name}: dropdown controls require accessible names')
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
