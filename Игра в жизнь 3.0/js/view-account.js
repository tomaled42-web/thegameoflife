/* Аккаунт: вход по коду, подписка, замки на платных функциях */
'use strict';

/* ---------- вход ---------- */
let loginEmail = '';
function openLogin(sub = 'Прогресс будет храниться в облаке и не потеряется при смене телефона.') {
  if (!Cloud.sb) { toast({ icon: 'alert', title: 'Облако недоступно', text: 'Проверь интернет и попробуй ещё раз' }); return; }
  forgetLoginStep();
  openModal(`${modalHead('Вход', sub)}
    <form data-form="loginEmail" class="stack">
      <label class="field"><span>Почта</span><input class="input" type="email" name="email" value="${esc(loginEmail)}" placeholder="you@mail.ru" autocomplete="email" required autofocus></label>
      <button class="btn primary block">Получить код</button>
      <div class="sub">Пароль не нужен: пришлём код из 6 цифр. Если аккаунта ещё нет — он создастся.</div>
      <div class="row" style="justify-content:center"><button type="button" class="btn ghost sm" data-act="loginPass">Войти по паролю</button></div>
    </form>`);
}
ACTIONS.login = () => { openLogin(); return false; };
/* вход по паролю — для аккаунтов, которым пароль задан вручную (например, тестовый для проверки) */
ACTIONS.loginPass = () => {
  openModal(`${modalHead('Вход по паролю', 'Если пароля нет — войди по коду из письма.')}
    <form data-form="loginPass" class="stack">
      <label class="field"><span>Почта</span><input class="input" type="email" name="email" value="${esc(loginEmail)}" autocomplete="username" required autofocus></label>
      <label class="field"><span>Пароль</span><input class="input" type="password" name="password" autocomplete="current-password" required></label>
      <button class="btn primary block">Войти</button>
      <div class="row" style="justify-content:center"><button type="button" class="btn ghost sm" data-act="login">Войти по коду</button></div>
    </form>`);
  return false;
};
FORMS.loginPass = async (d, form) => {
  loginEmail = d.email.trim().toLowerCase();
  const btn = form.querySelector('button.primary'); btn.disabled = true; btn.textContent = 'Проверяем…';
  try {
    await cloudSignInPassword(loginEmail, d.password);
    closeModal(true);
    toast({ icon: 'check', title: 'Готово, ты в аккаунте', text: 'Прогресс сохраняется в облаке' });
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Войти';
    toast({ icon: 'alert', title: 'Не удалось войти', text: 'Проверь почту и пароль' });
  }
  return false;
};
FORMS.loginEmail = async (d, form) => {
  loginEmail = d.email.trim().toLowerCase();
  const btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Отправляем…';
  try { await cloudSendCode(loginEmail); }
  catch (e) {
    btn.disabled = false; btn.textContent = 'Получить код';
    toast({ icon: 'alert', title: 'Не удалось отправить код', text: /rate|limit|seconds/i.test(e.message) ? 'Слишком часто. Подожди минуту и попробуй снова.' : e.message });
    return false;
  }
  rememberLoginStep(loginEmail);
  showCodeStep();
  return false;
};
/* вызывается при запуске, если пользователь ещё не вошёл, но недавно запросил код */
function resumeLogin() {
  const s = pendingLoginStep();
  if (!s || Cloud.user) return;
  loginEmail = s.email;
  showCodeStep();
}
let resendTimer = null;
function showCodeStep() {
  openModal(`${modalHead('Код из письма', `Отправили код на ${esc(loginEmail)}. Письмо может прийти в «Спам». Можно спокойно перейти в почту — это окно дождётся.`)}
    <form data-form="loginCode" class="stack">
      <input class="input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000" required autofocus data-input="codeInput" style="text-align:center;font-size:26px;letter-spacing:.3em;height:60px">
      <button class="btn primary block">Войти</button>
      <div class="row" style="justify-content:space-between">
        <button type="button" class="btn ghost sm" data-act="login">Другая почта</button>
        <button type="button" class="btn ghost sm" data-act="resendCode" id="resendBtn" disabled>Отправить снова</button>
      </div>
    </form>`);
  let left = 60;
  const tick = () => {
    const b = document.getElementById('resendBtn'); if (!b) { clearInterval(resendTimer); return; }
    if (left > 0) { b.textContent = `Отправить снова · ${left}`; b.disabled = true; left--; }
    else { b.textContent = 'Отправить снова'; b.disabled = false; clearInterval(resendTimer); }
  };
  clearInterval(resendTimer); tick(); resendTimer = setInterval(tick, 1000);
  setTimeout(() => { const f = document.querySelector('[name=code]'); if (f) f.focus(); }, 80);
}
/* код вставлен или набран целиком — входим без лишнего нажатия */
INPUTS.codeInput = el => {
  const digits = el.value.replace(/\D/g, '');
  if (digits.length >= 6 && digits.length <= 8 && !el.dataset.sent) {
    el.dataset.sent = '1';
    setTimeout(() => { const f = el.closest('form'); if (f) f.requestSubmit(); delete el.dataset.sent; }, 150);
  }
};
ACTIONS.resendCode = async () => {
  try { await cloudSendCode(loginEmail); toast({ icon: 'check', title: 'Код отправлен ещё раз' }); showCodeStep(); }
  catch (e) { toast({ icon: 'alert', title: 'Не удалось отправить', text: 'Подожди минуту и попробуй снова' }); }
  return false;
};
FORMS.loginCode = async (d, form) => {
  const btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Проверяем…';
  try {
    await cloudVerify(loginEmail, d.code.replace(/\D/g, ''));
    closeModal(true);
    toast({ icon: 'check', title: 'Готово, ты в аккаунте', text: 'Прогресс сохраняется в облаке' });
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Войти';
    toast({ icon: 'alert', title: 'Код не подошёл', text: 'Проверь цифры или запроси новый код' });
  }
  return false;
};
ACTIONS.logout = async () => {
  if (!await confirmDialog({ title: 'Выйти из аккаунта?', text: 'Прогресс останется в облаке. На этом устройстве он тоже сохранится, пока не войдёшь в другой аккаунт.', ok: 'Выйти' })) return false;
  await cloudSignOut();
  toast({ icon: 'check', title: 'Ты вышел из аккаунта' });
};

