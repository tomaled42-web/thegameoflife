/* Первое знакомство: приветствие, демо-режим с готовым прогрессом и обучение с подсветкой */
'use strict';

/* ---------- демо-режим: чужой «прокачанный» герой, свои данные не трогаются ---------- */
let DEMO = false, demoBackup = null;

function buildDemoState() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const s = defaultState(), t = today(), D = 62;
  s.profile.name = 'Алекс';
  s.createdAt = addDays(t, -D);
  const secStat = id => (s.sections.find(x => x.id === id) || {}).stat || null;
  const ev = (d, k, sec, xp, extra = {}) => {
    const e = { id: uid(), d, t: parseDay(d).getTime() + 9 * 36e5 + Math.floor(rnd() * 12 * 36e5), k, q: null, s: sec, xp, stat: sec ? secStat(sec) : null, note: '', ...extra };
    s.events.push(e); s.xp += xp; if (e.stat) s.statXp[e.stat] += xp;
    if (ACT_KINDS.includes(k)) { const r = s.days[d] || (s.days[d] = { acts: 0, login: true }); r.acts++; r.first = true; }
  };
  const daily = s.quests.filter(x => x.kind === 'daily');
  const weekly = s.quests.filter(x => x.kind === 'weekly');
  const skip = new Set([addDays(t, -40), addDays(t, -33), addDays(t, -29)]);   // пара пропусков давно — серия последних недель целая

  for (let i = D; i >= 0; i--) {
    const d = addDays(t, -i);
    s.days[d] = { acts: 0, login: true };
    ev(d, 'bonus', null, 10, { note: 'Бонус за вход' });
    if (skip.has(d)) continue;
    const n = i === 0 ? 3 : 3 + Math.floor(rnd() * 4);
    const done = [...daily].sort(() => rnd() - .5).slice(0, n);
    for (const q of done) ev(d, 'quest', q.sectionId, q.xp, { q: q.id, note: q.title });
    ev(d, 'bonus', null, 15, { note: 'Первое задание дня' });
    s.momentum.cover[d] = 'active';
    if (parseDay(d).getDay() === 0) for (const q of weekly.slice(0, 3)) ev(d, 'quest', q.sectionId, q.xp, { q: q.id, note: q.title });
  }
  s.momentum.best = 29; s.momentum.shields = 2; s.momentum.checked = addDays(t, -1);

  // вес: 92 → около 86, с обычными скачками воды
  Object.assign(s.weight, { start: 92, goal: 82, step: 5 });
  for (let i = D; i >= 0; i -= 2 + Math.floor(rnd() * 2)) {
    const kg = 92 - (D - i) * 0.095 + (rnd() - .5) * 0.9;
    s.weight.entries.push({ d: addDays(t, -i), kg: Math.round(kg * 10) / 10 });
    ev(addDays(t, -i), 'tracker', 'weight', 5, { note: 'Взвешивание' });
  }
  s.weight.milestones = [{ n: 1, d: addDays(t, -9) }];
  s.weight.measures = [{ d: addDays(t, -56), waist: 98, chest: 104, hips: 106 }, { d: addDays(t, -28), waist: 95, chest: 103, hips: 104 }, { d: addDays(t, -2), waist: 92.5, chest: 102, hips: 102.5 }];

  // тренировки 3–4 раза в неделю
  for (let i = D; i >= 0; i--) {
    const wd = parseDay(addDays(t, -i)).getDay();
    if (![1, 3, 5, 6].includes(wd) || (wd === 6 && rnd() < .5)) continue;
    const type = pick(['strength', 'strength', 'cardio', 'hiit', 'stretch']), min = pick([30, 45, 45, 60]), effort = 1 + Math.floor(rnd() * 3);
    s.workouts.list.push({ id: uid(), d: addDays(t, -i), t: Date.now(), type, min, effort });
    ev(addDays(t, -i), 'tracker', 'workout', woXp(min, effort), { note: 'Тренировка' });
  }

  // чтение
  s.reading.books = [
    { id: uid(), added: addDays(t, -60), title: 'Атомные привычки', author: 'Джеймс Клир', pages: 304, read: 304, status: 'done', finished: addDays(t, -31) },
    { id: uid(), added: addDays(t, -30), title: 'Сила воли', author: 'Келли Макгонигал', pages: 320, read: 188, status: 'now' },
    { id: uid(), added: addDays(t, -10), title: 'Поток', author: 'Михай Чиксентмихайи', pages: 464, read: 0, status: 'want' },
  ];
  for (let i = D; i >= 0; i--) if (rnd() < .8) s.reading.log.push({ d: addDays(t, -i), pages: 12 + Math.floor(rnd() * 20), min: 20, book: null });

  for (let i = 40; i >= 0; i--) if (rnd() < .75) s.meditation.sessions.push({ d: addDays(t, -i), min: pick([10, 10, 15]), t: Date.now() });
  s.abstinence.counters = [{ id: uid(), name: 'Без сахара', start: addDays(t, -29), best: 29, resets: [], awarded: [1, 3, 7, 14] }];

  const notes = ['Хороший день, сделал всё по плану', 'Устал, но тренировку не пропустил', 'Заметил, что стало легче вставать', 'Читал перед сном вместо телефона', 'Спокойный день'];
  for (let i = 20; i >= 0; i--) if (rnd() < .8) s.journal[addDays(t, -i)] = { text: pick(notes), mood: 3 + Math.floor(rnd() * 3), energy: 3 + Math.floor(rnd() * 3) };
  const thanks = ['Семья рядом', 'Солнечное утро', 'Вкусный завтрак', 'Тренировка удалась', 'Разговор с другом', 'Тёплый дом'];
  for (let i = 14; i >= 0; i--) if (rnd() < .8) s.gratitude[addDays(t, -i)] = [...thanks].sort(() => rnd() - .5).slice(0, 3);

  for (let i = 20; i >= 0; i--) for (const acc of s.content.accounts) if (rnd() < .8) s.content.posts.push({ d: addDays(t, -i), t: Date.now(), acc, fromStock: false, ev: null });
  s.content.stock = 3;
  s.content.followers = [{ d: addDays(t, -28), p: { TikTok: 820, Instagram: 410 } }, { d: addDays(t, -14), p: { TikTok: 1240, Instagram: 530 } }, { d: addDays(t, -1), p: { TikTok: 1910, Instagram: 690 } }];

  s.events.sort((a, b) => a.t - b.t);
  s.lastOpen = t;
  return s;
}

