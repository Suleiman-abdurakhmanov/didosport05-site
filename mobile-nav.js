// Mobile off-canvas menu (hamburger). No deps.
(function () {
  const burger = document.getElementById('hamburger');
  const panel = document.getElementById('mobile-nav');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const closeBtn = document.getElementById('mobile-nav-close');
  if (!burger || !panel || !backdrop) return;

  function open() {
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    backdrop.hidden = false;
    // force reflow so transition triggers
    void backdrop.offsetWidth;
    backdrop.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { backdrop.hidden = true; }, 280);
  }
  function toggle() {
    if (panel.classList.contains('is-open')) close();
    else open();
  }

  burger.addEventListener('click', toggle);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  // Close when a link inside is tapped
  panel.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => close());
  });

  // Sync language buttons inside the panel with the page ones
  const langBtns = document.querySelectorAll('.lang-btn');
  const panelLangBtns = panel.querySelectorAll('.lang-btn');
  panelLangBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(`.lang-switch .lang-btn[data-lang="${btn.dataset.lang}"]`)
                  || document.querySelector(`.lang-btn[data-lang="${btn.dataset.lang}"]`);
      if (target) target.click();
    });
  });
  document.addEventListener('langchange', (e) => {
    const lang = (e.detail && e.detail.lang) || localStorage.getItem('dido_lang') || 'ru';
    langBtns.forEach(b => {
      const active = b.dataset.lang === lang;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  });

  // Esc closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
  });

  // Reset on resize back to desktop
  let lastWide = window.matchMedia('(min-width: 961px)').matches;
  window.addEventListener('resize', () => {
    const wide = window.matchMedia('(min-width: 961px)').matches;
    if (wide && !lastWide) close();
    lastWide = wide;
  });
})();
