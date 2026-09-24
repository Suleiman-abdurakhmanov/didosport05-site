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
        a.href = `archive.html#${m.k}`;
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
    const host = document.getElementById('navArchiveYears');
    if (!host) return;
    const years = loadSummary();
    buildYears(years, host);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
