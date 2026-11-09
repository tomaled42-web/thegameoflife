/* Каркас приложения: маршруты, навигация, бегущая строка, напоминания */
'use strict';

let route = { name: 'home', arg: null };
let lastRouteKey = null;
let justQuest = null;

const ROUTES = {
  home: () => renderHome(),
  sections: () => renderSections(),
  s: id => renderSection(id),
  arena: () => renderArena(),
  'arena-new': () => renderBossForm(),
  boss: id => renderBoss(id),
  stats: () => renderStats(),
  profile: () => renderProfile(),
  settings: () => renderSettings(),
};

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, arg] = h.split('/');
  route = ROUTES[name] ? { name, arg: arg ? decodeURIComponent(arg) : null } : { name: 'home', arg: null };
}
function go(path) { if (location.hash !== '#/' + path) location.hash = '#/' + path; else render(); }

function render() {
  const key = route.name + '/' + (route.arg || '');
  const isNew = key !== lastRouteKey;
  const view = $('#view');
  let html;
  try {
    if (['arena', 'arena-new', 'boss'].includes(route.name) && !isPremium()) html = lockedView('Арена', 'Большие цели становятся боссами. Каждое действие — удар.', 'swords');
    else if (route.name === 's' && sectionById(route.arg) && !sectionUnlocked(route.arg)) html = lockedView(sectionById(route.arg).name, `В бесплатной версии доступны ${FREE_SECTIONS} раздела. Выбрать их можно порядком в «Разделах».`, sectionById(route.arg).icon);
    else html = ROUTES[route.name](route.arg);
  }
  catch (e) { console.error(e); html = `<div class="card mt2">${emptyState('alert', 'Что-то пошло не так при отрисовке экрана. Данные в порядке.<br><small>' + esc(e.message) + '</small>')}</div>`; }
  view.innerHTML = topbar() + html;
  view.classList.toggle('enter', isNew);
  view.querySelectorAll('.card, .reveal').forEach((c, i) => c.style.setProperty('--i', Math.min(i, 12)));
  if (isNew) { window.scrollTo(0, 0); lastRouteKey = key; }
  renderSidebar(); renderBottomNav();
  animateAfterRender(view);
  if (window.afterViewRender) { const f = window.afterViewRender; window.afterViewRender = null; f(); }
  justQuest = null;
}
const rerender = () => render();

/* ---------- верхняя панель ---------- */
function topbar() {
  const names = { home: 'Главная', sections: 'Разделы', s: 'Разделы', arena: 'Арена', 'arena-new': 'Арена', boss: 'Арена', stats: 'Статистика', profile: 'Профиль', settings: 'Настройки' };
  const groups = { home: 'Обзор', stats: 'Обзор', profile: 'Персонаж', settings: 'Система', arena: 'Игра', 'arena-new': 'Игра', boss: 'Игра', sections: 'Жизнь', s: 'Жизнь' };
  const li = levelInfo(), nm = S.profile.name || 'Герой';
  return `<div class="topbar">
    <div class="crumbs">${icon('home', 18)}<span>${groups[route.name]}</span><span>/</span><b>${names[route.name]}</b></div>
    <div class="m-only"><div class="row"><div class="avatar" style="width:36px;height:36px">${esc(nm[0].toUpperCase())}</div><div><b style="font-weight:500;display:block;line-height:1.2">${esc(nm)}</b><small class="dim">Ур. ${li.level} · ${esc(currentTitle())}</small></div></div></div>
    <div class="top-actions">
      <button class="icon-btn" data-act="nav" data-to="settings" aria-label="Напоминания">${icon('bell', 18)}</button>
      <button class="icon-btn d-only" data-act="nav" data-to="settings" aria-label="Настройки">${icon('settings', 18)}</button>
      <button class="who d-only" data-act="nav" data-to="profile"><div class="avatar">${esc(nm[0].toUpperCase())}</div><div style="text-align:left"><b>${esc(nm)}</b><small>Ур. ${li.level} · ${esc(currentTitle())}</small></div></button>
    </div>
  </div>`;
}

