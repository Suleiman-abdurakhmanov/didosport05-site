/* Двуязычный словарь + переключатель RU / EN */
(function () {
  const dict = {
    ru: {
      html_lang: 'ru',
      skip: 'К содержимому',
      brand_sub: 'Цунтинский район · с 2017',
      nav_help: 'Помочь',
      nav_latest: 'Новости',
      nav_sections: 'Разделы',
      nav_feed: 'Лента',
      nav_contact: 'Связаться',

      hero_kicker: 'Спортивно-информационное сообщество · Дагестан',
      hero_title_1: 'Сила',
      hero_title_2: 'дидойского',
      hero_title_3: 'ковра',
      hero_lede: 'Семь лет рассказываем о наших борцах, организуем турниры и поддерживаем спортсменов Цунтинского района — от первой схватки до пьедестала страны.',
      hero_cta_feed: 'Лента публикаций',
      hero_cta_sections: 'Разделы сайта',
      stat1_v: 'с 2017', stat1_l: 'года работаем',
      stat2_v: '25+',    stat2_l: 'регионов России на наших турнирах',
      stat3_v: '17 335', stat3_l: 'подписчиков',
      stat4_v: '2 550+', stat4_l: 'публикаций',
      tk_1: 'Вольная борьба', tk_2: 'MMA · Free Fighting', tk_3: 'Грепплинг',
      tk_4: 'Горная борцовская лига', tk_5: 'Дидойская волейбольная лига',
      tk_6: 'Дидойская футбольная лига',

      about_unit: 'лет',
      about_lead: '<strong>25 декабря 2024 года «ДИДО СПОРТ» исполнилось семь лет.</strong> От страницы о наших борцах — до команды, которая собирает турниры на равнине и в горах, ведёт Горную Борцовскую Лигу и поддерживает дидойских спортсменов на всероссийском уровне.',


      feed_kicker: 'Лента публикаций',
      feed_sub: 'Свежие публикации по разделам. Нажмите карточку — публикация откроется здесь, на сайте.',
      feed_loading: 'Загружаем посты…',
      feed_video: 'Видео',
      feed_empty_title: 'В этом разделе пока нет публикаций',
      feed_empty_sub: 'Новые посты появятся здесь, как только будут опубликованы.',

      help_kicker: 'Помочь проекту',
      help_h2: 'Поддержите дидойский спорт.',
      help_lead: 'Каждое пожертвование — это экипировка для борца, поездка на турнир, детский лагерь или гуманитарная помощь семье спортсмена. Если вам близки наши цели — будем благодарны.',
      help_use_1: 'Поездки на турниры и сборы',
      help_use_2: 'Экипировка и форма для атлетов',
      help_use_3: 'Организация Горной Борцовской Лиги',
      help_use_4: 'Гуманитарные сборы с фондом «Чистое Сердце»',
      help_card_l: 'Перевод по номеру телефона (СБП)',
      help_card_phone_l: 'Телефон для перевода',
      help_card_bank_l: 'Как перевести',
      help_card_bank_v: 'В приложении вашего банка: «Переводы → По номеру телефона → СБП»',
      help_card_recv_l: 'Получатель',
      help_card_card_l: 'Привязан к карте',
      help_card_card_v: 'Карта Сбера, привязанная к этому номеру — перевод по СБП идёт прямо на неё',
      help_card_purpose_l: 'Назначение',
      help_card_purpose_v: 'Поддержка развития спорта в Цунтинском (Дидойском) районе',
      help_pay: 'Перевести в Сбербанк Онлайн',
      help_pay_alt_desktop: 'Не открылось приложение?',
      help_pay_alt_web: 'Сбербанк Онлайн в браузере →',
      help_copy: 'Скопировать',
      help_copy_done: 'Скопировано ✓',
      help_hint: 'Номер карты для прямого перевода добавим позже — пока работает перевод по СБП на этот номер. После перевода можно прислать чек в Телеграм: @didosport05 — отметим ваше участие и расскажем, на что пошли средства.',

      ct_f_name: 'Ваше имя',
      ct_f_msg: 'Сообщение',
      ct_f_send: 'Отправить в Телеграм →',

      latest_kicker: 'Последние новости',
      latest_h2: 'Свежее — только что из ленты.',
      latest_sub: 'Две последние публикации сообщества. Обновляется автоматически.',
      latest_empty_title: 'Пока нет новых публикаций',
      latest_empty_sub: 'Загляни позже или посмотри ленту ниже.',
      latest_open: 'Открыть публикацию →',
      latest_just_now: 'только что',

      archive_kicker: 'Архив публикаций',
      archive_h2: 'Летопись сообщества — по годам и месяцам.',
      archive_sub: 'Откройте нужный год и месяц, чтобы перечитать любую публикацию с самого начала.',
      archive_total: 'публикаций за',
      archive_years: 'год',
      archive_months: 'месяцев',
      archive_all_posts: 'Все публикации',
      archive_year_label: 'год',
      archive_posts_label: 'публ.',
      archive_empty: 'В этом месяце пока нет публикаций.',
      archive_back_years: '← К годам',
      archive_back_months: '← К месяцам',

      sec_kicker: 'Разделы',
      sec_h2: 'Свои направления и лиги — выбери своё.',
      sec_sub: 'Кликните на раздел — увидите публикации, турниры и истории по теме.',
      sec_open: 'Открыть раздел →',
      feed_carousel: 'Карусель',

      ct_kicker: 'Связь',
      ct_h2: 'Сообщество открыто для земляков, тренеров и партнёров.',
      ct_lede: 'Хотите рассказать о спортсмене из района, предложить поддержку или пригласить на турнир — пишите в мессенджеры. Отвечаем лично.',
      ct_2_l: 'Telegram', ct_3_l: 'Сообщество ВКонтакте',
      ct_4_l: 'Регион', ct_4_v: 'Цунтинский район, Республика Дагестан',

      footer_sub: 'Спортивно-информационное сообщество Цунтинского района · с 2017',
      footer_copy: 'Летопись наших атлетов. Материалы сообщества — тексты, фото, истории. Сайт ведётся командой ДИДО СПОРТ.',

      description: 'ДИДО СПОРТ — спортивно-информационное сообщество Цунтинского района. Вольная борьба, единоборства, турниры и истории наших атлетов с 2017 года.',
    },

    en: {
      html_lang: 'en',
      skip: 'Skip to content',
      brand_sub: 'Tsuntinsky District · since 2017',
      nav_help: 'Support',
      nav_latest: 'News',
      nav_sections: 'Sections',
      nav_feed: 'Feed',
      nav_contact: 'Contact',

      hero_kicker: 'Sport & media community · Dagestan',
      hero_title_1: 'The strength of',
      hero_title_2: 'the Didoy',
      hero_title_3: 'mat',
      hero_lede: 'For seven years we have been telling the stories of our wrestlers, running tournaments and supporting athletes from Tsuntinsky District — from the first bout to the national podium.',
      hero_cta_feed: 'Latest posts',
      hero_cta_sections: 'Sections',
      stat1_v: 'since 2017', stat1_l: 'years on the mat',
      stat2_v: '25+',        stat2_l: 'Russian regions at our tournaments',
      stat3_v: '17,335',     stat3_l: 'followers',
      stat4_v: '2,550+',     stat4_l: 'publications',
      tk_1: 'Freestyle wrestling', tk_2: 'MMA · Free Fighting', tk_3: 'Grappling',
      tk_4: 'Mountain Wrestling League', tk_5: 'Didoy Volleyball League',
      tk_6: 'Didoy Football League',

      about_unit: 'years',
      about_lead: '<strong>On December 25, 2024, DIDO SPORT turned seven.</strong> From a page about our wrestlers — to a team that hosts tournaments on the plains and in the mountains, runs the Mountain Wrestling League and supports Didoy athletes at the all-Russian level.',

      feed_kicker: 'Posts feed',
      feed_h2: 'Fresh posts by section',
      feed_sub: 'Fresh posts by section. Tap a card — the post opens right here on the site.',
      feed_loading: 'Loading posts…',
      feed_video: 'Video',
      feed_empty_title: 'No posts in this section yet',
      feed_empty_sub: 'New posts will appear here as soon as they are published.',

      help_kicker: 'Support the project',
      help_h2: 'Help Didoi sport grow.',
      help_lead: 'Every donation covers gear for a wrestler, travel to a tournament, a youth camp or humanitarian aid for an athlete\'s family. If our cause resonates with you — we will be grateful.',
      help_use_1: 'Travel to tournaments and camps',
      help_use_2: 'Gear and uniform for athletes',
      help_use_3: 'Running the Mountain Wrestling League',
      help_use_4: 'Humanitarian drives with Pure Heart Foundation',
      help_card_l: 'Transfer by phone number (SBP)',
      help_card_phone_l: 'Phone for transfer',
      help_card_bank_l: 'How to send',
      help_card_bank_v: 'In your banking app: "Transfers → By phone number → SBP"',
      help_card_recv_l: 'Recipient',
      help_card_card_l: 'Linked card',
      help_card_card_v: 'A Sberbank card linked to this number — SBP transfers go straight to it',
      help_card_purpose_l: 'Purpose',
      help_card_purpose_v: 'Support sport development in Tsuntinsky (Didoy) District',
      help_pay: 'Pay via Sberbank Online',
      help_pay_alt_desktop: "App didn't open?",
      help_pay_alt_web: 'Sberbank Online in browser →',
      help_copy: 'Copy',
      help_copy_done: 'Copied ✓',
      help_hint: 'A direct card number will be added later — for now transfers work via SBP to this phone number. After the transfer you can send the receipt to Telegram: @didosport05 — we will acknowledge your support and share where the funds went.',

      ct_f_name: 'Your name',
      ct_f_msg: 'Message',
      ct_f_send: 'Send via Telegram →',

      latest_kicker: 'Latest news',
      latest_h2: 'Just out — the freshest from the feed.',
      latest_sub: 'The two most recent community posts. Updated automatically.',
      latest_empty_title: 'No new posts yet',
      latest_empty_sub: 'Check back later, or browse the feed below.',
      latest_open: 'Open post →',
      latest_just_now: 'just now',

      archive_kicker: 'Publication archive',
      archive_h2: 'A chronicle of the community — by years and months.',
      archive_sub: 'Open a year and a month to revisit any post from the very beginning.',
      archive_total: 'posts in',
      archive_years: 'year',
      archive_months: 'months',
      archive_all_posts: 'All posts',
      archive_year_label: 'year',
      archive_posts_label: 'posts',
      archive_empty: 'No posts in this month yet.',
      archive_back_years: '← Back to years',
      archive_back_months: '← Back to months',

      sec_kicker: 'Sections',
      sec_h2: 'Our sports and leagues — pick yours.',
      sec_sub: 'Click a section to see posts, tournaments and stories on that topic.',
      sec_open: 'Open section →',
      feed_carousel: 'Carousel',

      ct_kicker: 'Contact',
      ct_h2: 'The community is open to fellow villagers, coaches and partners.',
      ct_lede: 'Want to feature an athlete from the district, offer support or invite us to a tournament — message us. We reply personally.',
      ct_2_l: 'Telegram', ct_3_l: 'VKontakte community',
      ct_4_l: 'Region', ct_4_v: 'Tsuntinsky District, Republic of Dagestan',

      footer_sub: 'Sport & media community of Tsuntinsky District · since 2017',
      footer_copy: 'A chronicle of our athletes. Community materials — texts, photos, stories. The site is run by the DIDO SPORT team.',

      description: 'DIDO SPORT is a sport and media community from Tsuntinsky District, Dagestan. Freestyle wrestling, combat sports, tournaments and the stories of our athletes since 2017.',
    },
  };

  const STORAGE_KEY = 'dido_lang';
  let currentLang = 'ru';

  function getLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && dict[saved]) return saved;
    const navLang = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    return dict[navLang] ? navLang : 'ru';
  }

  // Public hook
  window.getCurrentLang = () => currentLang;
  window.__i18n = {
    get lang() { return currentLang; },
  };

  function applyLang(lang) {
    if (!dict[lang]) return;
    currentLang = lang;
    const d = dict[lang];
    document.documentElement.lang = d.html_lang;
    // elements with data-i18n (text or html)
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = d[key];
      if (val === undefined) return;
      // If the element originally has any <strong>…</strong> or other inline tags,
      // we set innerHTML; otherwise textContent.
      if (/[<&]/.test(val)) el.innerHTML = val;
      else el.textContent = val;
    });
    // elements with data-i18n-attr (attribute translation)
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      const attr = el.getAttribute('data-i18n-attr');
      const key = attr; // same key
      const val = d[key];
      if (val === undefined) return;
      el.setAttribute(attr, val);
    });
    // Switcher state
    document.querySelectorAll('.lang-btn').forEach((b) => {
      const active = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    // Persist
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    // Update <title>
    const t = (lang === 'en')
      ? 'DIDO SPORT — sport community of Tsuntinsky District · since 2017'
      : 'ДИДО СПОРТ — спортивное сообщество Цунтинского района · с 2017';
    document.title = t;
    // Let other scripts (feed) react
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyLang(getLang());
    document.querySelectorAll('.lang-btn').forEach((b) => {
      b.addEventListener('click', () => applyLang(b.getAttribute('data-lang')));
    });
  });
})();
