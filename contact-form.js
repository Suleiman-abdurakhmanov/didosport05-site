/* Contact form: photos + videos + Telegram share */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var previews = document.getElementById('previews');
  var hint = document.getElementById('contactHint');

  var MAX_FILES = 10;
  var MAX_SIZE = 50 * 1024 * 1024; // 50 MB
  var files = [];
  var blobUrls = [];

  function fmtSize(b) {
    if (b < 1024) return b + ' Б';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' КБ';
    return (b / 1024 / 1024).toFixed(1) + ' МБ';
  }

  function isImage(t) { return /^image\//.test(t); }
  function isVideo(t) { return /^video\//.test(t); }
  function isAccepted(f) { return isImage(f.type) || isVideo(f.type); }

  function addFiles(incoming) {
    var added = 0;
    for (var i = 0; i < incoming.length; i++) {
      if (files.length >= MAX_FILES) break;
      var f = incoming[i];
      if (!isAccepted(f)) continue;
      if (f.size > MAX_SIZE) {
        alert('Файл "' + f.name + '" больше 50 МБ — пропущен.');
        continue;
      }
      files.push(f);
      added++;
    }
    render();
    if (incoming.length > added && files.length >= MAX_FILES) {
      alert('Лимит ' + MAX_FILES + ' файлов. Остальные не добавлены.');
    }
  }

  function render() {
    if (!previews) return;
    // Освобождаем старые blob URL
    blobUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    blobUrls = [];
    previews.innerHTML = '';

    if (files.length === 0) {
      previews.hidden = true;
      return;
    }
    previews.hidden = false;

    files.forEach(function (f, i) {
      var url = URL.createObjectURL(f);
      blobUrls.push(url);

      var tile = document.createElement('div');
      tile.className = 'preview-tile';

      if (isImage(f.type)) {
        var img = document.createElement('img');
        img.src = url;
        img.alt = f.name;
        img.loading = 'lazy';
        tile.appendChild(img);
      } else if (isVideo(f.type)) {
        var v = document.createElement('video');
        v.src = url;
        v.muted = true;
        v.playsInline = true;
        tile.appendChild(v);
        var tag = document.createElement('span');
        tag.className = 'preview-tile__type';
        tag.textContent = 'VIDEO';
        tile.appendChild(tag);
      }

      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'preview-tile__x';
      x.setAttribute('aria-label', 'Удалить');
      x.textContent = '×';
      x.addEventListener('click', function (e) {
        e.preventDefault();
        files.splice(i, 1);
        render();
      });
      tile.appendChild(x);
      previews.appendChild(tile);
    });

    var total = files.reduce(function (s, f) { return s + f.size; }, 0);
    var count = document.createElement('p');
    count.className = 'preview-count';
    count.textContent = files.length + ' файлов · ' + fmtSize(total);
    previews.appendChild(count);
  }

  function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

  if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (ev) {
      dropZone.addEventListener(ev, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dropZone.addEventListener(ev, function () { dropZone.classList.add('drag'); }, false);
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dropZone.addEventListener(ev, function () { dropZone.classList.remove('drag'); }, false);
    });
    dropZone.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (dt && dt.files) addFiles(Array.prototype.slice.call(dt.files));
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      addFiles(Array.prototype.slice.call(e.target.files));
      fileInput.value = ''; // позволить выбрать тот же файл снова
    });
  }

  function buildText(name, message) {
    var t = 'Заявка с сайта didosport05.ru';
    if (name && name.trim()) t += '\nИмя: ' + name.trim();
    if (message && message.trim()) t += '\n\n' + message.trim();
    return t;
  }

  function showHint(html) {
    if (!hint) return;
    hint.hidden = false;
    hint.innerHTML = html;
  }

  function canShareFiles() {
    return typeof navigator !== 'undefined'
      && typeof navigator.canShare === 'function'
      && typeof navigator.share === 'function'
      && navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] });
  }

  function downloadAll() {
    files.forEach(function (f) {
      var a = document.createElement('a');
      var u = URL.createObjectURL(f);
      a.href = u;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 0);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var name = fd.get('name') || '';
    var message = fd.get('message') || '';
    var text = buildText(name, message);

    // 1) Если есть файлы и можно шарить — нативный share sheet (мобильный)
    if (files.length > 0 && canShareFiles()) {
      try {
        navigator.share({
          title: 'ДИДО СПОРТ — заявка',
          text: text,
          files: files
        }).then(function () {
          form.reset();
          files = [];
          render();
          showHint('<strong>Готово!</strong> Спасибо, заявка отправлена.');
        }).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          // прочие ошибки → fallback
          fallbackToTelegram(text);
        });
        return;
      } catch (err) {
        fallbackToTelegram(text);
        return;
      }
    }

    // 2) Fallback — без share API
    fallbackToTelegram(text);
  });

  function fallbackToTelegram(text) {
    if (files.length > 0) downloadAll();

    var tgText = encodeURIComponent(text);
    var tgUrl = 'https://t.me/didosport?text=' + tgText;
    window.open(tgUrl, '_blank');

    if (files.length > 0) {
      showHint(
        'Файлы (' + files.length + ' шт.) скачаны на ваше устройство — ' +
        '<strong>прикрепите их к сообщению в Telegram</strong>, ' +
        'текст уже подставлен.'
      );
    } else {
      showHint('Открыли Telegram с готовым текстом. Отправьте сообщение — отвечаем лично.');
    }
  }
})();
