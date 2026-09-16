/* Archive page — browse posts by year/month */
(function () {
  let ALL_POSTS = [];
  const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  let view = { year: null, month: null };

  async function load() {
    try {
      const res = await fetch('feed-data.json', { cache: 'no-cache' });
      ALL_POSTS = await res.json();
    } catch (e) {
      ALL_POSTS = [];
    }
    render();
    document.addEventListener('langchange', render);
  }

  function groupByYear() {
    const m = new Map();
    for (const p of ALL_POSTS) {
      const y = (p.date || '').slice(0, 4);
      if (!y) continue;
      if (!m.has(y)) m.set(y, []);
      m.get(y).push(p);
    }
    return [...m.entries()]
      .map(([year, posts]) => ({ year, posts, count: posts.length }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }

  function groupByMonth(year) {
    const m = new Map();
    for (const p of ALL_POSTS) {
      const d = p.date || '';
      if (d.slice(0, 4) !== year) continue;
      const ym = d.slice(0, 7); // YYYY-MM
      if (!m.has(ym)) m.set(ym, []);
      m.get(ym).push(p);
    }
    return [...m.entries()]
      .map(([ym, posts]) => ({ ym, posts, count: posts.length }))
      .sort((a, b) => b.ym.localeCompare(a.ym));
  }

  function postsForMonth(year, month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    return ALL_POSTS
      .filter((p) => (p.date || '').slice(0, 7) === ym)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

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
    // 2026-09-15 → 15 сентября 2026
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

  function getLang() {
    return (window.__i18n && window.__i18n.lang) || 'ru';
  }

  function renderYears() {
    const grid = document.getElementById('yearsGrid');
    grid.innerHTML = '';
    const years = groupByYear();
    const lang = getLang();

    years.forEach((y) => {
      const tile = el('button', { type: 'button', class: 'archive-tile' });
      tile.appendChild(el('span', { class: 'tile-year' }, y.year));

      const meta = el('div', { class: 'tile-meta' });
      const count = el('strong', {}, `${y.count}`);
      const label = el('span', {}, lang === 'en'
        ? (y.count === 1 ? 'post' : 'posts')
        : (y.count === 1 ? 'публикация' : (y.count < 5 ? 'публикации' : 'публикаций'))
      );
      meta.appendChild(count);
      meta.appendChild(label);
      tile.appendChild(meta);

      tile.addEventListener('click', () => {
        view.year = y.year;
        view.month = null;
        render();
      });
      grid.appendChild(tile);
    });

    if (years.length === 0) {
      grid.appendChild(el('p', { class: 'archive-empty' }, lang === 'en' ? 'No posts yet.' : 'Пока нет публикаций.'));
    }
  }

  function renderMonths() {
    const grid = document.getElementById('monthsGrid');
    grid.innerHTML = '';
    const lang = getLang();
    const months = groupByMonth(view.year);

    months.forEach((mo) => {
      const [, mm] = mo.ym.split('-').map(Number);
      const tile = el('button', { type: 'button', class: 'archive-tile' });
      tile.appendChild(el('span', { class: 'tile-year' },
        lang === 'en' ? MONTHS_EN[mm - 1] : MONTHS_RU[mm - 1]
      ));
      tile.appendChild(el('div', { class: 'tile-sub' }, `${mo.count} ${lang === 'en'
        ? (mo.count === 1 ? 'post' : 'posts')
        : (mo.count === 1 ? 'публикация' : (mo.count < 5 ? 'публикации' : 'публикаций'))}`));

      tile.addEventListener('click', () => {
        view.month = mm;
        render();
      });
      grid.appendChild(tile);
    });
  }

  function renderPosts() {
    const grid = document.getElementById('postsGrid');
    const emptyEl = document.getElementById('postsEmpty');
    grid.innerHTML = '';
    emptyEl.hidden = true;

    const posts = postsForMonth(view.year, view.month);
    const lang = getLang();

    if (posts.length === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = lang === 'en'
        ? 'No posts in this month yet.'
        : 'В этом месяце пока нет публикаций.';
      return;
    }

    posts.forEach((p, idx) => {
      const card = el('article', { class: 'archive-post' });

      const imgWrap = el('div', { class: 'post-image' });
      const img = el('img', { loading: 'lazy', alt: p.caption_short || '' });
      img.src = p.image || '';
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);

      const body = el('div', { class: 'post-body' });
      body.appendChild(el('div', { class: 'post-date' },
        lang === 'en' ? fmtDateEn(p.date) : fmtDateRu(p.date)
      ));
      body.appendChild(el('div', { class: 'post-tag' },
        lang === 'en' ? (p.tag_en || p.tag || 'Post') : (p.tag || 'Публикация')
      ));
      body.appendChild(el('p', { class: 'post-caption' }, p.caption_short || ''));

      card.addEventListener('click', () => {
        if (typeof window.openPostModal === 'function') {
          window.openPostModal(p, posts, posts.indexOf(p));
        }
      });

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

    // Back to years
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

  function render() {
    if (!view.year) {
      showView('years');
      renderYears();
    } else if (!view.month) {
      showView('months');
      renderMonths();
    } else {
      showView('posts');
      renderPosts();
    }
    updateCrumbs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
