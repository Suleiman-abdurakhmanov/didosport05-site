/* Archive page — instant summary (inline) + lazy month load via <script> */
(function () {
  const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const view = { year: null, month: null };

  function loadSummary() {
    try {
      const node = document.getElementById('dido-summary');
      if (!node) return [];
      const j = JSON.parse(node.textContent);
      return j && Array.isArray(j.years) ? j.years : [];
    } catch (e) {
      console.error('archive.js: failed to parse summary', e);
      return [];
    }
  }
  const SUMMARY = loadSummary();
  const MONTH_CACHE = {};

  function getLang() {
    return (window.__i18n && window.__i18n.lang) || 'ru';
  }
  function pluralRu(n) { return n === 1 ? 'публикация' : (n < 5 ? 'публикации' : 'публикаций'); }
  function pluralEn(n) { return n === 1 ? 'post' : 'posts'; }

  function el(tag, attrs = {}, text) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'dataset') Object.assign(e.dataset, attrs[k]);
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function fmtDateRu(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return `${d} ${MONTHS_RU[m - 1]} ${y}`;
  }
  function fmtDateEn(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return `${MONTHS_EN[m - 1]} ${d}, ${y}`;
  }

  function loadMonth(year, month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const key = `__didoMonth${ym.replace('-', '')}`;
    if (MONTH_CACHE[ym]) return Promise.resolve(MONTH_CACHE[ym]);
    if (window[key]) {
      MONTH_CACHE[ym] = window[key].p || [];
      return Promise.resolve(MONTH_CACHE[ym]);
    }
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = `archive/feed-${ym}.js?v=2`;
      s.onload = () => {
        const data = window[key] || { p: [] };
        MONTH_CACHE[ym] = data.p || [];
        resolve(MONTH_CACHE[ym]);
      };
      s.onerror = () => {
        console.error('archive.js: failed to load feed-' + ym + '.js');
        resolve([]);
      };
      document.head.appendChild(s);
    });
  }

  function renderYears() {
    const grid = document.getElementById('yearsGrid');
    grid.innerHTML = '';
    const lang = getLang();
    const total = SUMMARY.reduce((s, y) => s + y.c, 0);
    window.__didoTotalPosts = total;

    if (SUMMARY.length === 0) {
      grid.appendChild(el('p', { class: 'archive-empty' }, lang === 'en' ? 'No posts yet.' : 'Пока нет публикаций.'));
      return;
    }

    SUMMARY.forEach((y) => {
      const tile = el('button', { type: 'button', class: 'archive-tile' });
      tile.appendChild(el('span', { class: 'tile-year' }, y.y));
      const meta = el('div', { class: 'tile-meta' });
      meta.appendChild(el('strong', {}, `${y.c}`));
      meta.appendChild(el('span', {}, lang === 'en' ? pluralEn(y.c) : pluralRu(y.c)));
      tile.appendChild(meta);
      tile.addEventListener('click', () => {
        view.year = y.y;
        view.month = null;
        render();
      });
      grid.appendChild(tile);
    });

    const totalChip = el('p', { class: 'archive-total' },
      (lang === 'en' ? 'Total: ' : 'Всего: ') + total + ' ' + (lang === 'en' ? pluralEn(total) : pluralRu(total)));
    grid.parentElement.insertBefore(totalChip, grid.nextSibling);
  }

  function renderMonths() {
    const grid = document.getElementById('monthsGrid');
    grid.innerHTML = '';
    const lang = getLang();
    const yearObj = SUMMARY.find((y) => y.y === view.year);
    if (!yearObj) {
      grid.appendChild(el('p', { class: 'archive-empty' }, lang === 'en' ? 'Year not found.' : 'Год не найден.'));
      return;
    }
    yearObj.m.forEach((m) => {
      const mm = Number(m.k.split('-')[1]);
      const tile = el('button', { type: 'button', class: 'archive-tile' });
      tile.appendChild(el('span', { class: 'tile-year' },
        lang === 'en' ? MONTHS_EN[mm - 1] : MONTHS_RU[mm - 1]
      ));
      tile.appendChild(el('div', { class: 'tile-sub' }, `${m.c} ${lang === 'en' ? pluralEn(m.c) : pluralRu(m.c)}`));
      tile.addEventListener('click', () => {
        view.month = mm;
        render();
      });
      grid.appendChild(tile);
    });
  }

  async function renderPosts() {
    const grid = document.getElementById('postsGrid');
    const emptyEl = document.getElementById('postsEmpty');
    grid.innerHTML = '';
    emptyEl.hidden = true;
    const lang = getLang();

    const loading = el('p', { class: 'archive-empty' }, lang === 'en' ? 'Loading…' : 'Загрузка…');
    grid.appendChild(loading);

    const posts = await loadMonth(view.year, view.month);
    grid.innerHTML = '';

    const filtered = posts
      .filter((p) => (p.d || '').slice(0, 7) === `${view.year}-${String(view.month).padStart(2, '0')}`)
      .sort((a, b) => (b.d || '').localeCompare(a.d || ''));

    if (filtered.length === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = lang === 'en' ? 'No posts in this month yet.' : 'В этом месяце пока нет публикаций.';
      return;
    }

    filtered.forEach((p) => {
      const card = el('article', { class: 'archive-post' });
      const imgWrap = el('a', { class: 'post-image', href: p.u, target: '_blank', rel: 'noopener' });
      const img = el('img', { loading: 'lazy', alt: p.c || '' });
      img.src = p.i || '';
      img.onerror = () => { imgWrap.style.background = '#222'; img.remove(); };
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);

      const body = el('div', { class: 'post-body' });
      body.appendChild(el('div', { class: 'post-date' },
        lang === 'en' ? fmtDateEn(p.d) : fmtDateRu(p.d)
      ));
      body.appendChild(el('div', { class: 'post-tag' },
        lang === 'en' ? (p.te || p.t || 'Post') : (p.t || 'Публикация')
      ));
      body.appendChild(el('p', { class: 'post-caption' }, p.c || ''));
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function updateCrumbs() {
    const crumbs = document.getElementById('archiveCrumbs');
    const crumbMonths = document.getElementById('crumbMonths');
    const crumbYearSep = document.getElementById('crumbYearSep');
    if (!view.year && !view.month) {
      crumbs.hidden = true;
      return;
    }
    crumbs.hidden = false;
    document.getElementById('crumbYears').onclick = () => {
      view.year = null;
      view.month = null;
      render();
    };
    if (view.year && !view.month) {
      crumbMonths.hidden = true;
      crumbYearSep.hidden = true;
    }
    if (view.year && view.month) {
      const lang = getLang();
      const monthName = (lang === 'en' ? MONTHS_EN : MONTHS_RU)[view.month - 1];
      crumbMonths.hidden = false;
      crumbYearSep.hidden = false;
      crumbMonths.textContent = `${monthName} ${view.year}`;
      crumbMonths.onclick = () => {
        view.month = null;
        render();
      };
    }
  }

  function showView(name) {
    document.getElementById('view-years').hidden = name !== 'years';
    document.getElementById('view-months').hidden = name !== 'months';
    document.getElementById('view-posts').hidden = name !== 'posts';
  }

  async function render() {
    const old = document.querySelector('.archive-total');
    if (old) old.remove();

    if (!view.year) {
      showView('years');
      renderYears();
    } else if (!view.month) {
      showView('months');
      renderMonths();
    } else {
      showView('posts');
      await renderPosts();
    }
    updateCrumbs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function init() {
    document.addEventListener('langchange', render);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
