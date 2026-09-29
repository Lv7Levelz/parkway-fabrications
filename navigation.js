/* Progressive navigation only. RFQ behaviour remains in the unchanged script.js. */
(() => {
  const nav = document.querySelector('#primary-navigation');
  const menu = document.querySelector('.menu');
  const disclosures = [...(nav?.querySelectorAll('.nav-disclosure') || [])];
  if (!nav || !menu || disclosures.length === 0) return;

  document.documentElement.classList.add('nav-enhanced');
  const desktop = window.matchMedia('(min-width: 1181px)');
  const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let restoringFocus = false;

  const closeDisclosure = disclosure => {
    // Never leave keyboard focus inside content that is about to be hidden.
    if (disclosure.querySelector('.nav-dropdown')?.contains(document.activeElement)) {
      restoringFocus = true;
      disclosure.querySelector('summary').focus({ preventScroll: true });
      restoringFocus = false;
    }
    disclosure.open = false;
  };

  const closeDisclosures = (except = null) => {
    disclosures.forEach(disclosure => {
      if (disclosure !== except) closeDisclosure(disclosure);
    });
  };

  const close = (restoreFocus = false) => {
    const wasOpen = nav.classList.contains('open');
    closeDisclosures();
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open menu');
    if (restoreFocus && wasOpen) menu.focus();
  };

  disclosures.forEach(disclosure => {
    const group = disclosure.closest('.nav-group');
    const summary = disclosure.querySelector('summary');
    if (!group || !summary) return;

    group.addEventListener('mouseenter', () => {
      if (!desktop.matches || !hoverPointer.matches) return;
      closeDisclosures(disclosure);
      disclosure.open = true;
    });

    group.addEventListener('mouseleave', () => {
      if (desktop.matches && !group.contains(document.activeElement)) closeDisclosure(disclosure);
    });

    group.addEventListener('focusin', event => {
      // Pointer activation retains native summary toggling, including large touch screens.
      if (!desktop.matches || restoringFocus || !event.target.matches(':focus-visible')) return;
      closeDisclosures(disclosure);
      disclosure.open = true;
    });

    group.addEventListener('focusout', event => {
      if (desktop.matches && !group.contains(event.relatedTarget)) closeDisclosure(disclosure);
    });

    summary.addEventListener('click', () => closeDisclosures(disclosure));
  });

  // script.js owns the existing mobile toggle; keep its accessible label in sync.
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
      // Restore focus before closing, with focus-opening suppressed.
      restoringFocus = true;
      openDisclosure.querySelector('summary').focus({ preventScroll: true });
      restoringFocus = false;
      closeDisclosure(openDisclosure);
    } else {
      close(true);
    }
  });

  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !menu.contains(event.target)) close();
  });

  nav.addEventListener('focusout', event => {
    if (!nav.contains(event.relatedTarget) && event.relatedTarget !== menu) close();
  });

  desktop.addEventListener('change', () => {
    const focusWasInside = nav.contains(document.activeElement);
    close();
    if (!desktop.matches && focusWasInside) menu.focus();
  });
})();