/* ---------- подписка ---------- */
let payPlan = 'year';
const PREMIUM_FEATURES = [
  ['swords', 'Арена с боссами', 'Большие цели превращаются в битвы'],
  ['grid', 'Все разделы без ограничений', `Бесплатно — ${FREE_SECTIONS} на выбор`],
  ['chart', 'Полная статистика', 'Полгода, год и рост характеристик'],
  ['refresh', 'Облако на всех устройствах', 'Телефон и компьютер синхронизируются'],
  ['camera', 'Фото «до» и «после»', 'Видны только тебе'],
];
function openPaywall(reason = '') {
  const st = premiumState();
  const plan = (id, title, price, note, badge) => `<button type="button" class="card flat click plan ${payPlan === id ? 'on' : ''}" data-act="payPlan" data-v="${id}">
    <div class="row between"><b>${title}</b>${badge ? `<span class="delta up">${badge}</span>` : ''}</div>
    <div class="num num-m" style="margin:10px 0 4px">${fmtNum(price)} ₽</div><div class="sub">${note}</div></button>`;
  const cta = !Cloud.user ? `<button class="btn primary block" data-act="payLogin">${icon('user', 16)} Войти и получить 7 дней бесплатно</button>`
    : `<button class="btn primary block" data-act="payStart">${icon('sparkle', 16)} Оформить за ${fmtNum(PRICES[payPlan])} ₽</button>`;
  openModal(`<div style="text-align:center;margin-bottom:18px">
      <div class="brand-mark" style="width:56px;height:56px;border-radius:18px;margin:0 auto 14px">${icon('crown', 26)}</div>
      <h2 style="margin:0;font-family:var(--font-d);font-weight:500;font-size:26px;letter-spacing:-.02em">Игра в жизнь+</h2>
      <p class="muted" style="margin:8px auto 0;max-width:360px">${reason || 'Открой всю игру: боссов, все разделы и полную статистику.'}</p>
    </div>
    <div class="list mb">${PREMIUM_FEATURES.map(([ic, t, s]) => `<div class="li">${icon(ic, 18)}<div class="grow"><b>${t}</b><small>${s}</small></div>${icon('check', 16)}</div>`).join('')}</div>
    <div class="grid g2 keep mb">${plan('month', 'Месяц', PRICES.month, '30 дней доступа', '')}${plan('year', 'Год', PRICES.year, `≈${fmtNum(Math.round(PRICES.year / 12))} ₽ в месяц`, '−' + Math.round((1 - PRICES.year / (PRICES.month * 12)) * 100) + '%')}</div>
    ${cta}
    <div class="sub" style="text-align:center;margin-top:12px">${st.kind === 'expired' ? 'Пробный период закончился. Весь прогресс на месте.' : 'Разовая оплата за период, без автосписаний.'}<br>Оплачивая, вы принимаете <a href="legal/offer.html" target="_blank" rel="noopener">оферту</a> и <a href="legal/privacy.html" target="_blank" rel="noopener">политику конфиденциальности</a>.</div>
    <div class="row" style="justify-content:center;margin-top:8px"><button class="btn ghost sm" data-act="closeModal">Не сейчас</button></div>`);
}
ACTIONS.paywall = () => { openPaywall(); return false; };
ACTIONS.payPlan = el => { payPlan = el.dataset.v; openPaywall(); return false; };
/* ---------- предложение для новичков: пробный период и что будет после ---------- */
function showWelcomeOffer() {
  S.offerSeen = true; saveState();
  const save = Math.round((1 - PRICES.year / (PRICES.month * 12)) * 100);
  const step = (ic, t, s, on) => `<div class="tl-step ${on ? 'on' : ''}"><span class="tl-dot">${icon(ic, 14)}</span><div><b>${t}</b><small>${s}</small></div></div>`;
  openModal(`<div style="text-align:center;margin-bottom:18px">
      <div class="brand-mark" style="width:56px;height:56px;border-radius:18px;margin:0 auto 14px">${icon('crown', 26)}</div>
      <div class="eyebrow">Игра в жизнь+</div>
      <h2 style="margin:6px 0 0;font-family:var(--font-d);font-weight:500;font-size:26px;letter-spacing:-.02em">7 дней всё открыто бесплатно</h2>
      <p class="muted" style="margin:8px auto 0;max-width:360px">Попробуй полную игру. Карта не нужна — ничего не спишется само.</p>
    </div>
    <div class="tl mb">
      ${step('sparkle', 'Сегодня', 'Арена с боссами, все разделы, полная статистика', true)}
      ${step('bell', 'За 2 дня до конца', 'Напомним, сколько осталось')}
      ${step('shield', 'Через 7 дней', `Бесплатная версия: ${FREE_SECTIONS} раздела, задания и уровни. Прогресс сохранится`)}
    </div>
    <div class="grid g2 keep mb">
      <div class="card flat plan on"><div class="row between"><b>Год</b><span class="delta up">−${save}%</span></div><div class="num num-m" style="margin:10px 0 4px">${fmtNum(PRICES.year)} ₽</div><div class="sub">≈${fmtNum(Math.round(PRICES.year / 12))} ₽ в месяц</div></div>
      <div class="card flat plan"><div class="row between"><b>Месяц</b></div><div class="num num-m" style="margin:10px 0 4px">${fmtNum(PRICES.month)} ₽</div><div class="sub">30 дней доступа</div></div>
    </div>
    <button class="btn primary block" data-act="offerTrial">${icon('sparkle', 16)} Начать 7 дней бесплатно</button>
    <button class="btn ghost block" style="margin-top:8px" data-act="offerFree">Продолжить в бесплатной версии</button>
    <div class="sub" style="text-align:center;margin-top:10px">Подписка — разовая оплата за месяц или год, без автосписаний.</div>`);
}
ACTIONS.offerTrial = () => { openLogin('Аккаунт нужен, чтобы включить 7 дней бесплатно и не потерять прогресс.'); return false; };
ACTIONS.offerFree = () => {
  closeModal();
  toast({ icon: 'check', title: 'Бесплатная версия', text: `Доступны ${FREE_SECTIONS} раздела, задания и уровни. Пробный период можно начать в любой момент.` });
  return false;
};
/* запуск без аккаунта: вернуть ввод кода, если человек ушёл за ним в почту, или один раз показать предложение */
function guestStart() {
  if (pendingLoginStep()) { resumeLogin(); return; }
  if (BILLING.paywall && S.profile.name && !S.offerSeen && !$('#modal')) showWelcomeOffer();
}
/* за 2 дня до конца пробного периода — короткое напоминание, раз в день */
function trialNudge() {
  const st = premiumState(); if (st.kind !== 'trial') return;
  const left = Math.max(1, Math.ceil((new Date(st.until) - Date.now()) / 864e5));
  if (left > 2) return;
  try { if (localStorage.getItem('lifegame.trialNudge') === today()) return; localStorage.setItem('lifegame.trialNudge', today()); } catch (e) { }
  toast({ icon: 'crown', title: `Пробный период: ещё ${left} ${pDays(left)}`, text: 'Потом останется бесплатная версия. Подписку можно оформить в настройках.' });
}
ACTIONS.payLogin = () => { openLogin('Войди — и 7 дней всё будет открыто бесплатно.'); return false; };
ACTIONS.payStart = async el => {
  if (!Cloud.user) { openLogin('Войди, чтобы оформить подписку.'); return false; }
  el.disabled = true; el.textContent = 'Открываем оплату…';
  try {
    const { data, error } = await Cloud.sb.functions.invoke('create-payment', { body: { plan: payPlan } });
    if (error || !data || !data.url) throw error || new Error('no url');
    localStorage.setItem('lifegame.payPending', String(Date.now()));
    location.href = data.url;   // страница оплаты ЮKassa: карта или СБП
  } catch (e) {
    let code = '';
    try { code = (await e.context.json()).error; } catch (_) { }
    toast(code === 'payments_not_configured'
      ? { icon: 'clock', title: 'Оплата появится совсем скоро', text: 'Мы подключаем приём платежей' }
      : { icon: 'alert', title: 'Не получилось открыть оплату', text: 'Проверь интернет и попробуй ещё раз' });
    el.disabled = false; el.textContent = `Оформить за ${fmtNum(PRICES[payPlan])} ₽`;
  }
  return false;
};