function demoBoss() {
  const d = { ...newDraft(), sectionId: 'weight', name: 'Гора: минус 10 кг', icon: 'mountain', type: 'reach', metric: 'weight', start: 92, target: 82, deadline: addDays(today(), 55) };
  const a = assessBoss(d);
  return {
    id: uid(), name: d.name, icon: d.icon, color: d.color, sectionId: d.sectionId, type: d.type, metric: d.metric, arg: '', start: d.start, target: d.target,
    startDate: addDays(today(), -45), deadline: d.deadline, rules: { ...d.rules }, streakBonus: true, stats: [...d.stats], tier: a.tier || 2, maxHp: a.hp || 1800,
    phases: a.phases || [], reward: { xp: a.xp || 700, title: 'Покоритель вершин' }, act: Math.round((a.hp || 1800) * 0.16), regen: 0, hits: 64, phasesHit: [], status: 'active', lastHit: today(),
  };
}

function enterDemo() {
  if (DEMO) return;
  demoBackup = S;
  S = buildDemoState();
  DEMO = true;
  eventsVersion++;
  try { S.bosses.push(demoBoss()); } catch (e) { console.warn('demo boss', e); }
  // уже пройденные фазы босса и заработанные достижения засчитываем сразу, а не на первом нажатии
  try { checkBosses(); checkAchievements(true); } catch (e) { }
  FX.length = 0;
  document.body.classList.add('demo');
  showDemoBar();
  render();
}
function exitDemo() {
  if (!DEMO) return;
  S = demoBackup || loadState(); demoBackup = null;
  DEMO = false; eventsVersion++;
  FX.length = 0;
  document.body.classList.remove('demo');
  const bar = document.getElementById('demoBar'); if (bar) bar.remove();
  endTour(true);
  go('');
}
function showDemoBar() {
  if (document.getElementById('demoBar')) return;
  const bar = document.createElement('div');
  bar.id = 'demoBar'; bar.className = 'demo-bar';
  bar.innerHTML = `<span class="live"></span><span class="grow">Демо: так выглядит игра через 2 месяца</span><button class="btn xs primary" data-act="demoStart">Начать свою</button>`;
  document.body.appendChild(bar);
}
ACTIONS.demoStart = () => { exitDemo(); startOwnGame(); return false; };

/* после демо или «сразу начать»: имя → предложение пробного периода */
function startOwnGame() {
  if (!S.profile.name) showOnboarding();
  else if (BILLING.paywall && !Cloud.user) showWelcomeOffer();
}