/* ---------- боковая панель ---------- */
function renderSidebar() {
  const r = route.name, nm = S.profile.name || 'Герой', last = lastActiveDay();
  const item = (to, ic, label, extra = '', active = r === to) =>
    `<button class="nav-item ${active ? 'active' : ''}" data-act="nav" data-to="${to}">${icon(ic, 19)}<span>${label}</span>${extra}</button>`;
  const activeBosses = S.bosses.filter(b => b.status === 'active').length;
  const li = levelInfo();
  $('#sidebar').innerHTML = `
    <div class="brand"><div class="brand-mark">${icon('sparkle', 18)}</div><div><b>Игра в жизнь</b><small>Личная RPG · 3.0</small></div></div>
    <div class="side-hello"><h3>С возвращением,<br>${esc(nm)}</h3><p>Последняя активность: ${last ? relDay(last) : 'ещё впереди'}</p></div>
    <div class="nav-group">Обзор</div>
    ${item('home', 'grid', 'Главная')}
    ${item('stats', 'chart', 'Статистика')}
    ${item('profile', 'user', 'Персонаж', `<span class="count">${li.level}</span>`)}
    <div class="nav-group">Игра</div>
    ${item('arena', 'swords', 'Арена', activeBosses ? `<span class="count">${activeBosses}</span>` : '', ['arena', 'arena-new', 'boss'].includes(r))}
    <div class="nav-group" style="display:flex;justify-content:space-between;align-items:center">Разделы<button class="icon-btn sm plain" data-act="nav" data-to="sections" aria-label="Управлять разделами" style="width:24px;height:24px">${icon('plus', 14)}</button></div>
    ${visibleSections().map(s => `<button class="nav-item ${r === 's' && route.arg === s.id ? 'active' : ''}" data-act="nav" data-to="s/${s.id}"><span class="sec-ic" style="--sc:${s.color}">${icon(s.icon, 19)}</span><span>${esc(s.name)}</span>${!sectionUnlocked(s.id) ? `<span class="count" style="margin-left:auto">${icon('crown', 12)}</span>` : sectionDoneToday(s) ? `<span class="dot" style="background:${s.color}"></span>` : ''}</button>`).join('')}
    ${item('sections', 'menu', 'Все разделы', '', r === 'sections')}
    <div class="side-foot">
      <div class="nav-group">Система</div>
      ${item('settings', 'settings', 'Настройки')}
      <div class="card tight flat mt" style="border-radius:18px">
        <div class="row between"><span class="label">Уровень ${li.level}</span><span class="sub">${fmtNum(li.left)} XP</span></div>
        <div class="mt" style="margin-top:10px">${bar(li.pct, 'side-xp', { cls: 'thin acc' })}</div>
      </div>
    </div>`;
}
function sectionDoneToday(s) {
  const dq = questsOf(s.id, 'daily');
  return dq.length && dq.every(x => questStatus(x).done);
}

/* ---------- нижняя навигация ---------- */
function renderBottomNav() {
  const r = route.name;
  const b = (to, ic, label, act) => `<button class="${act ? 'active' : ''}" data-act="nav" data-to="${to}">${icon(ic, 22)}<span>${label}</span></button>`;
  $('#bottomNav').innerHTML =
    b('home', 'grid', 'Главная', r === 'home') +
    b('sections', 'leaf', 'Разделы', r === 'sections' || r === 's') +
    b('arena', 'swords', 'Арена', ['arena', 'arena-new', 'boss'].includes(r)) +
    b('stats', 'chart', 'Статистика', r === 'stats') +
    b('profile', 'user', 'Персонаж', r === 'profile' || r === 'settings');
}

