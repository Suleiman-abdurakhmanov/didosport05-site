/* Post modal — used by feed.js (index.html) and archive.js (archive.html) */
(function () {
  'use strict';

  const TG_HANDLE = 'didosport';

  const modalLabels = {
    ru: {
      close: 'Закрыть',
      prev: 'Предыдущее фото',
      next: 'Следующее фото',
      carousel: 'Карусель',
      video: 'Видео',
      like: 'Нравится',
      liked: 'Оценил',
      like_hint: 'Оценка сохраняется в вашем браузере. Обсуждение — в Telegram, без регистрации.',
      discuss_tg: 'Обсудить в Telegram',
      share_tg: 'Поделиться',
      discuss_prefix: '💬 Комментарий к публикации от {date}\nРаздел: {category}\n\n',
      caption_label: 'Описание',
      attribution: 'Оригинал публикации в Instagram',
    },
    en: {
      close: 'Close',
      prev: 'Previous photo',
      next: 'Next photo',
      carousel: 'Carousel',
      video: 'Video',
      like: 'Like',
      liked: 'Liked',
      like_hint: 'Your like is saved in this browser. Discussion lives in Telegram — no signup.',
      discuss_tg: 'Discuss on Telegram',
      share_tg: 'Share',
      discuss_prefix: '💬 Comment on the post from {date}\nSection: {category}\n\n',
      caption_label: 'Caption',
      attribution: 'Original post on Instagram',
    },
  };

  const LIKES_KEY = 'dido_likes_v1';
  const monthsRu = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const monthsEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  let categories = {};
  let activeModal = null;
  let activeList = []; // array of posts for navigation
  let activeIdx = 0;

  function pickLang() {
    return (window.__i18n && window.__i18n.lang) || localStorage.getItem('dido_lang') || 'ru';
  }
  function ml(k) { return (modalLabels[pickLang()] || modalLabels.ru)[k] || k; }

  function getLikedSet() {
    try {
      const raw = localStorage.getItem(LIKES_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) { return new Set(); }
  }
  function saveLikedSet(set) {
    try { localStorage.setItem(LIKES_KEY, JSON.stringify([...set])); } catch (e) {}
  }
  function isLiked(postId) { return getLikedSet().has(postId); }
  function toggleLiked(postId) {
    const set = getLikedSet();
    if (set.has(postId)) { set.delete(postId); saveLikedSet(set); return false; }
    set.add(postId); saveLikedSet(set); return true;
  }

  function makeEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function linkify(text) {
    if (!text) return '';
    const escape = (s) => s.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    return escape(text)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/@([a-z0-9._]+)/gi, '<a href="https://www.instagram.com/$1" target="_blank" rel="noopener">@$1</a>')
      .replace(/#([a-zа-яё0-9_]+)/gi, '<a href="https://www.instagram.com/explore/tags/$1" target="_blank" rel="noopener">#$1</a>')
      .replace(/\n/g, '<br>');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const lang = pickLang();
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return iso;
    const [y, m, d] = parts;
    if (lang === 'en') return `${monthsEn[m - 1]} ${d}, ${y}`;
    return `${d} ${monthsRu[m - 1]} ${y}`;
  }

  function tgCommentUrl(post) {
    const tpl = ml('discuss_prefix');
    const cat = categories[post.category];
    const lang = pickLang();
    const catLabel = cat ? (lang === 'en' ? cat.en : cat.ru) : '';
    const text = tpl.replace('{date}', post.date || '').replace('{category}', catLabel);
    const full = `${text}https://www.instagram.com/p/${post.code || ''}/`;
    return `https://t.me/${TG_HANDLE}?text=${encodeURIComponent(full)}`;
  }
  function tgShareUrl(post) {
    const url = post.url || `https://www.instagram.com/p/${post.code || ''}/`;
    return `https://t.me/share/url?url=${encodeURIComponent(url)}`;
  }

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

  function renderPost(m, post) {
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
    const lang = pickLang();
    const catLabel = cat ? (lang === 'en' ? cat.en : cat.ru) : '';
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
    const likeLabel = makeEl('span', 'reaction-btn__label', ml(liked ? 'liked' : 'like'));
    likeBtn.appendChild(likeIcon);
    likeBtn.appendChild(likeLabel);
    likeBtn.addEventListener('click', () => {
      const key = post.code || post.url;
      const nowLiked = toggleLiked(key);
      likeBtn.classList.toggle('is-on', nowLiked);
      likeBtn.setAttribute('aria-pressed', String(nowLiked));
      likeIcon.textContent = nowLiked ? '❤' : '♡';
      likeLabel.textContent = ml(nowLiked ? 'liked' : 'like');
    });
    reactions.appendChild(likeBtn);

    const tgBtn = makeEl('a', 'reaction-btn reaction-btn--tg');
    tgBtn.href = tgCommentUrl(post);
    tgBtn.target = '_blank';
    tgBtn.rel = 'noopener';
    tgBtn.innerHTML = `<span class="reaction-btn__icon">💬</span><span class="reaction-btn__label">${ml('discuss_tg')}</span>`;
    reactions.appendChild(tgBtn);

    const shareBtn = makeEl('a', 'reaction-btn reaction-btn--share');
    shareBtn.href = tgShareUrl(post);
    shareBtn.target = '_blank';
    shareBtn.rel = 'noopener';
    shareBtn.innerHTML = `<span class="reaction-btn__icon">↗</span><span class="reaction-btn__label">${ml('share_tg')}</span>`;
    reactions.appendChild(shareBtn);

    const hint = makeEl('p', 'post-modal__react-hint');
    hint.textContent = ml('like_hint');
    reactions.appendChild(hint);

    meta.appendChild(reactions);
    m.info.appendChild(meta);

    const cap = makeEl('p', 'post-modal__caption');
    cap.innerHTML = linkify(post.caption || '');
    m.info.appendChild(cap);

    if (post.url) {
      const attr = makeEl('p', 'post-modal__attribution');
      const a = makeEl('a', null, ml('attribution') + ' →');
      a.href = post.url;
      a.target = '_blank';
      a.rel = 'noopener';
      attr.appendChild(a);
      m.info.appendChild(attr);
    }
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

  function closeModal() {
    const m = activeModal;
    if (!m) return;
    m.overlay.setAttribute('aria-hidden', 'true');
    m.overlay.classList.remove('post-modal--open');
    document.body.classList.remove('post-modal-open');
  }

  // Public API
  window.openPostModal = function (post, list, idx) {
    openModal(post, list, idx);
  };

  // Load categories once
  fetch('categories.json', { cache: 'no-cache' })
    .then((r) => r.ok ? r.json() : {})
    .then((data) => { categories = data || {}; })
    .catch(() => { categories = {}; });
})();