/* возврат со страницы оплаты: ждём, пока сервер получит подтверждение от ЮKassa */
async function watchPayment() {
  const pending = +(localStorage.getItem('lifegame.payPending') || 0);
  const fromPay = /[?&]paid=1/.test(location.search);
  if (!Cloud.user || (!fromPay && Date.now() - pending > 30 * 60 * 1000)) return;
  if (fromPay) history.replaceState(null, '', location.pathname + location.hash);
  const before = Cloud.profile && Cloud.profile.premium_until ? new Date(Cloud.profile.premium_until) : new Date(0);
  toast({ icon: 'clock', title: 'Проверяем оплату…', text: 'Обычно это занимает несколько секунд' });
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    await loadProfile();
    const now = Cloud.profile && Cloud.profile.premium_until ? new Date(Cloud.profile.premium_until) : new Date(0);
    if (now > before) {
      localStorage.removeItem('lifegame.payPending');
      celebrate(`<div class="cel-badge">${icon('crown', 64)}</div><div class="eyebrow">Оплата прошла</div><h2>Игра в жизнь+</h2>
        <p>Доступ открыт до ${now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}. Спасибо, что поддерживаешь проект!</p>`, 'win');
      safeRender();
      return;
    }
  }
  toast({ icon: 'info', title: 'Оплата ещё обрабатывается', text: 'Доступ откроется сам. Если нет — напиши на nick.ditski@yandex.ru' });
}