/* ---------- приветствие ---------- */
function showWelcome() {
  openModal(`<div class="welcome">
      <div class="welcome-art"><div class="orb-demo">${icon('flame', 34)}</div></div>
      <div class="eyebrow">Добро пожаловать</div>
      <h2>Твоя жизнь — это игра.<br>Пора её прокачать</h2>
      <p class="muted">Каждое полезное дело даёт опыт. Растут уровни и характеристики, серии дней зажигают импульс, а большие цели становятся боссами.</p>
      <div class="welcome-points">
        <div>${icon('check', 16)}<span>Отмечай простые задания</span></div>
        <div>${icon('zap', 16)}<span>Получай опыт и уровни</span></div>
        <div>${icon('swords', 16)}<span>Побеждай боссов-целей</span></div>
      </div>
      <button class="btn primary block" data-act="welcomeDemo">${icon('eye', 16)} Посмотреть, как это выглядит</button>
      <button class="btn ghost block" style="margin-top:8px" data-act="welcomeSkip">Сразу начать</button>
      <button type="button" class="btn ghost sm" style="margin-top:4px" data-act="login">У меня уже есть аккаунт</button>
    </div>`, { onClose: () => { } });
}
ACTIONS.welcomeDemo = () => { closeModal(true); startTour(); return false; };
ACTIONS.welcomeSkip = () => { closeModal(true); showOnboarding(); return false; };
ACTIONS.tourReplay = () => { startTour(); return false; };

