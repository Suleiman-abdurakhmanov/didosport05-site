/* Post modal — feed.js (index.html) + archive.js (archive.html)
 * v2: native likes (emoji), native comments, share-everywhere, no Instagram.
 */
(function () {
  'use strict';

  const API_BASE = '/api'; // same-origin через nginx proxy_pass
  const EMOJIS = ['❤', '🔥', '👏', '💪', '🥊'];
  const SHARE_TARGETS = [
    { id: 'telegram', label: 'Telegram', build: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, icon: '✈' },
    { id: 'whatsapp', label: 'WhatsApp', build: (url, title) => `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, icon: '💬' },
    { id: 'vk', label: 'ВКонтакте', build: (url, title) => `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, icon: 'VK' },
    { id: 'max', label: 'MAX', build: (url, title) => `https://max.ru/share?url=${encodeURIComponent(url)}`, icon: 'M' },
    { id: 'copy', label: 'Скопировать ссылку', build: () => null, icon: '⎘', action: 'copy' },
  ];

  const modalLabels = {
    ru: {
      close: 'Закрыть', prev: 'Предыдущее фото', next: 'Следующее фото', carousel: 'Карусель', video: 'Видео',
      like_pick: 'Выберите реакцию',
      liked_one: 'оценил', liked_many: 'оценили',
      comments: 'Комментарии', comments_empty: 'Будь первым — оставь комментарий',
      your_name: 'Ваше имя', placeholder: 'Напишите что-нибудь…', send: 'Отправить', sending: 'Отправляем…',
      share: 'Поделиться', share_everywhere: 'Поделиться публикацией',
      likes: 'Реакции', like_count: 'реакций',
    },
    en: {
      close: 'Close', prev: 'Previous photo', next: 'Next photo', carousel: 'Carousel', video: 'Video',
      like_pick: 'Pick a reaction',
      liked_one: 'reacted', liked_many: 'reacted',
      comments: 'Comments', comments_empty: 'Be the first to comment',
      your_name: 'Your name', placeholder: 'Say something…', send: 'Send', sending: 'Sending…',
      share: 'Share', share_everywhere: 'Share this post',
      likes: 'Reactions', like_count: 'reactions',
    },
  };

  const monthsRu = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const monthsEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const UID_KEY = 'dido_uid_v2';
  const LIKES_LS_KEY = 'dido_likes_v2';     // { [code]: [emoji,...] }
  const COUNTS_LS_KEY = 'dido_counts_v2';   // { [code]: { total, byEmoji } }
  const COMMENTS_LS_KEY = 'dido_comments_v2'; // { [code]: [{id,author,text,ts}] }

  let categories = {};
  let activeModal = null;
  let activeList = [];
  let activeIdx = 0;
  let activePost = null;

  // -------- utils --------
  function pickLang() {
    return (window.__i18n && window.__i18n.lang) || localStorage.getItem('dido_lang') || 'ru';
  }
  function ml(k) { return (modalLabels[pickLang()] || modalLabels.ru)[k] || k; }
  function makeEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, (c) => ({'&':'&','<':'<','>':'>','"':'"',"'":'''}[c]));
  }
  function linkify(text) {
    if (!text) return '';
    return escapeHtml(text)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/@([a-z0-9._]+)/gi, '<a href="https://www.instagram.com/$1" target="_blank" rel="noopener">@$1</a>')
      .replace(/#([a-zа-яё0-9_]+)/gi, '<a href="https://www.instagram.com/explore/tags/$1" target="_blank" rel="noopener">#$1</a>')
      .replace(/\n/g, '<br>');
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return iso;
    const [y, m, d] = parts;
    return pickLang() === 'en' ? `${monthsEn[m-1]} ${d}, ${y}` : `${d} ${monthsRu[m-1]} ${y}`;
  }
  function ago(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'только что';
    const m = Math.floor(s / 60); if (m < 60) return `${m} мин`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} ч`;
    const d = Math.floor(h / 24); if (d < 30) return `${d} дн`;
    return new Date(ts).toLocaleDateString('ru-RU');
  }

  // -------- UID (persistent browser ID) --------
  function getUid() {
    let u = localStorage.getItem(UID_KEY);
    if (!u) {
      const buf = new Uint8Array(12);
      (window.crypto || window.msCrypto).getRandomValues(buf);
      u = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(UID_KEY, u);
    }
    return u;
  }

  // -------- local caches --------
  function lsGet(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch (e) { return def; } }
  function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  function getUserEmojis(code) { const m = lsGet(LIKES_LS_KEY, {}); return m[code] || []; }
  function setUserEmojis(code, arr) { const m = lsGet(LIKES_LS_KEY, {}); m[code] = arr; lsSet(LIKES_LS_KEY, m); }
  function getCounts(code) { const m = lsGet(COUNTS_LS_KEY, {}); return m[code] || { total: 0, byEmoji: {} }; }
  function setCounts(code, val) { const m = lsGet(COUNTS_LS_KEY, {}); m[code] = val; lsSet(COUNTS_LS_KEY, m); }
  function getComments(code) { const m = lsGet(COMMENTS_LS_KEY, {}); return m[code] || []; }
  function setCommentsLS(code, arr) { const m = lsGet(COMMENTS_LS_KEY, {}); m[code] = arr; lsSet(COMMENTS_LS_KEY, m); }

  // -------- API --------
  function apiHeaders() {
    return { 'Content-Type': 'application/json', 'X-Dido-UID': getUid() };
  }
  async function apiPost(path, body) {
    try {
      const r = await fetch(API_BASE + path, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
      return await r.json();
    } catch (e) { return { error: 'network' }; }
  }
  async function apiGet(path) {
    try {
      const r = await fetch(API_BASE + path, { headers: apiHeaders() });
      return await r.json();
    } catch (e) { return null; }
  }

  // -------- Modal scaffold --------
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
    closeBtn.setAttribute('aria-label', ml('close'));
    closeBtn.addEventListener('click', closeModal);

    const viewer = makeEl('div', 'post-modal__viewer');
    const track = makeEl('div', 'post-modal__track');
    track.tabIndex = 0;
    const prevBtn = makeEl('button', 'post-modal__nav post-modal__nav--prev', '‹');
    prevBtn.type = 'button';
    prevBtn.setAttribute('aria-label', ml('prev'));
    prevBtn.addEventListener('click', () => navigate(-1));
    const nextBtn = makeEl('button', 'post-modal__nav post-modal__nav--next', '›');
    nextBtn.type = 'button';
    nextBtn.setAttribute('aria-label', ml('next'));
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
      const total = track.children.length;
      counter.textContent = `${idx + 1} / ${total}`;
      prevBtn.hidden = total <= 1;
      nextBtn.hidden = total <= 1;
      counter.hidden = total <= 1;
      activeIdx = idx;
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
    const total = m.track.children.length;
    const idx = Math.max(0, Math.min(currentIndex() + delta, total - 1));
    m.track.scrollTo({ left: idx * slideW, behavior: 'smooth' });
  }
  function closeModal() {
    const m = activeModal;
    if (!m) return;
    m.overlay.setAttribute('aria-hidden', 'true');
    m.overlay.classList.remove('post-modal--open');
    document.body.classList.remove('post-modal-open');
    activePost = null;
  }

  // -------- Emoji picker --------
  function buildEmojiPicker(m, code, onChange) {
    const wrap = makeEl('div', 'reaction-picker');
    const label = makeEl('div', 'reaction-picker__label', ml('like_pick'));
    wrap.appendChild(label);
    const row = makeEl('div', 'reaction-picker__row');
    wrap.appendChild(row);

    const counts = getCounts(code);
    const userEmojis = getUserEmojis(code);

    EMOJIS.forEach(emoji => {
      const btn = makeEl('button', 'reaction-picker__btn');
      btn.type = 'button';
      if (userEmojis.includes(emoji)) btn.classList.add('is-on');
      const eIcon = makeEl('span', 'reaction-picker__emoji', emoji);
      const eCnt = makeEl('span', 'reaction-picker__cnt', counts.byEmoji[emoji] || '');
      btn.appendChild(eIcon);
      btn.appendChild(eCnt);
      btn.addEventListener('click', async () => {
        const has = getUserEmojis(code).includes(emoji);
        const next = has ? getUserEmojis(code).filter(e => e !== emoji) : [...getUserEmojis(code), emoji];
        setUserEmojis(code, next);
        // optimistic UI
        btn.classList.toggle('is-on', !has);
        eCnt.textContent = (parseInt(eCnt.textContent || '0', 10) + (has ? -1 : 1)) || '';
        // server
        const r = await apiPost('/like', { code, emoji, action: has ? 'off' : 'on' });
        if (r && r.likes) {
          setCounts(code, r.likes);
          renderCounts(code);
          renderUserEmojis(code);
        }
        if (typeof onChange === 'function') onChange();
      });
      row.appendChild(btn);
    });
    return wrap;
  }

  function renderCounts(code) {
    const m = activeModal; if (!m) return;
    const counts = getCounts(code);
    const totalEl = m.info.querySelector('.reaction-summary__total');
    if (totalEl) totalEl.textContent = counts.total || '';
    // per-emoji numbers
    m.info.querySelectorAll('.reaction-picker__btn').forEach((btn) => {
      const emoji = btn.querySelector('.reaction-picker__emoji');
      if (!emoji) return;
      const cnt = btn.querySelector('.reaction-picker__cnt');
      cnt.textContent = counts.byEmoji[emoji.textContent] || '';
    });
  }
  function renderUserEmojis(code) {
    const m = activeModal; if (!m) return;
    const userEmojis = getUserEmojis(code);
    m.info.querySelectorAll('.reaction-picker__btn').forEach((btn) => {
      const emoji = btn.querySelector('.reaction-picker__emoji');
      if (!emoji) return;
      btn.classList.toggle('is-on', userEmojis.includes(emoji.textContent));
    });
  }

  // -------- Comments --------
  function buildComments(m, code) {
    const wrap = makeEl('div', 'comments');
    const title = makeEl('h3', 'comments__title', ml('comments'));
    wrap.appendChild(title);

    const list = makeEl('div', 'comments__list');
    wrap.appendChild(list);

    const render = () => {
      while (list.firstChild) list.removeChild(list.firstChild);
      const items = getComments(code);
      if (items.length === 0) {
        list.appendChild(makeEl('p', 'comments__empty', ml('comments_empty')));
      } else {
        items.forEach((c) => {
          const card = makeEl('div', 'comment');
          const head = makeEl('div', 'comment__head');
          head.appendChild(makeEl('span', 'comment__author', c.author));
          head.appendChild(makeEl('span', 'comment__time', ago(c.ts)));
          card.appendChild(head);
          const body = makeEl('div', 'comment__body');
          body.innerHTML = linkify(c.text);
          card.appendChild(body);
          list.appendChild(card);
        });
      }
    };
    render();

    // Form
    const form = makeEl('form', 'comments__form');
    form.autocomplete = 'off';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'name';
    nameInput.placeholder = ml('your_name');
    nameInput.maxLength = 40;
    nameInput.required = true;
    nameInput.className = 'comments__name';

    const txtInput = document.createElement('textarea');
    txtInput.name = 'text';
    txtInput.placeholder = ml('placeholder');
    txtInput.maxLength = 800;
    txtInput.required = true;
    txtInput.rows = 2;
    txtInput.className = 'comments__text';

    const sendBtn = makeEl('button', 'comments__send', ml('send'));
    sendBtn.type = 'submit';
    form.appendChild(nameInput);
    form.appendChild(txtInput);
    form.appendChild(sendBtn);
    wrap.appendChild(form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = nameInput.value.trim();
      const text = txtInput.value.trim();
      if (!author || !text) return;
      const prevLabel = sendBtn.textContent;
      sendBtn.disabled = true; sendBtn.textContent = ml('sending');
      const r = await apiPost('/comment', { code, author, text });
      sendBtn.disabled = false; sendBtn.textContent = prevLabel;
      if (r && r.id) {
        const arr = getComments(code);
        arr.unshift({ id: r.id, author: r.author, text: r.text, ts: r.ts });
        setCommentsLS(code, arr);
        // Remember author name
        try { localStorage.setItem('dido_comment_name', author); } catch (e) {}
        txtInput.value = '';
        render();
      } else if (r && r.error) {
        alert('Не отправилось: ' + r.error);
      }
    });

    // prefill name
    try { const prev = localStorage.getItem('dido_comment_name'); if (prev) nameInput.value = prev; } catch (e) {}

    wrap.dataset.code = code;
    return wrap;
  }

  function refreshComments(code) {
    const m = activeModal; if (!m) return;
    const wrap = m.info.querySelector('.comments');
    if (!wrap) return;
    // Re-render list from server
    apiGet('/comments?code=' + encodeURIComponent(code)).then((r) => {
      if (r && Array.isArray(r.comments)) {
        setCommentsLS(code, r.comments);
        const list = wrap.querySelector('.comments__list');
        if (list) {
          while (list.firstChild) list.removeChild(list.firstChild);
          if (r.comments.length === 0) {
            list.appendChild(makeEl('p', 'comments__empty', ml('comments_empty')));
          } else {
            r.comments.forEach((c) => {
              const card = makeEl('div', 'comment');
              const head = makeEl('div', 'comment__head');
              head.appendChild(makeEl('span', 'comment__author', c.author));
              head.appendChild(makeEl('span', 'comment__time', ago(c.ts)));
              card.appendChild(head);
              const body = makeEl('div', 'comment__body');
              body.innerHTML = linkify(c.text);
              card.appendChild(body);
              list.appendChild(card);
            });
          }
        }
      }
    });
  }

  // -------- Share menu --------
  function buildShareMenu(m, post) {
    const wrap = makeEl('div', 'share-menu');
    const btn = makeEl('button', 'reaction-btn reaction-btn--share');
    btn.type = 'button';
    btn.innerHTML = `<span class="reaction-btn__icon">↗</span><span class="reaction-btn__label">${ml('share')}</span>`;
    wrap.appendChild(btn);

    const pop = makeEl('div', 'share-menu__pop');
    pop.setAttribute('role', 'menu');
    const lang = pickLang();
    const title = (post.title || '').slice(0, 80) || 'DiDo Sport';
    const url = window.location.origin + '/?p=' + encodeURIComponent(post.code || '');

    SHARE_TARGETS.forEach(t => {
      const item = makeEl('button', 'share-menu__item');
      item.type = 'button';
      item.innerHTML = `<span class="share-menu__icon">${t.icon}</span><span class="share-menu__label">${t.label}</span>`;
      item.addEventListener('click', async () => {
        pop.classList.remove('is-open');
        if (t.id === 'copy') {
          try {
            await navigator.clipboard.writeText(url);
            const old = item.querySelector('.share-menu__label').textContent;
            item.querySelector('.share-menu__label').textContent = '✓ Скопировано';
            setTimeout(() => { item.querySelector('.share-menu__label').textContent = old; }, 1500);
          } catch (e) {}
          return;
        }
        const shareUrl = t.build(url, title);
        if (shareUrl) window.open(shareUrl, '_blank', 'noopener');
      });
      pop.appendChild(item);
    });
    wrap.appendChild(pop);

    btn.addEventListener('click', async () => {
      // Web Share API first
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        try {
          await navigator.share({ title, text: title, url });
          return;
        } catch (e) { /* fallthrough to menu */ }
      }
      pop.classList.toggle('is-open');
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) pop.classList.remove('is-open');
    });
    return wrap;
  }

  // -------- Render post into modal --------
  function renderPost(m, post) {
    activePost = post;
    while (m.track.firstChild) m.track.removeChild(m.track.firstChild);
    const images = (post.images && post.images.length) ? post.images : (post.image ? [post.image] : []);
    images.forEach((src) => {
      const slide = makeEl('div', 'post-modal__slide');
      const img = document.createElement('img');
      img.src = src; img.alt = ''; img.loading = 'lazy';
      slide.appendChild(img);
      m.track.appendChild(slide);
    });
    m.prevBtn.hidden = images.length <= 1;
    m.nextBtn.hidden = images.length <= 1;
    m.counter.hidden = images.length <= 1;
    m.counter.textContent = `1 / ${images.length}`;
    m.track.scrollLeft = 0;

    while (m.info.firstChild) m.info.removeChild(m.info.firstChild);

    // Header: tag + date
    const meta = makeEl('div', 'post-modal__meta');
    const tag = pickLang() === 'en' ? (post.tag_en || post.tag) : post.tag;
    const cat = categories[post.category];
    const lang = pickLang();
    const catLabel = cat ? (lang === 'en' ? cat.en : cat.ru) : '';
    if (catLabel) meta.appendChild(makeEl('span', 'post-modal__cat', catLabel));
    meta.appendChild(makeEl('span', 'post-modal__tag', tag || ''));
    meta.appendChild(makeEl('span', 'post-modal__date', fmtDate(post.date)));
    m.info.appendChild(meta);

    // Title (if present, from archive)
    if (post.title) {
      const h = makeEl('h2', 'post-modal__title');
      h.textContent = post.title;
      m.info.appendChild(h);
    }

    // Caption (full text — never truncate)
    const cap = makeEl('div', 'post-modal__caption');
    cap.innerHTML = linkify(post.caption || '');
    m.info.appendChild(cap);

    // Reactions: emoji picker + total + share
    const reactions = makeEl('div', 'post-modal__reactions');
    const summary = makeEl('div', 'reaction-summary');
    const totalEl = makeEl('span', 'reaction-summary__total', '');
    summary.appendChild(totalEl);
    summary.appendChild(makeEl('span', 'reaction-summary__label', ml('likes')));
    reactions.appendChild(summary);
    reactions.appendChild(buildEmojiPicker(m, post.code || post.url));
    reactions.appendChild(buildShareMenu(m, post));
    m.info.appendChild(reactions);

    // Comments block
    m.info.appendChild(buildComments(m, post.code || post.url));

    // Refresh counts and comments from server
    const code = post.code || post.url;
    renderCounts(code);
    apiGet('/post?code=' + encodeURIComponent(code)).then((r) => {
      if (r && r.likes) { setCounts(code, r.likes); renderCounts(code); }
      if (r && Array.isArray(r.comments)) {
        setCommentsLS(code, r.comments);
        refreshComments(code);
      } else {
        refreshComments(code);
      }
    });

    // Scroll info to top when opening a new post
    m.info.scrollTop = 0;
  }

  function openModal(post, list, idx) {
    const m = ensureModal();
    activeList = list || [post];
    activeIdx = idx || 0;
    renderPost(m, post);
    m.overlay.setAttribute('aria-hidden', 'false');
    m.overlay.classList.add('post-modal--open');
    document.body.classList.add('post-modal-open');
  }

  window.openPostModal = function (post, list, idx) {
    openModal(post, list, idx);
  };

  // categories for labels
  fetch('categories.json', { cache: 'no-cache' })
    .then((r) => r.ok ? r.json() : {})
    .then((data) => { categories = data || {}; })
    .catch(() => { categories = {}; });
})();