/* экран-заглушка для закрытого раздела */
function lockedView(title, text, ic = 'crown') {
  return `<div class="page-h"><div><div class="eyebrow">${icon('crown', 14)} Игра в жизнь+</div><h1>${esc(title)}</h1><p>${text}</p></div></div>
    <div class="card glow" style="text-align:center;padding:48px 22px">
      <div class="brand-mark" style="width:72px;height:72px;border-radius:22px;margin:0 auto 18px">${icon(ic, 32)}</div>
      <h2 style="margin:0 0 8px;font-family:var(--font-d);font-weight:500;font-size:22px">Доступно по подписке</h2>
      <p class="muted" style="max-width:380px;margin:0 auto 22px">${premiumState().kind === 'guest' ? 'Войди в аккаунт — первые 7 дней всё открыто бесплатно.' : 'Оформи подписку, чтобы открыть этот раздел. Весь прогресс сохранён.'}</p>
      <button class="btn primary" data-act="paywall">${icon('sparkle', 16)} Открыть</button>
    </div>`;
}

/* карточка в настройках */
function accountCard() {
  const st = premiumState();
  const statusTxt = { ok: 'синхронизировано', syncing: 'синхронизация…', error: 'нет связи — сохраним позже', off: '', unavailable: 'облако недоступно' }[Cloud.status] || '';
  const subTxt = st.kind === 'open' ? '' : st.kind === 'premium' ? `Подписка активна до ${new Date(st.until).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : st.kind === 'trial' ? `Пробный период до ${new Date(st.until).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}` : 'Бесплатная версия';
  return `<div class="card"><div class="card-h"><h3>${icon('user', 18)} Аккаунт</h3>${Cloud.user ? `<span class="delta ${Cloud.status === 'error' ? 'warn' : 'up'}">${statusTxt}</span>` : ''}</div>
    ${Cloud.user ? `<div class="li" style="padding-top:0"><div class="avatar" style="width:40px;height:40px">${esc((Cloud.user.email || '?')[0].toUpperCase())}</div>
        <div class="grow"><b>${esc(Cloud.user.email || '')}</b><small>${Cloud.lastSync ? 'последняя синхронизация: ' + new Date(Cloud.lastSync).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'прогресс в облаке'}</small></div></div>
        ${subTxt ? `<div class="callout ${st.active ? 'acc' : ''} mt">${icon('crown', 16)}<div><b>${subTxt}</b>${!st.active || st.kind === 'trial' ? ' · <a href="#" data-act="paywall" style="text-decoration:underline">Оформить подписку</a>' : ''}</div></div>` : ''}
        <div class="row wrap mt"><button class="btn sm" data-act="syncNow">${icon('refresh', 14)} Синхронизировать</button><button class="btn sm ghost" data-act="logout">Выйти</button></div>`
      : `<p class="muted" style="margin-top:0">Войди по почте — прогресс будет храниться в облаке, не пропадёт при смене телефона и синхронизируется с компьютером.</p>
        <button class="btn primary" data-act="login">${icon('user', 15)} Войти или создать аккаунт</button>
        <div class="sub mt">Фото «до/после» остаются только на устройстве и в облако не отправляются.</div>`}
    <div class="sub mt"><a href="legal/about.html" target="_blank" rel="noopener">О сервисе и тарифы</a> · <a href="legal/offer.html" target="_blank" rel="noopener">Оферта</a> · <a href="legal/privacy.html" target="_blank" rel="noopener">Конфиденциальность</a></div>
  </div>`;
}
ACTIONS.syncNow = async () => { await cloudPush(true); if (Cloud.status === 'ok') toast({ icon: 'check', title: 'Синхронизировано' }); };
