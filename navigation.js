/* Progressive navigation only. RFQ behaviour remains in the unchanged script.js. */
(() => {
  const nav = document.querySelector('#primary-navigation');
  const menu = document.querySelector('.menu');
  const disclosure = document.querySelector('.services-disclosure');
  if (!nav || !menu || !disclosure) return;
  document.documentElement.classList.add('nav-enhanced');
  const close = (restoreFocus = false) => {
    const wasOpen = nav.classList.contains('open');
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open menu');
    disclosure.open = false;
    if (restoreFocus && wasOpen) menu.focus();
  };
  // script.js owns the existing mobile toggle; this keeps its accessible label in sync.
  menu.addEventListener('click', () => {
    const open = nav.classList.contains('open');
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open) disclosure.open = false;
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (disclosure.open) {
      disclosure.open = false;
      disclosure.querySelector('summary').focus();
    } else close(true);
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !menu.contains(event.target)) close();
  });
  nav.addEventListener('focusout', event => {
    if (!nav.contains(event.relatedTarget) && event.relatedTarget !== menu) close();
  });
  window.matchMedia('(max-width: 1180px)').addEventListener('change', () => close());
})();