/* ---------- обучение: подсвечиваем главное, остальное размываем ---------- */
const cardByTitle = txt => [...document.querySelectorAll('#view .card')].find(c => { const h = c.querySelector('.card-h h3'); return h && h.textContent.includes(txt); });
const TOUR = [
  { route: '', el: () => document.querySelector('#view .g-hero > .card'), title: 'Импульс — твоя серия', text: 'Одно задание в день — и огонь не гаснет. Чем длиннее серия, тем больше опыта за каждое дело: ×1,2 с недели, ×1,5 с месяца. Щиты прикроют, если день не задался.' },
  { route: '', el: () => document.querySelector('#view .quests .quest'), title: 'Задания на сегодня', text: 'Простые дела из твоих разделов: шаги, вода, чтение, тренировка. Нажал на кружок — получил опыт. Ниже весь список дня.' },
  { route: '', el: () => cardByTitle('Персонаж'), title: 'Уровни и титулы', text: 'Опыт копится в уровни: от Новичка до Легенды. По пути открываются титулы и достижения.' },
  { route: 'sections', el: () => document.querySelector('#view .grid > *') || document.querySelector('#view .card'), title: 'Разделы — сферы жизни', text: 'Вес, тренировки, чтение, медитация и другие. В каждом — свои графики, рекорды и задания. Можно добавить свой раздел.' },
  { route: 's/weight', el: () => document.querySelector('#view .g-hero > .card'), title: 'Видно, как ты меняешься', text: 'Прогресс к цели, графики и этапы. Здесь Алекс уже сбросил 6 кг — и каждый этап принёс награду.' },
  { route: 'arena', el: () => document.querySelector('#view .boss, #view .card'), title: 'Арена: цели — это боссы', text: 'Большая цель превращается в босса со здоровьем. Каждое полезное действие — удар. Победишь к сроку — получишь награду и титул.' },
  { route: 'stats', el: () => document.querySelector('#view .card'), title: 'Статистика', text: 'Опыт по дням, рост характеристик, лучшие недели. Всё, чтобы видеть: ты правда становишься сильнее.' },
  { route: 'profile', el: () => document.querySelector('#view .card'), title: 'Твой персонаж', text: 'Семь характеристик — тело, сила, интеллект, дух, воля, мастерство, влияние. Растут от твоих реальных дел.' },
];
let tourStep = -1;
function startTour() {
  enterDemo();
  tourStep = -1;
  nextTourStep();
}
function nextTourStep() {
  tourStep++;
  if (tourStep >= TOUR.length) { finishTour(); return; }
  const st = TOUR[tourStep];
  if (location.hash.replace(/^#\/?/, '') !== st.route) go(st.route);
  setTimeout(() => showTourStep(st), 380);
}
/* слой обучения создаётся один раз: затемнение, рамка и подсказка между шагами не пересоздаются, а перетекают */
function tourLayer() {
  let ov = document.getElementById('tour');
  if (ov) return ov;
  ov = document.createElement('div'); ov.id = 'tour'; ov.className = 'init';
  ov.innerHTML = `<div class="tour-veil"></div><div class="tour-ring"></div>
    <div class="tour-tip"><div class="tour-body"></div>
      <div class="row between"><button class="btn ghost sm" data-act="tourSkip">Пропустить</button><button class="btn primary sm" data-act="tourNext"><span class="tour-next">Дальше</span> ${icon('chevR', 14)}</button></div></div>`;
  document.body.appendChild(ov);
  return ov;
}
const hole = (x1, y1, x2, y2) => `polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,${x1}px ${y1}px,${x1}px ${y2}px,${x2}px ${y2}px,${x2}px ${y1}px,${x1}px ${y1}px)`;
let tourBusy = false;
function showTourStep(st) {
  const target = st.el();
  if (!target) { nextTourStep(); return; }
  tourBusy = true;
  const ov = tourLayer(), tip = ov.querySelector('.tour-tip'), body = ov.querySelector('.tour-body');
  ov.classList.add('moving');
  body.classList.add('out');
  // плавно докручиваем страницу к цели, а когда она встала — перетекаем рамкой и подсказкой
  const r0 = target.getBoundingClientRect();
  const need = r0.top < 70 || r0.bottom > innerHeight - 90;
  if (need) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => {
    const r = target.getBoundingClientRect(), pad = 8, vw = innerWidth, vh = innerHeight;
    const x1 = Math.max(4, r.left - pad), y1 = Math.max(4, r.top - pad), x2 = Math.min(vw - 4, r.right + pad), y2 = Math.min(vh - 4, r.bottom + pad);
    ov.querySelector('.tour-veil').style.clipPath = hole(x1, y1, x2, y2);
    Object.assign(ov.querySelector('.tour-ring').style, { left: x1 + 'px', top: y1 + 'px', width: x2 - x1 + 'px', height: y2 - y1 + 'px' });
    body.innerHTML = `<div class="tour-dots">${TOUR.map((_, i) => `<i class="${i === tourStep ? 'on' : i < tourStep ? 'done' : ''}"></i>`).join('')}</div><h3>${st.title}</h3><p>${st.text}</p>`;
    ov.querySelector('.tour-next').textContent = tourStep === TOUR.length - 1 ? 'Готово' : 'Дальше';
    // подсказка под целью, над ней или, если цель крупная, внизу экрана поверх неё
    const th = tip.offsetHeight, bottomGap = 16 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-b')) || 0);
    const top = vh - y2 > th + 24 ? y2 + 14 : y1 > th + 24 ? y1 - 14 - th : vh - th - bottomGap;
    tip.style.top = Math.round(top) + 'px';
    body.classList.remove('out');
    ov.classList.remove('moving');
    // первый шаг появляется на месте, без «прилёта» рамки из угла
    if (ov.classList.contains('init')) { void ov.offsetWidth; setTimeout(() => ov.classList.remove('init'), 40); }
    tourBusy = false;
  }, need ? 520 : 60);
}
function endTour() {
  tourStep = -1; tourBusy = false;
  const ov = document.getElementById('tour'); if (!ov) return;
  ov.removeAttribute('id'); ov.classList.add('leaving');
  setTimeout(() => ov.remove(), 320);
}
/* финал обучения: свой прогресс начинается с имени, затем — предложение подписки */
function finishTour() {
  endTour();
  exitDemo();
  const html = `<div class="welcome">
      <div class="welcome-art"><div class="orb-demo">${icon('trophy', 34)}</div></div>
      <div class="eyebrow">Это может быть твой прогресс</div>
      <h2>Через пару месяцев ты можешь стать совсем другой версией себя</h2>
      <p class="muted">Сильнее, спокойнее, собраннее — в том, что важно именно тебе: тело, книги, привычки, своё дело. Начни с одного задания сегодня, дальше игра поведёт сама.</p>
      ${S.profile.name ? `<button class="btn primary block" data-act="tourOffer">${icon('sparkle', 16)} Дальше</button>`
        : `<form data-form="tourName" class="stack" style="text-align:left">
        <label class="field"><span>Как к тебе обращаться?</span><input class="input" name="name" placeholder="Имя" maxlength="24" required></label>
        <button class="btn primary block">${icon('sparkle', 16)} Начать свою игру</button></form>`}
    </div>`;
  setTimeout(() => openModal(html, { onClose: () => { } }), 200);
}
FORMS.tourName = d => {
  S.profile.name = (d.name || '').trim() || 'Герой';
  saveState();
  toast({ icon: 'sparkle', title: `Привет, ${S.profile.name}`, text: 'Отметь первое задание — и импульс загорится.' });
  afterTourOffer();
  return false;
};
ACTIONS.tourOffer = () => { afterTourOffer(); return false; };
function afterTourOffer() {
  if (BILLING.paywall && premiumState().kind !== 'premium') showWelcomeOffer();
  else closeModal();
}
ACTIONS.tourNext = () => { if (!tourBusy) nextTourStep(); return false; };
ACTIONS.tourSkip = () => { finishTour(); return false; };
window.addEventListener('resize', () => { if (tourStep >= 0 && TOUR[tourStep] && !tourBusy) showTourStep(TOUR[tourStep]); });