/* ---------- обработка событий ---------- */
document.addEventListener('pointerdown', e => { lastTap = { x: e.clientX, y: e.clientY }; }, { passive: true });
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  e.preventDefault(); e.stopPropagation();
  const r = fn(el, e);
  if (r instanceof Promise) r.then(v => { if (v !== false) { render(); flushFx(); } });
  else if (r !== false) { render(); flushFx(); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(f));
  const r = FORMS[f.dataset.form](data, f);
  const fin = v => { if (v !== false) { render(); flushFx(); } };
  if (r instanceof Promise) r.then(fin); else fin(r);
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (el && INPUTS[el.dataset.input]) INPUTS[el.dataset.input](el, e);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && INPUTS[el.dataset.change]) { const r = INPUTS[el.dataset.change](el, e); if (r !== false) { render(); flushFx(); } }
});
document.addEventListener('pointermove', e => {
  const c = e.target.closest('.chart'); if (c) chartPointer(c, e.clientX);
}, { passive: true });
document.addEventListener('pointerdown', e => {
  const c = e.target.closest('.chart'); if (c) chartPointer(c, e.clientX);
}, { passive: true });
document.addEventListener('pointerout', e => {
  const c = e.target.closest('.chart');
  if (c && !c.contains(e.relatedTarget)) { const cur = c.querySelector('.ccur'); if (cur) cur.style.display = 'none'; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

ACTIONS.nav = el => { go(el.dataset.to); return false; };
ACTIONS.questUndo = el => { const qq = S.quests.find(x => x.id === el.dataset.id); if (qq) undoQuest(qq); };
ACTIONS.quest = el => {
  const id = el.dataset.id;
  const qq = S.quests.find(x => x.id === id);
  if (qq && qq.kind === 'goal' && !questStatus(qq).done) {
    return confirmDialog({ title: 'Цель достигнута?', text: `«${qq.title}» — отметить как выполненную? Это принесёт ${qq.xp} XP.`, ok: 'Да, выполнено' })
      .then(ok => { if (ok) { toggleQuest(id); justQuest = id; } });
  }
  toggleQuest(id);
  justQuest = id;
};

/* ---------- смена дня, напоминания ---------- */
function checkDay() {
  if (S.lastOpen !== today()) { rollover(); render(); flushFx(); showComeback(); }
  checkReminder();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });
setInterval(checkDay, 60 * 1000);

function reminderText() {
  const s = momentumStreak();
  if (s >= 1) return `Твоему импульсу ${s} ${pDays(s)}. Одно задание, и он продолжится.`;
  if (S.momentum.best > 0) return 'Самое время начать новую серию. Одно небольшое задание — и импульс снова горит.';
  return 'Одно маленькое дело сегодня — и твой персонаж станет чуть сильнее.';
}
function checkReminder() {
  const r = S.settings.reminders;
  if (!r.enabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), t = today();
  if (!r.days.includes(now.getDay())) return;
  if ((S.days[t] || {}).acts > 0) return;
  const hm = now.toTimeString().slice(0, 5);
  const sent = JSON.parse(localStorage.getItem('lifegame.sent') || '{}');
  for (const [slot, time] of [['a', r.time], ['b', r.second ? r.secondTime : null]]) {
    if (!time || hm < time || sent[t + slot]) continue;
    sent[t + slot] = 1;
    localStorage.setItem('lifegame.sent', JSON.stringify(sent));
    showNotification('Игра в жизнь', reminderText());
    break;
  }
}
function showNotification(title, body) {
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'lifegame-reminder' };
  if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(reg => reg.showNotification(title, opts));
  else try { new Notification(title, opts); } catch (e) { }
}

/* ---------- первый запуск и возвращение ---------- */
function showOnboarding() {
  openModal(`${modalHead('Добро пожаловать', 'Это твоя личная ролевая игра. Каждое полезное действие в реальной жизни даёт опыт.')}
    <form data-form="onboard" class="stack">
      <label class="field"><span>Как к тебе обращаться?</span><input class="input" name="name" placeholder="Имя" maxlength="24" autofocus required></label>
      <div class="callout acc">${icon('flame', 18)}<div><b>Импульс</b> — твоя главная серия. Достаточно одного задания в день, чтобы её сохранить. Щиты прикроют, если день не задался.</div></div>
      <div class="modal-f"><button class="btn primary block">Начать игру</button></div>
      <button type="button" class="btn ghost block" data-act="login">У меня уже есть аккаунт — войти</button>
    </form>`, { onClose: () => { } });
}
FORMS.onboard = d => {
  S.profile.name = (d.name || '').trim() || 'Герой';
  saveState();
  toast({ icon: 'sparkle', title: `Привет, ${S.profile.name}`, text: 'Отметь первое задание — и импульс загорится.' });
  // окно не закрываем, а плавно превращаем в предложение подписки
  if (BILLING.paywall && !Cloud.user && !S.offerSeen) showWelcomeOffer(); else closeModal(true);
  return false;
};
function showComeback() {
  if (!S.comeback || S.comeback.shown) return;
  S.comeback.shown = true; saveState();
  const g = S.comeback.gap;
  openModal(`<div style="text-align:center;padding:10px 0 4px">
      <div class="cel-badge" style="width:96px;height:96px;margin:0 auto 18px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.16),rgba(40,30,44,.6) 65%);border:1px solid var(--line-2)">${icon('sun', 40)}</div>
      <h2 style="margin:0;font-family:var(--font-d);font-weight:400;font-size:28px;letter-spacing:-.03em">Рады тебя видеть, ${esc(S.profile.name || 'герой')}</h2>
      <p class="muted" style="max-width:380px;margin:10px auto 0">Тебя не было ${g} ${pDays(g)}. Так бывает у всех — главное, что ты здесь. Весь опыт и достижения на месте.</p>
    </div>
    <div class="card flat mt2" style="border-radius:20px">
      <div class="label mb">Лёгкий план на возвращение</div>
      <div class="list">
        <div class="li">${icon('check', 18)}<div class="grow"><b>День 1</b><small>Одно любое задание — этого достаточно</small></div></div>
        <div class="li">${icon('check', 18)}<div class="grow"><b>День 2</b><small>Два задания из любимого раздела</small></div></div>
        <div class="li">${icon('check', 18)}<div class="grow"><b>День 3</b><small>Половина ежедневных заданий</small></div></div>
      </div>
      <div class="callout acc mt">${icon('zap', 18)}<div>Три дня опыт идёт с бонусом <b>×1,5</b>.</div></div>
    </div>
    <div class="modal-f"><button class="btn primary block" data-act="closeModal">Вернуться в игру</button></div>`);
}

/* ---------- запуск ---------- */
window.addEventListener('hashchange', () => { parseHash(); render(); flushFx(); });
parseHash();
rollover();
cloudInit();
render();
setTimeout(() => {
  flushFx();
  if (!S.profile.name) showWelcome(); else showComeback();
}, 350);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').then(async reg => {
    try {
      if ('periodicSync' in reg && S.settings.reminders.enabled) await reg.periodicSync.register('lifegame-reminder', { minInterval: 60 * 60 * 1000 });
    } catch (e) { }
  }).catch(() => { });
}
