/* Аккаунт: вход по коду, подписка, замки на платных функциях */
'use strict';

/* ---------- вход ---------- */
let loginEmail = '';
function openLogin(sub = 'Прогресс будет храниться в облаке и не потеряется при смене телефона.') {
  if (!Cloud.sb) { toast({ icon: 'alert', title: 'Облако недоступно', text: 'Проверь интернет и попробуй ещё раз' }); return; }
  openModal(`${modalHead('Вход', sub)}
    <form data-form="loginEmail" class="stack">
      <label class="field"><span>Почта</span><input class="input" type="email" name="email" value="${esc(loginEmail)}" placeholder="you@mail.ru" autocomplete="email" required autofocus></label>
      <button class="btn primary block">Получить код</button>
      <div class="sub">Пароль не нужен: пришлём письмо для входа. Если аккаунта ещё нет — он создастся.</div>
    </form>`);
}
ACTIONS.login = () => { openLogin(); return false; };
FORMS.loginEmail = async (d, form) => {
  loginEmail = d.email.trim().toLowerCase();
  const btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Отправляем…';
  try { await cloudSendCode(loginEmail); }
  catch (e) {
    btn.disabled = false; btn.textContent = 'Получить код';
    toast({ icon: 'alert', title: 'Не удалось отправить код', text: /rate|limit|seconds/i.test(e.message) ? 'Слишком часто. Подожди минуту и попробуй снова.' : e.message });
    return false;
  }
  openModal(`${modalHead('Проверь почту', `Отправили письмо на ${esc(loginEmail)}. Оно может прийти в «Спам».`)}
    <form data-form="loginCode" class="stack">
      <div class="callout">${icon('info', 16)}<div>Нажми в письме <b>«Sign in»</b> — откроется приложение, и ты войдёшь. Если в письме есть код из 6 цифр, можно ввести его здесь.</div></div>
      <input class="input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000" required style="text-align:center;font-size:24px;letter-spacing:.3em;height:58px">
      <button class="btn primary block">Войти по коду</button>
      <button type="button" class="btn ghost block" data-act="login">Другая почта</button>
    </form>`);
  return false;
};
FORMS.loginCode = async (d, form) => {
  const btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Проверяем…';
  try {
    await cloudVerify(loginEmail, d.code.replace(/\D/g, ''));
    closeModal(true);
    toast({ icon: 'check', title: 'Готово, ты в аккаунте', text: 'Прогресс сохраняется в облаке' });
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Войти по коду';
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
    <div class="grid g2 keep mb">${plan('month', 'Месяц', PRICES.month, 'продление каждый месяц', '')}${plan('year', 'Год', PRICES.year, `≈${fmtNum(Math.round(PRICES.year / 12))} ₽ в месяц`, '−' + Math.round((1 - PRICES.year / (PRICES.month * 12)) * 100) + '%')}</div>
    ${cta}
    <div class="sub" style="text-align:center;margin-top:12px">${st.kind === 'expired' ? 'Пробный период закончился. Весь прогресс на месте.' : 'Отменить можно в любой момент в настройках.'}</div>
    <div class="row" style="justify-content:center;margin-top:8px"><button class="btn ghost sm" data-act="closeModal">Не сейчас</button></div>`);
}
ACTIONS.paywall = () => { openPaywall(); return false; };
ACTIONS.payPlan = el => { payPlan = el.dataset.v; openPaywall(); return false; };
ACTIONS.payLogin = () => { openLogin('Войди — и 7 дней всё будет открыто бесплатно.'); return false; };
ACTIONS.payStart = () => {
  if (!BILLING.payments) { toast({ icon: 'clock', title: 'Оплата появится совсем скоро', text: 'Мы подключаем приём платежей' }); return false; }
  return false;   // здесь будет переход на страницу оплаты
};

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
  </div>`;
}
ACTIONS.syncNow = async () => { await cloudPush(true); if (Cloud.status === 'ok') toast({ icon: 'check', title: 'Синхронизировано' }); };
