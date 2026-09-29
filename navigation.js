/* Progressive navigation only. RFQ behaviour remains in the unchanged script.js. */
(() => {
  const nav = document.querySelector('#primary-navigation');
  const menu = document.querySelector('.menu');
  const disclosures = [...document.querySelectorAll('.nav-disclosure')];
  if (!nav || !menu || disclosures.length === 0) return;

  document.documentElement.classList.add('nav-enhanced');
  const desktop = window.matchMedia('(min-width: 1181px)');

  const closeDisclosures = (except = null) => {
    disclosures.forEach(disclosure => {
      if (disclosure !== except) disclosure.open = false;
    });
  };

  const close = (restoreFocus = false) => {
    const wasOpen = nav.classList.contains('open');
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open menu');
    closeDisclosures();
    if (restoreFocus && wasOpen) menu.focus();
  };

  disclosures.forEach(disclosure => {
    const group = disclosure.closest('.nav-group');
    const summary = disclosure.querySelector('summary');
    if (!group || !summary) return;

    group.addEventListener('mouseenter', () => {
      if (!desktop.matches) return;
      closeDisclosures(disclosure);
      disclosure.open = true;
    });

    group.addEventListener('mouseleave', () => {
      if (desktop.matches) disclosure.open = false;
    });

    group.addEventListener('focusin', () => {
      if (!desktop.matches) return;
      closeDisclosures(disclosure);
      disclosure.open = true;
    });

    group.addEventListener('focusout', event => {
      if (desktop.matches && !group.contains(event.relatedTarget)) disclosure.open = false;
    });

    summary.addEventListener('click', () => closeDisclosures(disclosure));
  });

  menu.addEventListener('click', () => {
    const open = nav.classList.contains('open');
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open) closeDisclosures();
  });

  nav.addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openDisclosure = disclosures.find(disclosure => disclosure.open);
    if (openDisclosure) {
      openDisclosure.open = false;
      openDisclosure.querySelector('summary')?.focus();
    } else {
      close(true);
    }
  });

  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !menu.contains(event.target)) close();
  });

  window.matchMedia('(max-width: 1180px)').addEventListener('change', () => close());
})();
