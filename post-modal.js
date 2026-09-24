/* Post modal — Instagram-style для didosport05.ru
 * v3: карусель медиа, "ещё" для caption, лайк/коммент/поделиться/сохранить как в Instagram
 */
(function () {
  'use strict';

  const API_BASE = '/api';
  const SHARE_TARGETS = [
    { id: 'telegram', label: 'Telegram', build: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, icon: '✈' },
    { id: 'whatsapp', label: 'WhatsApp', build: (url, title) => `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, icon: '💬' },
    { id: 'vk', label: 'ВКонтакте', build: (url, title) => `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, icon: 'VK' },
    { id: 'max', label: 'MAX', build: (url, title) => `https://max.ru/share?url=${encodeURIComponent(url)}`, icon: 'M' },
    { id: 'copy', label: 'Скопировать ссылку', build: () => null, icon: '⎘', action: 'copy' },
  ];

  const labels = {
    ru: {
      close: 'Закрыть', prev: 'Предыдущее фото', next: 'Следующее фото',
      prev_post: 'Предыдущая публикация', next_post: 'Следующая публикация',
      liked: 'Нравится', like: 'Нравится',
      liked_label: 'Понравилось', unliked_label: 'Нравится',
      comments: 'Комментарии',
      your_name: 'Ваше имя', placeholder: 'Напишите что-нибудь…',
      send: 'Опубликовать', sending: 'Отправляем…',
      share: 'Поделиться',
      save: 'Сохранить', unsave: 'Убрать из сохранённых',
      more: 'ещё', less: 'свернуть',
      views: 'просмотров',
      liked_by: 'Нравится',
    },
    en: {
      close: 'Close', prev: 'Previous photo', next: 'Next photo',
      prev_post: 'Previous post', next_post: 'Next post',
      liked: 'Like', like: 'Like',
      liked_label: 'Liked', unliked_label: 'Like',
      comments: 'Comments',
      your_name: 'Your name', placeholder: 'Say something…',
      send: 'Post', sending: 'Sending…',
      share: 'Share',
      save: 'Save', unsave: 'Remove from saved',
      more: 'more', less: 'less',
      views: 'views',
      liked_by: 'Liked by',
    },
  };

  const monthsRu = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const monthsEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const UID_KEY = 'dido_uid_v3';
  const LIKES_LS_KEY = 'dido_likes_v3';     // { [code]: [emoji,...] }
  const COUNTS_LS_KEY = 'dido_counts_v3';
  const COMMENTS_LS_KEY = 'dido_comments_v3';
  const SAVED_LS_KEY = 'dido_saved_v3';

  let categories = {};
  let activeModal = null;
  let activeList = [];
  let activeIdx = 0;
  let activePost = null;
  let categoriesLoaded = false;

  // -------- utils --------
  function pickLang() {
    return (window.__i18n && window.__i18n.lang) || localStorage.getItem('dido_lang') || 'ru';
  }
  function t(k) { return (labels[pickLang()] || labels.ru)[k] || k; }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function linkify(text) {
    if (!text) return '';
    return escapeHtml(text)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/@([a-z0-9._]+)/gi, '<a href="https://www.instagram.com/$1" target="_blank" rel="noopener">@$1</a>')
      .replace(/#([a-zа-яё0-9_]+)/gi, '<a href="https://www.instagram.com/explore/tags/$1" target="_blank" rel="noopener">#$1</a>')
      .replace(/\n/g, '<br>');
  }
  function fmtDateFull(iso) {
    if (!iso) return '';
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return iso;
    const [y, m, d] = parts;
    return pickLang() === 'en' ? `${monthsEn[m-1]} ${d}, ${y}` : `${d} ${monthsRu[m-1]} ${y}`;
  }
  function fmtDateShort(iso) {
    if (!iso) return '';
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return iso;
    const [y, m, d] = parts;
    return pickLang() === 'en' ? `${monthsEn[m-1]} ${d}` : `${d} ${monthsRu[m-1]}`;
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
  function isSaved(code) { const m = lsGet(SAVED_LS_KEY, []); return m.includes(code); }
  function setSaved(code, saved) {
    const m = lsGet(SAVED_LS_KEY, []);
    const i = m.indexOf(code);
    if (saved && i < 0) m.push(code);
    if (!saved && i >= 0) m.splice(i, 1);
    lsSet(SAVED_LS_KEY, m);
  }

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

  // -------- Modal scaffold (Instagram-style: media left, info right on desktop; stacked on mobile) --------
  function ensureModal() {
    if (activeModal) return activeModal;
    const overlay = el('div', 'post-modal');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const panel = el('div', 'post-modal__panel');

    // Viewer (left)
    const viewer = el('div', 'post-modal__viewer');
    const closeBtn = el('button', 'post-modal__close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', t('close'));
    closeBtn.addEventListener('click', closeModal);

    const track = el('div', 'post-modal__track');
    track.tabIndex = 0;
    const prevBtn = el('button', 'post-modal__nav post-modal__nav--prev', '‹');
    prevBtn.type = 'button';
    prevBtn.setAttribute('aria-label', t('prev'));
    prevBtn.addEventListener('click', () => navigate(-1));
    const nextBtn = el('button', 'post-modal__nav post-modal__nav--next', '›');
    nextBtn.type = 'button';
    nextBtn.setAttribute('aria-label', t('next'));
    nextBtn.addEventListener('click', () => navigate(1));
    const counter = el('div', 'post-modal__counter', '1/1');

    viewer.appendChild(closeBtn);
    viewer.appendChild(track);
    viewer.appendChild(prevBtn);
    viewer.appendChild(nextBtn);
    viewer.appendChild(counter);

    // Info (right side panel)
    const info = el('div', 'post-modal__info');

    panel.appendChild(viewer);
    panel.appendChild(info);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Track scroll → update counter
    track.addEventListener('scroll', () => {
      const m = activeModal;
      if (!m) return;
      const idx = currentIndex();
      const total = m.track.children.length;
      m.counter.textContent = `${idx + 1}/${total}`;
      prevBtn.hidden = total <= 1;
      nextBtn.hidden = total <= 1;
      counter.hidden = total <= 1;
      activeIdx = idx;
    });

    // Touch swipe
    let touchStartX = 0;
    track.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) navigate(dx > 0 ? -1 : 1);
    }, { passive: true });

    // Keyboard
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

  // -------- Author header (Instagram: avatar + username + ⋯) --------
  function buildAuthorHeader(post) {
    const head = el('div', 'post-modal__author');
    const avatar = el('div', 'post-modal__avatar');
    avatar.textContent = 'ДС';
    const name = el('div', 'post-modal__name');
    const nameA = document.createElement('a');
    nameA.href = '/';
    nameA.textContent = 'didosport05';
    name.appendChild(nameA);
    const loc = el('div', 'post-modal__loc', post.location || '');
    head.appendChild(avatar);
    head.appendChild(name);
    if (post.location) head.appendChild(loc);
    return head;
  }

  // -------- Caption with "ещё" (collapsible) --------
  function buildCaption(post) {
    const wrap = el('div', 'post-modal__caption');
    const text = post.caption || '';
    wrap.innerHTML = linkify(text);
    // Apply clamp + "ещё"
    requestAnimationFrame(() => {
      if (wrap.scrollHeight > wrap.clientHeight + 4) {
        wrap.classList.add('is-clamped');
        const more = el('button', 'post-modal__more', '... ' + t('more'));
        more.type = 'button';
        more.addEventListener('click', () => {
          wrap.classList.remove('is-clamped');
          more.style.display = 'none';
        });
        wrap.parentNode.insertBefore(more, wrap.nextSibling);
      }
    });
    return wrap;
  }

  // -------- Action bar (Instagram: ❤ 💬 ↗ 🔖) --------
  function buildActionBar(m, post) {
    const bar = el('div', 'post-modal__actions');
    const code = post.code || post.url;
    const userEmojis = getUserEmojis(code);
    const liked = userEmojis.includes('❤');
    const counts = getCounts(code);
    const heartCount = (counts.byEmoji && counts.byEmoji['❤']) || post.likes || 0;
    const saved = isSaved(code);

    // Like button (❤ / 🤍)
    const heartBtn = el('button', 'post-modal__action post-modal__action--heart' + (liked ? ' is-on' : ''));
    heartBtn.type = 'button';
    heartBtn.setAttribute('aria-label', liked ? t('liked_label') : t('unliked_label'));
    heartBtn.innerHTML = liked
      ? '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="#ed4956" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#262626" stroke-width="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
    heartBtn.addEventListener('click', async () => {
      const wasLiked = heartBtn.classList.contains('is-on');
      const newState = !wasLiked;
      heartBtn.classList.toggle('is-on', newState);
      // Toggle heart icon
      heartBtn.innerHTML = newState
        ? '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="#ed4956" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#262626" stroke-width="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
      // Update local
      const u = getUserEmojis(code);
      const nu = u.includes('❤') ? u.filter(x => x !== '❤') : [...u, '❤'];
      setUserEmojis(code, nu);
      // Optimistic count
      const c = getCounts(code);
      c.byEmoji = c.byEmoji || {};
      c.byEmoji['❤'] = Math.max(0, (c.byEmoji['❤'] || 0) + (newState ? 1 : -1));
      c.total = Math.max(0, (c.total || 0) + (newState ? 1 : -1));
      setCounts(code, c);
      // Update like count text
      updateLikeCount(m, c, post);
      // Server
      const r = await apiPost('/like', { code, emoji: '❤', action: newState ? 'on' : 'off' });
      if (r && r.likes) { setCounts(code, r.likes); updateLikeCount(m, r.likes, post); }
    });
    bar.appendChild(heartBtn);

    // Comment button (💬 → scrolls to comment form)
    const commentBtn = el('button', 'post-modal__action post-modal__action--comment');
    commentBtn.type = 'button';
    commentBtn.setAttribute('aria-label', t('comments'));
    commentBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#262626" stroke-width="1.5"><path d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z"/></svg>';
    commentBtn.addEventListener('click', () => {
      const form = m.info.querySelector('.comments__text');
      if (form) { form.focus(); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
    bar.appendChild(commentBtn);

    // Share button (↗)
    const shareBtn = el('button', 'post-modal__action post-modal__action--share');
    shareBtn.type = 'button';
    shareBtn.setAttribute('aria-label', t('share'));
    shareBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#262626" stroke-width="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = m.info.querySelector('.share-menu__pop');
      if (pop) pop.classList.toggle('is-open');
    });
    bar.appendChild(shareBtn);

    // Spacer to push save button right
    const spacer = el('div', 'post-modal__actions-spacer');
    bar.appendChild(spacer);

    // Save button (🔖)
    const saveBtn = el('button', 'post-modal__action post-modal__action--save' + (saved ? ' is-on' : ''));
    saveBtn.type = 'button';
    saveBtn.setAttribute('aria-label', saved ? t('unsave') : t('save'));
    saveBtn.innerHTML = saved
      ? '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="#262626" d="M20 22l-8-6.5L4 22V4a1 1 0 011-1h14a1 1 0 011 1v18z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#262626" stroke-width="1.5"><path d="M20 22l-8-6.5L4 22V4a1 1 0 011-1h14a1 1 0 011 1v18z"/></svg>';
    saveBtn.addEventListener('click', () => {
      const wasSaved = saveBtn.classList.contains('is-on');
      const newSaved = !wasSaved;
      saveBtn.classList.toggle('is-on', newSaved);
      saveBtn.innerHTML = newSaved
        ? '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="#262626" d="M20 22l-8-6.5L4 22V4a1 1 0 011-1h14a1 1 0 011 1v18z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#262626" stroke-width="1.5"><path d="M20 22l-8-6.5L4 22V4a1 1 0 011-1h14a1 1 0 011 1v18z"/></svg>';
      setSaved(code, newSaved);
    });
    bar.appendChild(saveBtn);

    return bar;
  }

  function updateLikeCount(m, counts, post) {
    const totalEl = m.info.querySelector('.post-modal__like-count');
    if (!totalEl) return;
    const total = (counts && counts.total) || (post && post.likes) || 0;
    if (total > 0) {
      totalEl.textContent = formatCount(total) + ' ' + pluralLikes(total);
      totalEl.style.display = '';
    } else {
      totalEl.textContent = '';
      totalEl.style.display = 'none';
    }
  }

  function pluralLikes(n) {
    const lang = pickLang();
    if (lang === 'en') {
      return n === 1 ? 'like' : 'likes';
    }
    // Russian: 1 отметка, 2-4 отметки, 5-20 отметок, 21 отметка, ...
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return 'отметка «Нравится»';
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'отметки «Нравится»';
    return 'отметок «Нравится»';
  }

  function formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + ' млн';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + ' тыс.';
    return String(n);
  }

  // -------- Video autoplay helper (mobile-friendly) --------
  function setupVideoAutoplay(m) {
    const videos = m.track.querySelectorAll('video');
    if (!videos.length) return;

    videos.forEach((v) => {
      v.muted = false;
      v.playsInline = true;
      v.preload = 'auto';
      v.setAttribute('webkit-playsinline', 'true');
      v.style.background = '#000';

      // Try gentle autoplay (muted) — will be ignored by browser if blocked, controls remain usable
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    });
  }

  // -------- Share popover --------
  function buildSharePop(m, post) {
    const pop = el('div', 'share-menu__pop');
    pop.setAttribute('role', 'menu');
    const lang = pickLang();
    const title = (post.title || (post.caption || '').slice(0, 80) || 'DiDo Sport').slice(0, 80);
    const url = window.location.origin + '/?p=' + encodeURIComponent(post.code || '');
    SHARE_TARGETS.forEach(target => {
      const item = el('button', 'share-menu__item');
      item.type = 'button';
      item.innerHTML = `<span class="share-menu__icon">${target.icon}</span><span class="share-menu__label">${target.label}</span>`;
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        pop.classList.remove('is-open');
        if (target.id === 'copy') {
          try {
            await navigator.clipboard.writeText(url);
            const lab = item.querySelector('.share-menu__label');
            const old = lab.textContent;
            lab.textContent = '✓ Скопировано';
            setTimeout(() => { lab.textContent = old; }, 1500);
          } catch (e) {}
          return;
        }
        const shareUrl = target.build(url, title);
        if (shareUrl) window.open(shareUrl, '_blank', 'noopener');
      });
      pop.appendChild(item);
    });
    return pop;
  }

  // -------- Comments block (Instagram-style: list at bottom of right panel) --------
  function buildComments(m, code, post) {
    const wrap = el('div', 'comments');

    const list = el('div', 'comments__list');
    wrap.appendChild(list);

    const render = (items) => {
      while (list.firstChild) list.removeChild(list.firstChild);
      if (!items || items.length === 0) {
        // пусто — ничего не показываем
        return;
      }
      items.forEach((c) => {
        const card = el('div', 'comment');
        const head = el('div', 'comment__head');
        head.appendChild(makeLinkAvatar());
        const headTxt = el('div', 'comment__head-text');
        headTxt.appendChild(makeEl('span', 'comment__author', c.author));
        headTxt.appendChild(makeEl('span', 'comment__time', ago(c.ts)));
        head.appendChild(headTxt);
        card.appendChild(head);
        const body = el('div', 'comment__body');
        body.innerHTML = linkify(c.text);
        card.appendChild(body);
        list.appendChild(card);
      });
    };

    function makeLinkAvatar() {
      const a = el('div', 'comment__avatar');
      a.textContent = (c.author || '?').slice(0, 1).toUpperCase();
      return a;
    }
    function makeEl(tag, cls, text) { return el(tag, cls, text); }

    render(getComments(code));

    // Form
    const form = el('form', 'comments__form');
    form.autocomplete = 'off';
    const avatar = el('div', 'comments__form-avatar');
    avatar.textContent = 'Я';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'name';
    nameInput.placeholder = t('your_name');
    nameInput.maxLength = 40;
    nameInput.required = true;
    nameInput.className = 'comments__name';
    const txtInput = document.createElement('textarea');
    txtInput.name = 'text';
    txtInput.placeholder = t('placeholder');
    txtInput.maxLength = 800;
    txtInput.required = true;
    txtInput.rows = 1;
    txtInput.className = 'comments__text';
    const sendBtn = el('button', 'comments__send', t('send'));
    sendBtn.type = 'submit';

    form.appendChild(avatar);
    const fields = el('div', 'comments__form-fields');
    fields.appendChild(nameInput);
    fields.appendChild(txtInput);
    form.appendChild(fields);
    form.appendChild(sendBtn);
    wrap.appendChild(form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = nameInput.value.trim();
      const text = txtInput.value.trim();
      if (!author || !text) return;
      const prevLabel = sendBtn.textContent;
      sendBtn.disabled = true; sendBtn.textContent = t('sending');
      const r = await apiPost('/comment', { code, author, text });
      sendBtn.disabled = false; sendBtn.textContent = prevLabel;
      if (r && r.id) {
        const arr = getComments(code);
        arr.unshift({ id: r.id, author: r.author, text: r.text, ts: r.ts });
        setCommentsLS(code, arr);
        render(arr);
        txtInput.value = '';
        try { localStorage.setItem('dido_comment_name', author); } catch (e) {}
      } else if (r && r.error) {
        alert('Не отправилось: ' + r.error);
      }
    });

    try { const prev = localStorage.getItem('dido_comment_name'); if (prev) nameInput.value = prev; } catch (e) {}

    wrap.dataset.code = code;
    return wrap;
  }

  function refreshComments(code) {
    const m = activeModal; if (!m) return;
    apiGet('/comments?code=' + encodeURIComponent(code)).then((r) => {
      if (r && Array.isArray(r.comments)) {
        setCommentsLS(code, r.comments);
        const wrap = m.info.querySelector('.comments');
        if (wrap) {
          const list = wrap.querySelector('.comments__list');
          if (list) {
            while (list.firstChild) list.removeChild(list.firstChild);
            r.comments.forEach((c) => {
              const card = el('div', 'comment');
              const head = el('div', 'comment__head');
              const av = el('div', 'comment__avatar');
              av.textContent = c.author ? c.author[0].toUpperCase() : '?';
              head.appendChild(av);
              const ht = el('div', 'comment__head-text');
              ht.appendChild(el('span', 'comment__author', c.author));
              ht.appendChild(el('span', 'comment__time', ago(c.ts)));
              head.appendChild(ht);
              card.appendChild(head);
              const body = el('div', 'comment__body');
              body.innerHTML = linkify(c.text);
              card.appendChild(body);
              list.appendChild(card);
            });
          }
        }
      }
    });
  }

  // -------- Render post into modal --------
  function renderPost(m, post) {
    activePost = post;
    while (m.track.firstChild) m.track.removeChild(m.track.firstChild);
    const images = (post.images && post.images.length) ? post.images : (post.image ? [post.image] : []);
    if (images.length === 0) {
      // Placeholder (no image)
      const slide = el('div', 'post-modal__slide');
      const ph = el('div', 'post-modal__placeholder');
      ph.innerHTML = '<div class="post-modal__placeholder-icon">📷</div><div class="post-modal__placeholder-text">Без фото</div>';
      slide.appendChild(ph);
      m.track.appendChild(slide);
    } else {
      images.forEach((src, i) => {
        const slide = el('div', 'post-modal__slide');
        const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(src);
        if (isVideo) {
          const v = document.createElement('video');
          v.src = src;
          v.controls = true;
          v.playsInline = true;
          v.preload = 'auto';
          v.setAttribute('webkit-playsinline', 'true');
          v.muted = false;
          v.loop = false;
          v.style.width = '100%';
          v.style.height = '100%';
          v.style.objectFit = 'contain';
          v.style.cursor = 'pointer';

          // Click anywhere on video to play/pause
          v.addEventListener('click', (e) => {
            if (v.paused) {
              const p = v.play();
              if (p && typeof p.catch === 'function') p.catch(() => {});
            } else {
              v.pause();
            }
          });

          slide.appendChild(v);
        } else {
          const img = document.createElement('img');
          img.src = src; img.alt = ''; img.loading = i < 2 ? 'eager' : 'lazy';
          slide.appendChild(img);
        }
        m.track.appendChild(slide);
      });
    }
    m.prevBtn.hidden = images.length <= 1;
    m.nextBtn.hidden = images.length <= 1;
    m.counter.hidden = images.length <= 1;
    m.counter.textContent = `1/${images.length}`;
    m.track.scrollLeft = 0;

    // Autoplay first video if visible (mobile muted autoplay)
    setupVideoAutoplay(m);

    while (m.info.firstChild) m.info.removeChild(m.info.firstChild);

    // Use the active list/idx so prev/next navigation works
    const navList = (typeof list !== 'undefined' && list) ? list : (typeof activeList !== 'undefined' ? activeList : [post]);
    const navIdx = (typeof idx !== 'undefined' && idx >= 0) ? idx : (typeof activeIdx !== 'undefined' ? activeIdx : 0);

    // Author header
    m.info.appendChild(buildAuthorHeader(post));

    // Action bar (immediately under photo — Instagram-style)
    m.info.appendChild(buildActionBar(m, post));

    // Scrollable content (caption, meta, comments)
    const content = el('div', 'post-modal__content');

    // Likes count (right under action bar)
    const likeCount = el('div', 'post-modal__like-count');
    content.appendChild(likeCount);

    // Caption (with "ещё")
    content.appendChild(buildCaption(post));

    // Meta (views + date)
    const meta = el('div', 'post-modal__meta-stats');
    if (post.views) {
      const views = el('div', 'post-modal__views');
      views.textContent = formatCount(post.views) + ' ' + t('views');
      meta.appendChild(views);
    }
    const dateShort = el('div', 'post-modal__date-short');
    dateShort.textContent = fmtDateShort(post.date);
    dateShort.setAttribute('title', fmtDateFull(post.date));
    meta.appendChild(dateShort);
    content.appendChild(meta);

    // Comments block (inside scrollable)
    content.appendChild(buildComments(m, post.code || post.url, post));

    // Prev/Next navigation under the content (Instagram-style navigation)
    if (navList && navList.length > 1) {
      const nav = el('div', 'post-modal__nav-arrows');
      const prevLink = el('button', 'post-modal__nav-arrow post-modal__nav-arrow--prev', '← ' + t('prev_post'));
      prevLink.type = 'button';
      prevLink.disabled = navIdx <= 0;
      prevLink.addEventListener('click', () => navigate(-1));
      const nextLink = el('button', 'post-modal__nav-arrow post-modal__nav-arrow--next', t('next_post') + ' →');
      nextLink.type = 'button';
      nextLink.disabled = navIdx >= navList.length - 1;
      nextLink.addEventListener('click', () => navigate(1));
      nav.appendChild(prevLink);
      nav.appendChild(nextLink);
      content.appendChild(nav);
    }

    m.info.appendChild(content);

    // Like count initial
    updateLikeCount(m, getCounts(post.code || post.url), post);

    // Refresh from server (likes + comments)
    const code = post.code || post.url;
    apiGet('/post?code=' + encodeURIComponent(code)).then((r) => {
      if (r && r.likes) { setCounts(code, r.likes); updateLikeCount(m, r.likes, post); }
      refreshComments(code);
    });

    // Share popover (hidden by default, toggled by share button)
    m.info.appendChild(buildSharePop(m, post));

    // Close share pop on outside click
    document.addEventListener('click', (e) => {
      const pop = m.info.querySelector('.share-menu__pop');
      const shareBtn = m.info.querySelector('.post-modal__action--share');
      if (pop && !pop.contains(e.target) && !shareBtn.contains(e.target)) {
        pop.classList.remove('is-open');
      }
    });

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

  // categories for labels (не используется в этом UI)
  fetch('categories.json', { cache: 'no-cache' })
    .then((r) => r.ok ? r.json() : {})
    .then((data) => { categories = data || {}; categoriesLoaded = true; })
    .catch(() => { categories = {}; });
})();
