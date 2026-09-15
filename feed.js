(function () {
  'use strict';

  const labels = {
    ru: {
      all: 'Все',
      open_modal: 'Открыть публикацию',
      close: 'Закрыть',
      prev: 'Предыдущее фото',
      next: 'Следующее фото',
      carousel: 'Карусель',
      image: 'Фото',
      video: 'Видео',
      caption_label: 'Описание',
      posts_count_one: '{n} публикация',
      posts_count_few: '{n} публикации',
      posts_count_many: '{n} публикаций',
      open_section: 'Открыть раздел →',
      like: 'Нравится',
      liked: 'Оценил',
      like_hint: 'Оценка сохраняется в вашем браузере. Обсуждение — в Telegram, без регистрации.',
      discuss_tg: 'Обсудить в Telegram',
      share_tg: 'Поделиться',
      discuss_prefix: '💬 Комментарий к публикации от {date}\nРаздел: {category}\n\n',
    },
    en: {
      all: 'All',
      open_modal: 'Open post',
      close: 'Close',
      prev: 'Previous photo',
      next: 'Next photo',
      carousel: 'Carousel',
      image: 'Photo',
      video: 'Video',
      caption_label: 'Caption',
      posts_count_one: '{n} post',
      posts_count_other: '{n} posts',
      open_section: 'Open section →',
      like: 'Like',
      liked: 'Liked',
      like_hint: 'Your like is saved in this browser. Discussion lives in Telegram — no signup.',
      discuss_tg: 'Discuss on Telegram',
      share_tg: 'Share',
      discuss_prefix: '💬 Comment on the post from {date}\nSection: {category}\n\n',
    },
  };

  const TG_HANDLE = 'didosport05';
  const SITE_URL = 'https://www.didosport05.ru/';

  function tgCommentUrl(post) {
    const lang = pickLang();
    const tpl = labels[lang].discuss_prefix;
    const cat = post.category || '';
    const catLabel = (categories[cat] && (lang === 'en' ? categories[cat].en : categories[cat].ru)) || cat;
    const text = tpl
      .replace('{date}', post.date || '')
      .replace('{category}', catLabel);
    const full = `${text}https://www.instagram.com/p/${post.code || ''}/`;
    return `https://t.me/${TG_HANDLE}?text=${encodeURIComponent(full)}`;
  }
  function tgShareUrl(post) {
    const tag = post.tag || '';
    const text = `DIDO SPORT — ${tag}`;
    return `https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${encodeURIComponent(text)}`;
  }

  const LIKES_KEY = 'dido_likes_v1';
  function getLikedSet() {
    try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || '[]')); }
    catch (e) { return new Set(); }
  }
  function saveLikedSet(set) {
    try { localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(set))); }
    catch (e) { /* storage unavailable */ }
  }
  function isLiked(postId) { return getLikedSet().has(postId); }
  function toggleLiked(postId) {
    const s = getLikedSet();
    if (s.has(postId)) s.delete(postId); else s.add(postId);
    saveLikedSet(s);
    return s.has(postId);
  }

  function pickLang() {
    return localStorage.getItem('dido_lang') === 'en' ? 'en' : 'ru';
  }
  function L() { return labels[pickLang()]; }
  function t(k) { return L()[k]; }

  const months = {
    ru: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  };

  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    if (!y) return iso;
    return `${d} ${months[pickLang()][m - 1]} ${y}`;
  }

  function pluralRu(n) {
    const tpl = (n % 10 === 1 && n % 100 !== 11) ? L().posts_count_one
              : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? L().posts_count_few
              : L().posts_count_many;
    return tpl.replace('{n}', n);
  }
  function pluralEn(n) {
    const tpl = n === 1 ? L().posts_count_one : L().posts_count_other;
    return tpl.replace('{n}', n);
  }
  function countLabel(n) {
    return pickLang() === 'en' ? pluralEn(n) : pluralRu(n);
  }

  function linkify(text) {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  function makeEl(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  // ============ STATE ============
  let allPosts = [];
  let categories = {}; // key -> {key, ru, en, desc_ru, desc_en, cover, order}
  let activeFilter = 'all';

  // ============ RENDER: latest (2 newest) ============
  function renderLatest() {
    const root = document.getElementById('latest-grid');
    const empty = document.getElementById('latest-empty');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);

    // Sort by date desc, take 2
    const sorted = allPosts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const top = sorted.slice(0, 2);

    if (!top.length) {
      root.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    root.hidden = false;
    if (empty) empty.hidden = true;

    top.forEach((post) => {
      const card = makeEl('button', 'latest-card');
      card.type = 'button';
      card.setAttribute('aria-label', L().latest_open);

      const media = makeEl('div', 'latest-card__media');
      if (post.image) {
        const img = document.createElement('img');
        img.src = post.image;
        img.alt = '';
        img.loading = 'eager';
        media.appendChild(img);
      }
      const badge = makeEl('span', 'latest-card__badge', L().latest_just_now);
      media.appendChild(badge);
      card.appendChild(media);

      const body = makeEl('div', 'latest-card__body');
      const meta = makeEl('div', 'latest-card__meta');
      const cat = categories[post.category];
      if (cat) {
        const catBadge = makeEl('span', 'latest-card__cat', pickLang() === 'en' ? cat.en : cat.ru);
        meta.appendChild(catBadge);
      }
      meta.appendChild(makeEl('span', 'latest-card__date', fmtDate(post.date)));
      body.appendChild(meta);

      const title = makeEl('h3', 'latest-card__title', post.summary);
      body.appendChild(title);

      const open = makeEl('span', 'latest-card__open', L().latest_open);
      body.appendChild(open);

      card.appendChild(body);
      card.addEventListener('click', () => openModal(post));
      root.appendChild(card);
    });
  }

  // ============ RENDER: cards in feed ============
  function buildCard(post) {
    const tag = pickLang() === 'en'
      ? (post.tag_en || post.tag)
      : post.tag;
    const typeLabel = L()[post.type] || L().image;
    const cat = categories[post.category];
    const catLabel = cat ? (pickLang() === 'en' ? cat.en : cat.ru) : '';

    const btn = makeEl('button', 'ig-card');
    btn.type = 'button';
    btn.setAttribute('aria-label', L().open_modal);
    btn.dataset.postId = post.url;
    btn.dataset.category = post.category || '';

    const media = makeEl('div', 'ig-card__media');
    if (post.image) {
      const img = document.createElement('img');
      img.src = post.image;
      img.alt = '';
      img.loading = 'lazy';
      media.appendChild(img);
    } else {
      const ph = makeEl('div', 'ig-card__placeholder');
      ph.appendChild(makeEl('span', null, typeLabel));
      media.appendChild(ph);
    }
    media.appendChild(makeEl('span', 'ig-card__badge', typeLabel));
    if (catLabel) {
      const catBadge = makeEl('span', 'ig-card__cat', catLabel);
      media.appendChild(catBadge);
    }
    btn.appendChild(media);
    if (isLiked(post.code || post.url)) {
      btn.classList.add('ig-card--liked');
      const heart = makeEl('span', 'ig-card__heart', '❤');
      heart.setAttribute('aria-hidden', 'true');
      btn.appendChild(heart);
    }

    const body = makeEl('div', 'ig-card__body');
    body.appendChild(makeEl('p', 'ig-card__tag', tag || ''));
    body.appendChild(makeEl('p', 'ig-card__date', fmtDate(post.date)));
    body.appendChild(makeEl('p', 'ig-card__caption', post.caption_short));
    body.appendChild(makeEl('span', 'ig-card__open', L().open_modal + ' →'));
    btn.appendChild(body);
    return btn;
  }

  function renderFeed() {
    const grid = document.getElementById('ig-grid');
    const empty = document.getElementById('ig-empty');
    if (!grid) return;
    const filtered = activeFilter === 'all'
      ? allPosts
      : allPosts.filter((p) => p.category === activeFilter);

    while (grid.firstChild) grid.removeChild(grid.firstChild);
    filtered.forEach((p) => {
      const card = buildCard(p);
      card.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(p);
      });
      grid.appendChild(card);
    });
    grid.hidden = false;
    if (empty) empty.hidden = filtered.length > 0;
  }

  // ============ RENDER: filter bar ============
  function renderFilters() {
    const root = document.getElementById('feed-filters');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);

    // "All" pill
    const allBtn = makeEl('button', 'filter-pill is-active');
    allBtn.type = 'button';
    allBtn.setAttribute('role', 'tab');
    allBtn.setAttribute('aria-selected', 'true');
    allBtn.dataset.filter = 'all';
    allBtn.appendChild(makeEl('span', 'filter-pill__label', L().all));
    allBtn.appendChild(makeEl('span', 'filter-pill__count', String(allPosts.length)));
    allBtn.addEventListener('click', () => applyFilter('all'));
    root.appendChild(allBtn);

    // Category pills in order
    const ordered = Object.values(categories).sort((a, b) => (a.order || 99) - (b.order || 99));
    ordered.forEach((cat) => {
      const count = allPosts.filter((p) => p.category === cat.key).length;
      const pill = makeEl('button', 'filter-pill');
      pill.type = 'button';
      pill.setAttribute('role', 'tab');
      pill.setAttribute('aria-selected', 'false');
      pill.dataset.filter = cat.key;
      const name = pickLang() === 'en' ? cat.en : cat.ru;
      pill.appendChild(makeEl('span', 'filter-pill__label', name));
      pill.appendChild(makeEl('span', 'filter-pill__count', String(count)));
      pill.addEventListener('click', () => applyFilter(cat.key));
      root.appendChild(pill);
    });
  }

  // ============ RENDER: sections grid ============
  function renderSections() {
    const root = document.getElementById('sections-grid');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    const ordered = Object.values(categories).sort((a, b) => (a.order || 99) - (b.order || 99));
    ordered.forEach((cat) => {
      const count = allPosts.filter((p) => p.category === cat.key).length;
      const card = makeEl('button', 'section-card');
      card.type = 'button';
      card.dataset.category = cat.key;

      const media = makeEl('div', 'section-card__media');
      if (cat.cover) {
        const img = document.createElement('img');
        img.src = cat.cover;
        img.alt = '';
        img.loading = 'lazy';
        media.appendChild(img);
      } else {
        const ph = makeEl('div', 'section-card__placeholder');
        ph.appendChild(makeEl('span', null, (pickLang() === 'en' ? cat.en : cat.ru).slice(0, 1)));
        media.appendChild(ph);
      }
      card.appendChild(media);

      const body = makeEl('div', 'section-card__body');
      body.appendChild(makeEl('p', 'section-card__count', countLabel(count)));
      body.appendChild(makeEl('h3', 'section-card__title', pickLang() === 'en' ? cat.en : cat.ru));
      body.appendChild(makeEl('p', 'section-card__desc', pickLang() === 'en' ? cat.desc_en : cat.desc_ru));
      body.appendChild(makeEl('span', 'section-card__open', L().open_section));
      card.appendChild(body);

      card.addEventListener('click', () => {
        applyFilter(cat.key, true);
      });
      root.appendChild(card);
    });
  }

  // ============ FILTERING ============
  function applyFilter(category, scroll) {
    activeFilter = category;
    // Update active state in filter bar
    document.querySelectorAll('#feed-filters .filter-pill').forEach((p) => {
      const isActive = p.dataset.filter === category;
      p.classList.toggle('is-active', isActive);
      p.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    renderFeed();
    if (scroll) {
      const feed = document.getElementById('feed');
      if (feed) feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Update URL hash so the filter is shareable
    try {
      const hash = category === 'all' ? '#feed' : '#feed/' + category;
      if (location.hash !== hash) {
        history.replaceState(null, '', hash);
      }
    } catch (e) {}
  }

  function readFilterFromHash() {
    const h = (location.hash || '').toLowerCase();
    const m = h.match(/^#feed\/([a-z_]+)/);
    if (m && categories[m[1]]) return m[1];
    return 'all';
  }

  // ============ MODAL ============
  let activeModal = null;
  let activePost = null;

  function ensureModal() {
    if (activeModal) return activeModal;
    const overlay = makeEl('div', 'post-modal');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const panel = makeEl('div', 'post-modal__panel');
    const closeBtn = makeEl('button', 'post-modal__close', '×');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', closeModal);

    const viewer = makeEl('div', 'post-modal__viewer');
    const track = makeEl('div', 'post-modal__track');
    track.tabIndex = 0;
    const prevBtn = makeEl('button', 'post-modal__nav post-modal__nav--prev', '‹');
    prevBtn.type = 'button';
    prevBtn.addEventListener('click', () => navigate(-1));
    const nextBtn = makeEl('button', 'post-modal__nav post-modal__nav--next', '›');
    nextBtn.type = 'button';
    nextBtn.addEventListener('click', () => navigate(1));
    const counter = makeEl('div', 'post-modal__counter', '1 / 1');

    viewer.appendChild(track);
    viewer.appendChild(prevBtn);
    viewer.appendChild(nextBtn);
    viewer.appendChild(counter);

    const info = makeEl('div', 'post-modal__info');
    panel.appendChild(closeBtn);
    panel.appendChild(viewer);
    panel.appendChild(info);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    track.addEventListener('scroll', () => {
      const idx = currentIndex();
      counter.textContent = `${idx + 1} / ${track.children.length}`;
      prevBtn.hidden = track.children.length <= 1;
      nextBtn.hidden = track.children.length <= 1;
    });

    document.addEventListener('keydown', (e) => {
      if (overlay.getAttribute('aria-hidden') === 'true') return;
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
    });

    activeModal = { overlay, panel, viewer, track, prevBtn, nextBtn, counter, info };
    return activeModal;
  }

  function currentIndex() {
    const m = activeModal;
    if (!m) return 0;
    const slide = m.track.querySelector('.post-modal__slide');
    if (!slide) return 0;
    return Math.round(m.track.scrollLeft / slide.getBoundingClientRect().width);
  }
  function navigate(delta) {
    const m = activeModal;
    if (!m) return;
    const slide = m.track.querySelector('.post-modal__slide');
    if (!slide) return;
    const slideW = slide.getBoundingClientRect().width;
    const idx = Math.max(0, Math.min(currentIndex() + delta, m.track.children.length - 1));
    m.track.scrollTo({ left: idx * slideW, behavior: 'smooth' });
  }

  function openModal(post) {
    const m = ensureModal();
    activePost = post;
    while (m.track.firstChild) m.track.removeChild(m.track.firstChild);
    const images = (post.images && post.images.length) ? post.images : (post.image ? [post.image] : []);
    images.forEach((src) => {
      const slide = makeEl('div', 'post-modal__slide');
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      slide.appendChild(img);
      m.track.appendChild(slide);
    });
    m.prevBtn.hidden = images.length <= 1;
    m.nextBtn.hidden = images.length <= 1;
    m.counter.hidden = images.length <= 1;
    m.counter.textContent = `1 / ${images.length}`;
    m.track.scrollLeft = 0;

    while (m.info.firstChild) m.info.removeChild(m.info.firstChild);
    const meta = makeEl('div', 'post-modal__meta');
    const tag = pickLang() === 'en' ? (post.tag_en || post.tag) : post.tag;
    const cat = categories[post.category];
    const catLabel = cat ? (pickLang() === 'en' ? cat.en : cat.ru) : '';
    if (catLabel) meta.appendChild(makeEl('span', 'post-modal__cat', catLabel));
    meta.appendChild(makeEl('span', 'post-modal__tag', tag || ''));
    meta.appendChild(makeEl('span', 'post-modal__date', fmtDate(post.date)));

    const reactions = makeEl('div', 'post-modal__reactions');
    const likeBtn = makeEl('button', 'reaction-btn reaction-btn--like');
    likeBtn.type = 'button';
    likeBtn.setAttribute('aria-pressed', 'false');
    const liked = isLiked(post.code || post.url);
    if (liked) likeBtn.classList.add('is-on');
    const likeIcon = makeEl('span', 'reaction-btn__icon', liked ? '❤' : '♡');
    const likeLabel = makeEl('span', 'reaction-btn__label', t(liked ? 'liked' : 'like'));
    likeBtn.appendChild(likeIcon);
    likeBtn.appendChild(likeLabel);
    likeBtn.addEventListener('click', () => {
      const key = post.code || post.url;
      const nowLiked = toggleLiked(key);
      likeBtn.classList.toggle('is-on', nowLiked);
      likeBtn.setAttribute('aria-pressed', String(nowLiked));
      likeIcon.textContent = nowLiked ? '❤' : '♡';
      likeLabel.textContent = t(nowLiked ? 'liked' : 'like');
      const card = document.querySelector('.ig-card[data-post-id="' + key + '"]');
      if (card) {
        if (nowLiked && !card.classList.contains('ig-card--liked')) {
          card.classList.add('ig-card--liked');
          const heart = makeEl('span', 'ig-card__heart', '❤');
          heart.setAttribute('aria-hidden', 'true');
          card.appendChild(heart);
        } else if (!nowLiked) {
          card.classList.remove('ig-card--liked');
          const h = card.querySelector('.ig-card__heart');
          if (h) h.remove();
        }
      }
    });
    reactions.appendChild(likeBtn);

    const tgBtn = makeEl('a', 'reaction-btn reaction-btn--tg');
    tgBtn.href = tgCommentUrl(post);
    tgBtn.target = '_blank';
    tgBtn.rel = 'noopener';
    tgBtn.innerHTML = `<span class="reaction-btn__icon">💬</span><span class="reaction-btn__label">${t('discuss_tg')}</span>`;
    reactions.appendChild(tgBtn);

    const shareBtn = makeEl('a', 'reaction-btn reaction-btn--share');
    shareBtn.href = tgShareUrl(post);
    shareBtn.target = '_blank';
    shareBtn.rel = 'noopener';
    shareBtn.innerHTML = `<span class="reaction-btn__icon">↗</span><span class="reaction-btn__label">${t('share_tg')}</span>`;
    reactions.appendChild(shareBtn);

    const hint = makeEl('p', 'post-modal__react-hint');
    hint.textContent = t('like_hint');
    reactions.appendChild(hint);

    meta.appendChild(reactions);
    m.info.appendChild(meta);

    const cap = makeEl('p', 'post-modal__caption');
    cap.innerHTML = linkify(post.caption || '');
    m.info.appendChild(cap);

    const attr = makeEl('p', 'post-modal__attribution');
    attr.textContent = (pickLang() === 'en')
      ? 'Source: DIDO SPORT community archive'
      : 'Источник: архив сообщества ДИДО СПОРТ';
    m.info.appendChild(attr);

    m.overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('post-modal-open');
  }

  function closeModal() {
    if (!activeModal) return;
    activeModal.overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('post-modal-open');
    setTimeout(() => {
      if (activeModal && activeModal.overlay.getAttribute('aria-hidden') === 'true') {
        while (activeModal.track.firstChild) activeModal.track.removeChild(activeModal.track.firstChild);
        activePost = null;
      }
    }, 260);
  }

  // ============ TICKER + NAV BINDING ============
  function bindTicker() {
    document.querySelectorAll('.ticker__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        if (cat && categories[cat]) {
          applyFilter(cat, true);
        }
      });
    });
  }

  // ============ BOOTSTRAP ============
  function bootstrap() {
    const sections = document.getElementById('sections-grid');
    const filters = document.getElementById('feed-filters');
    const grid = document.getElementById('ig-grid');
    const loader = document.getElementById('ig-loader');
    if (!grid) return;
    if (!sections || !filters) return;

    Promise.all([
      fetch('categories.json').then((r) => r.ok ? r.json() : {}),
      fetch('feed-data.json').then((r) => r.ok ? r.json() : []),
    ]).then(([cats, posts]) => {
      categories = cats || {};
      allPosts = Array.isArray(posts) ? posts : [];

      renderLatest();
      renderSections();
      renderFilters();
      bindTicker();
      applyFilter(readFilterFromHash(), false);
      initHelp();
      initContactForm();
      if (loader) loader.hidden = true;
    }).catch((err) => {
      console.warn('feed load failed', err);
      if (loader) loader.hidden = true;
      initHelp();
      initContactForm();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  // React to language change — rebuild sections, filters, feed, latest; refresh modal if open.
  document.addEventListener('langchange', () => {
    if (!categories || !allPosts.length) return;
    renderLatest();
    renderSections();
    renderFilters();
    renderFeed();
    if (activePost && activeModal && activeModal.overlay.getAttribute('aria-hidden') === 'false') {
      openModal(activePost);
    }
  });

  // React to hash change (back/forward, manual edit)
  window.addEventListener('hashchange', () => {
    applyFilter(readFilterFromHash(), false);
  });

  // ============ HELP: copy card number ============
  function initHelpCopy() {
    document.querySelectorAll('.help__copy').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.getAttribute('data-copy') || '';
        try {
          await navigator.clipboard.writeText(text);
        } catch (e) {
          // Fallback: temp textarea
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (_) {}
          ta.remove();
        }
        const original = btn.querySelector('[data-i18n]');
        const spanText = original ? original.textContent : '';
        btn.classList.add('is-done');
        if (original) original.textContent = pickLang() === 'en' ? 'Copied ✓' : 'Скопировано ✓';
        setTimeout(() => {
          btn.classList.remove('is-done');
          if (original && spanText) original.textContent = spanText;
        }, 1800);
      });
    });
  }

  // ============ HELP: Sberbank deep-link ============
  function initHelpSberbank() {
    const btn = document.getElementById('help-pay-btn');
    if (!btn) return;
    const isMobile = /iPhone|iPad|iPod|Android|Mobile|Tablet/i.test(navigator.userAgent);
    if (isMobile) {
      // Prefer Sberbank app deep link; falls back to web URL if app not installed
      btn.setAttribute('href', 'sberbankonline://');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Try opening the app; if not installed, browser will not handle it
        const start = Date.now();
        const appUrl = 'sberbankonline://';
        const webUrl = 'https://online.sberbank.ru/CSAFront/payment.do?templateId=transferByPhone';
        window.location.href = appUrl;
        setTimeout(() => {
          // If still on page after 1.5s, app didn't open — go to web
          if (Date.now() - start < 1500 && document.hasFocus()) {
            window.open(webUrl, '_blank', 'noopener');
          }
        }, 1500);
      });
    }
    // Desktop: keep the web URL from the HTML
  }

  function initHelp() {
    initHelpCopy();
    initHelpSberbank();
  }

  // ============ CONTACT: send to Telegram ============
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const msg = (data.get('message') || '').toString().trim();
      const salutation = pickLang() === 'en' ? 'Hello, DIDO SPORT team!' : 'Здравствуйте, команда ДИДО СПОРТ!';
      const fromLine = name ? (pickLang() === 'en' ? `\n\nFrom: ${name}` : `\n\nОт: ${name}`) : '';
      const full = msg ? `${salutation}\n\n${msg}${fromLine}` : salutation + fromLine;
      const url = 'https://t.me/didosport05?text=' + encodeURIComponent(full);
      window.open(url, '_blank', 'noopener');
    });
  }
})();
