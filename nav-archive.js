/* Nested archive menu for mobile drawer. Reads #dido-summary JSON. */
(function () {
  const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  function loadSummary() {
    const node = document.getElementById('dido-summary');
    if (!node) return [];
    try {
      const j = JSON.parse(node.textContent);
      return (j && Array.isArray(j.years)) ? j.years : [];
    } catch (e) {
      console.error('nav-archive: bad summary', e);
      return [];
    }
  }

  function getLang() {
    return (window.__i18n && window.__i18n.lang) || 'ru';
  }

  function isArchivePage() {
    return /\/archive\.html$/.test(location.pathname);
  }

  function closeMobileNav() {
    const panel = document.getElementById('mobile-nav');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    if (panel) {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) {
      backdrop.classList.remove('is-open');
      setTimeout(() => { backdrop.hidden = true; }, 280);
    }
    const burger = document.getElementById('hamburger');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function buildYears(years, host) {
    host.innerHTML = '';
    if (!years.length) {
      host.appendChild(Object.assign(document.createElement('p'),
        { className: 'nav-archive__empty', textContent: 'Пока нет публикаций' }));
      return;
    }
    years.forEach((y) => {
      const det = document.createElement('details');
      det.className = 'nav-archive__year';

      const sum = document.createElement('summary');
      const yLabel = document.createElement('span');
      yLabel.textContent = y.y;
      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = `${y.c}`;
      sum.appendChild(yLabel);
      sum.appendChild(count);
      det.appendChild(sum);

      const wrap = document.createElement('div');
      wrap.className = 'nav-archive__months';
      (y.m || []).forEach((m) => {
        const mm = Number(m.k.split('-')[1]);
        const a = document.createElement('a');
        // Use hash-only href so same-page navigation is instant + we can close drawer reliably
        a.href = `#${m.k}`;
        const name = document.createElement('span');
        name.className = 'mname';
        name.textContent = MONTHS_RU[mm - 1];
        const cnt = document.createElement('span');
        cnt.className = 'mcount';
        cnt.textContent = `${m.c}`;
        a.appendChild(name);
        a.appendChild(cnt);
        wrap.appendChild(a);
      });
      det.appendChild(wrap);
      host.appendChild(det);
    });
  }

  function init() {
    const hosts = document.querySelectorAll('.nav-archive__years');
    if (!hosts.length) return;
    const years = loadSummary();
    hosts.forEach((host) => buildYears(years, host));

    // Intercept clicks on month links:
    // - if we are already on archive.html — change hash manually + close drawer
    // - if not — go to archive.html#YYYY-MM (plain link), drawer closes via mobile-nav.js
    const onArchive = isArchivePage();
    document.querySelectorAll('.nav-archive__months a').forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        if (onArchive) {
          e.preventDefault();
          // Close drawer first so user sees posts
          closeMobileNav();
          // Change hash (without scroll jump) and notify archive.js
          const id = href.slice(1);
          if (history.pushState) history.pushState(null, '', href);
          else location.hash = href;
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } else {
          // On any other page — let the link do a full nav, but rewrite to archive.html#...
          e.preventDefault();
          closeMobileNav();
          window.location.href = 'archive.html' + href;
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
