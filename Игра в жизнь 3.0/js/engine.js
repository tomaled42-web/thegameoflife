/* Игровой движок: опыт, уровни, импульс, щиты, награды, достижения, боссы */
'use strict';

const FX = [];               // очередь эффектов для интерфейса
const pushFx = fx => FX.push(fx);
let lastTap = null;          // координаты последнего нажатия (для «+XP»)

/* ================= Уровни и титулы ================= */
const xpForLevel = L => Math.round(80 * Math.pow(L - 1, 1.75));
const MAX_LEVEL = 60;
function levelInfo(xp = S.xp) {
  let L = 1;
  while (L < MAX_LEVEL && xp >= xpForLevel(L + 1)) L++;
  const a = xpForLevel(L), b = xpForLevel(L + 1);
  return { level: L, into: xp - a, need: b - a, left: b - xp, pct: L >= MAX_LEVEL ? 1 : (xp - a) / (b - a) };
}
const TITLES = [
  [1, 'Новичок'], [3, 'Ученик'], [5, 'Искатель'], [8, 'Путник'], [12, 'Воин'], [17, 'Ветеран'],
  [23, 'Мастер'], [30, 'Чемпион'], [38, 'Герой'], [45, 'Мифический'], [50, 'Легенда'],
];
function titleForLevel(L) { let t = TITLES[0][1]; for (const [l, n] of TITLES) if (L >= l) t = n; return t; }
function currentTitle() { return S.profile.title || titleForLevel(levelInfo().level); }
function nextTitle(L) { const n = TITLES.find(([l]) => l > L); return n ? { level: n[0], name: n[1] } : null; }
const statLevel = xp => Math.floor(Math.sqrt((xp || 0) / 40)) + 1;
function statProgress(xp) { const L = statLevel(xp); const a = 40 * (L - 1) ** 2, b = 40 * L ** 2; return (xp - a) / (b - a); }

/* ================= Дни и импульс ================= */
function dayRec(d = today()) { return S.days[d] || (S.days[d] = { acts: 0 }); }
const ACT_KINDS = ['quest', 'tracker', 'challenge'];

function streakEnding(d) {
  const c = S.momentum.cover; let n = 0;
  while (c[d]) { n++; d = addDays(d, -1); }
  return n;
}
function momentumStreak() {
  if (!S || !S.momentum) return 0;
  const t = today();
  return S.momentum.cover[t] ? streakEnding(t) : streakEnding(addDays(t, -1));
}
function multiplierFor(streak) { return streak >= 100 ? 2 : streak >= 30 ? 1.5 : streak >= 7 ? 1.2 : 1; }
function nextMultiplier(streak) {
  for (const [d, m] of [[7, 1.2], [30, 1.5], [100, 2]]) if (streak < d) return { days: d, mult: m, left: d - streak };
  return null;
}
const MOMENTUM_TIERS = [
  { min: 0, name: 'Спит', lvl: 0 }, { min: 1, name: 'Искра', lvl: 1 }, { min: 7, name: 'Пламя', lvl: 2 },
  { min: 30, name: 'Пожар', lvl: 3 }, { min: 100, name: 'Звезда', lvl: 4 }, { min: 365, name: 'Солнце', lvl: 5 },
];
function momentumTier(n) { let t = MOMENTUM_TIERS[0]; for (const x of MOMENTUM_TIERS) if (n >= x.min) t = x; return t; }
function nextMomentumTier(n) { return MOMENTUM_TIERS.find(t => t.min > n) || null; }
const restoreNeed = () => 2 * Math.max(2, S.settings.minTasks || 1);
function comebackActive() { return S.comeback && today() <= S.comeback.until; }
function xpMultiplier() {
  const m = multiplierFor(momentumStreak());
  return comebackActive() ? Math.max(m, 1.5) : m;
}
function lastActiveDay(exclude = null) {
  let best = null;
  for (const [d, r] of Object.entries(S.days)) if (r.acts > 0 && d !== exclude && (!best || d > best)) best = d;
  return best;
}

/* Проверка пропущенных дней — вызывается при открытии и смене даты */
function rollover() {
  const t = today(), y = addDays(t, -1), m = S.momentum;
  if (!m.checked) m.checked = addDays(S.createdAt, -1);
  for (let d = addDays(m.checked, 1); d <= y; d = addDays(d, 1)) {
    if (m.cover[d]) continue;
    const prev = streakEnding(addDays(d, -1));
    if (prev > 0 && m.shields > 0) {
      m.cover[d] = 'shield'; m.shields--;
      pushFx({ type: 'toast', icon: 'shield', title: 'Щит сохранил импульс', text: `Пропуск ${fmtDay(d)} прикрыт. Серия ${prev} ${pDays(prev)} цела.` });
    } else if (prev > 0) {
      m.broken = { day: d, prev };
    }
  }
  if (m.checked < y) m.checked = y;
  if (m.broken && addDays(m.broken.day, 1) < t) m.broken = null;

  // возвращение после перерыва
  const last = lastActiveDay();
  if (last && diffDays(last, t) >= 4 && !(S.comeback && S.comeback.start >= last)) {
    S.comeback = { start: t, until: addDays(t, 2), gap: diffDays(last, t) - 1, shown: false };
    if (m.broken) m.broken = null;
  }

  // ежедневный бонус за вход
  const r = dayRec(t);
  if (!r.login) {
    r.login = true;
    emit({ k: 'bonus', xp: 10, note: 'Бонус за вход', noMult: true });
    pushFx({ type: 'toast', icon: 'gift', title: 'Ежедневный бонус', text: '+10 XP за то, что заглянул. Хорошего дня.' });
  }

  // регенерация боссов при бездействии
  for (const b of S.bosses) {
    if (b.status !== 'active' || b.regenDay === t) continue;
    const idle = diffDays(b.lastHit || b.startDate, t);
    if (idle >= 3) b.regen = Math.min(b.maxHp * 0.15, (b.regen || 0) + b.maxHp * 0.015 * Math.min(idle - 2, b.regenDay ? diffDays(b.regenDay, t) : 1));
    b.regenDay = t;
  }
  S.lastOpen = t;
  if (typeof checkAbstMilestones === 'function') checkAbstMilestones();
  checkBosses();
  checkAchievements(true);
  saveState();
}

/* ================= События и опыт ================= */
function emit({ k, q = null, s = null, xp = 0, stat = null, note = '', tags = [], noMult = false, d = today(), extra = {} }) {
  const sec = s ? S.sections.find(x => x.id === s) : null;
  const mult = noMult || !ACT_KINDS.includes(k) ? 1 : xpMultiplier();
  const amount = Math.round(xp * mult);
  const ev = { id: uid(), d, t: Date.now(), k, q, s, xp: amount, stat: stat || (sec && sec.stat) || null, note, ...extra };
  const before = levelInfo().level;
  S.events.push(ev);
  S.xp += amount;
  if (ev.stat) S.statXp[ev.stat] = (S.statXp[ev.stat] || 0) + amount;
  eventsVersion++;

  if (ACT_KINDS.includes(k) && d === today()) {
    const r = dayRec(d);
    r.acts = (r.acts || 0) + 1;
    if (r.acts === 1) onFirstActivity();
    checkRestore();
    bossesOnAction(ev, tags);
  }
  if (amount > 0 && k !== 'bonus') pushFx({ type: 'xp', amount, mult });
  const after = levelInfo().level;
  if (after > before) pushFx({ type: 'levelup', level: after, title: titleForLevel(after), newTitle: titleForLevel(after) !== titleForLevel(before) });
  return ev;
}

function removeEvent(ev) {
  const i = S.events.indexOf(ev); if (i < 0) return;
  S.events.splice(i, 1);
  S.xp = Math.max(0, S.xp - ev.xp);
  if (ev.stat) S.statXp[ev.stat] = Math.max(0, (S.statXp[ev.stat] || 0) - ev.xp);
  eventsVersion++;
  if (ACT_KINDS.includes(ev.k) && S.days[ev.d]) {
    const r = S.days[ev.d];
    r.acts = Math.max(0, (r.acts || 0) - 1);
    if (r.acts === 0 && ev.d === today()) {
      if (S.momentum.cover[ev.d] === 'active') delete S.momentum.cover[ev.d];
      const fb = S.events.find(e => e.d === ev.d && e.note === 'Первое задание дня');
      if (fb) removeEvent(fb);
      r.first = false;
    }
  }
  for (const h of ev.hits || []) {
    const b = S.bosses.find(x => x.id === h.id);
    if (b && b.status === 'active') b.act = Math.max(0, (b.act || 0) - h.dmg);
  }
}

function onFirstActivity() {
  const t = today(), m = S.momentum, r = dayRec(t);
  const before = momentumStreak();
  m.cover[t] = 'active';
  const streak = momentumStreak();
  m.best = Math.max(m.best || 0, streak);
  if (!r.first) {
    r.first = true;
    emit({ k: 'bonus', xp: 15, note: 'Первое задание дня', noMult: true });
  }
  // щит за каждую полную неделю без пропусков
  let run = 0, d = t;
  while (m.cover[d] === 'active') { run++; d = addDays(d, -1); }
  if (run > 0 && run % 7 === 0 && m.lastShield !== t && m.shields < S.settings.maxShields) {
    m.shields++; m.lastShield = t;
    pushFx({ type: 'toast', icon: 'shield', title: 'Новый щит', text: `Неделя без пропусков. Щитов: ${m.shields} из ${S.settings.maxShields}.` });
  }
  if (streak > before) pushFx({ type: 'momentum', streak, tierUp: momentumTier(streak).lvl > momentumTier(before).lvl });
}

function checkRestore() {
  const m = S.momentum, t = today();
  if (!m.broken || addDays(m.broken.day, 1) !== t) return;
  if (dayRec(t).acts >= restoreNeed()) {
    m.cover[m.broken.day] = 'restored';
    const streak = momentumStreak();
    m.best = Math.max(m.best, streak);
    m.broken = null;
    pushFx({ type: 'toast', icon: 'flame', title: 'Импульс восстановлен', text: `Серия снова ${streak} ${pDays(streak)}. Отличная работа.` });
  }
}

/* ================= Задания ================= */
let eventsVersion = 0, _qIndex = null, _qIndexV = -1;
/* опыт по дням, разделам и характеристикам — один проход по событиям, пока они не изменились
   (графики и статистика раньше перебирали все события на каждый день — на телефоне это тормозило) */
let _xpIdx = null, _xpIdxKey = null;
function xpIndex() {
  const key = eventsVersion + ':' + S.events.length;
  if (_xpIdx && _xpIdxKey === key && _xpIdx.src === S.events) return _xpIdx;
  const day = {}, sec = {}, stat = {};
  for (const e of S.events) {
    day[e.d] = (day[e.d] || 0) + e.xp;
    if (e.s) { const m = sec[e.s] || (sec[e.s] = {}); m[e.d] = (m[e.d] || 0) + e.xp; }
    if (e.stat) { const m = stat[e.stat] || (stat[e.stat] = {}); m[e.d] = (m[e.d] || 0) + e.xp; }
  }
  _xpIdxKey = key;
  return (_xpIdx = { src: S.events, day, sec, stat });
}
const xpOn = (d, map = xpIndex().day) => (map && map[d]) || 0;
function xpBetween(from, to, map = xpIndex().day) {
  let s = 0;
  for (const d in map || {}) if (d >= from && d <= to) s += map[d];
  return s;
}
// индекс заданий пересобирается и при замене всего состояния (синхронизация, импорт), а не только после новых событий
let _qIndexSrc = null, _qIndexLen = -1, _qsCache = {};
function questIndex() {
  if (_qIndexV === eventsVersion && _qIndex && _qIndexSrc === S.events && _qIndexLen === S.events.length) return _qIndex;
  _qIndex = {};
  for (const e of S.events) if (e.k === 'quest' && e.q) ((_qIndex[e.q] ||= {})[e.d] ||= []).push(e);
  _qIndexV = eventsVersion; _qIndexSrc = S.events; _qIndexLen = S.events.length;
  _qsCache = {};
  return _qIndex;
}
function visibleSections() { return S.sections.filter(s => !s.hidden && !s.archived).sort((a, b) => a.order - b.order); }
function activeSections() { return S.sections.filter(s => !s.archived).sort((a, b) => a.order - b.order); }
function sectionById(id) { return S.sections.find(s => s.id === id); }
function questsOf(sectionId, kind) { return S.quests.filter(x => x.sectionId === sectionId && !x.archived && (!kind || x.kind === kind)); }
function dailyQuests() {
  const vis = new Set(visibleSections().filter(s => typeof sectionUnlocked !== 'function' || sectionUnlocked(s.id)).map(s => s.id));
  return S.quests.filter(x => x.kind === 'daily' && !x.archived && vis.has(x.sectionId));
}

/* статус задания считается один раз, пока события не изменились: серии и рекорды перебирают дни, а экран спрашивает их десятки раз */
function questStatus(qq, d = today()) {
  const all = questIndex(), key = qq.id + '|' + d + '|' + qq.kind + '|' + (qq.target || 1);
  return _qsCache[key] || (_qsCache[key] = questStatusCalc(qq, d, all[qq.id] || {}));
}
function questStatusCalc(qq, d, idx) {
  if (qq.kind === 'daily') {
    const count = (idx[d] || []).length;
    let streak = 0, k = count ? d : addDays(d, -1);
    while (idx[k]) { streak++; k = addDays(k, -1); }
    let best = 0, run = 0, prev = null;
    for (const day of Object.keys(idx).sort()) { run = prev && addDays(prev, 1) === day ? run + 1 : 1; best = Math.max(best, run); prev = day; }
    return { done: count >= (qq.target || 1), count, target: qq.target || 1, streak, best };
  }
  if (qq.kind === 'weekly') {
    const ws = weekStart(d); let count = 0;
    for (const [day, arr] of Object.entries(idx)) if (day >= ws && day <= addDays(ws, 6)) count += arr.length;
    let streak = 0, w = count >= qq.target ? ws : addDays(ws, -7);
    const weekCount = w0 => sum(Object.entries(idx).filter(([day]) => day >= w0 && day <= addDays(w0, 6)), ([, a]) => a.length);
    while (weekCount(w) >= qq.target && streak < 520) { streak++; w = addDays(w, -7); }
    return { done: count >= qq.target, count, target: qq.target, streak, best: streak };
  }
  const all = Object.values(idx).flat();
  return { done: all.length > 0, count: all.length, target: 1, streak: 0, best: 0, doneAt: all[0] && all[0].d };
}

function completeQuest(qq, { auto = false } = {}) {
  const st = questStatus(qq);
  if (st.done) return null;
  const xp = qq.kind !== 'goal' && qq.target > 1 ? Math.round(qq.xp / qq.target) : qq.xp;
  const ev = emit({ k: 'quest', q: qq.id, s: qq.sectionId, xp, note: qq.title, tags: ['task'] });
  if (qq.kind === 'weekly' && questStatus(qq).done) pushFx({ type: 'toast', icon: 'check', title: 'Недельная цель выполнена', text: qq.title });
  if (qq.kind === 'goal') pushFx({ type: 'toast', icon: 'trophy', title: 'Большая цель достигнута', text: qq.title });
  if (!auto) maybeRandomReward(ev, qq);
  checkPerfect();
  afterChange();
  return ev;
}
function undoQuest(qq) {
  const idx = questIndex()[qq.id] || {};
  let arr = idx[today()];
  if (qq.kind === 'weekly' && !arr) {
    const ws = weekStart();
    arr = Object.entries(idx).filter(([d]) => d >= ws).flatMap(([, a]) => a);
  }
  if (qq.kind === 'goal') arr = Object.values(idx).flat();
  if (!arr || !arr.length) return;
  const ev = arr[arr.length - 1];
  removeEvent(ev);
  if (ev.reward) { const rb = S.events.find(e => e.rewardOf === ev.id); if (rb) removeEvent(rb); }
  checkPerfect(true);
  afterChange();
  pushFx({ type: 'toast', icon: 'undo', title: 'Отметка снята', text: qq.title, quiet: true });
}
function toggleQuest(id) {
  const qq = S.quests.find(x => x.id === id); if (!qq) return;
  const st = questStatus(qq);
  if (st.done) undoQuest(qq); else completeQuest(qq);
}
/* Автоотметка заданий, связанных с действием в трекере */
function autoQuest(key, sectionId) {
  for (const qq of S.quests.filter(x => x.auto === key && !x.archived && (!sectionId || x.sectionId === sectionId))) {
    const sec = sectionById(qq.sectionId);
    if (sec && !sec.archived) completeQuest(qq, { auto: true });
  }
}
function tracker(sectionId, xp, note, tags = [], extra = {}) {
  const ev = emit({ k: 'tracker', s: sectionId, xp, note, tags, extra });
  afterChange();
  return ev;
}

function checkPerfect(undo = false) {
  const t = today(), r = dayRec(t), dq = dailyQuests();
  const all = dq.length > 0 && dq.every(x => questStatus(x).done);
  if (all && !r.perfect) {
    r.perfect = true;
    emit({ k: 'bonus', xp: 50, note: 'Идеальный день', noMult: true });
    bossesOnAction({ s: null, k: 'perfect' }, ['perfect']);
    pushFx({ type: 'perfect' });
  } else if (!all && r.perfect && undo) {
    r.perfect = false;
    const ev = S.events.find(e => e.d === t && e.note === 'Идеальный день');
    if (ev) removeEvent(ev);
  }
}

/* ================= Случайные награды ================= */
const RARE_BADGES = [
  { id: 'owl', name: 'Ночная сова', icon: 'moon' }, { id: 'sun', name: 'Рассветный', icon: 'sun' },
  { id: 'leaf', name: 'Тихий лист', icon: 'leaf' }, { id: 'comet', name: 'Комета', icon: 'rocket' },
  { id: 'gem', name: 'Самоцвет', icon: 'sparkle' }, { id: 'crown', name: 'Малая корона', icon: 'crown' },
  { id: 'peak', name: 'Пик', icon: 'mountain' }, { id: 'spark', name: 'Разряд', icon: 'zap' },
  { id: 'drop', name: 'Роса', icon: 'droplet' }, { id: 'star', name: 'Падающая звезда', icon: 'star' },
  { id: 'flag', name: 'Знаменосец', icon: 'flag' }, { id: 'hour', name: 'Хранитель времени', icon: 'hourglass' },
];
function maybeRandomReward(ev, qq) {
  const r = dayRec();
  if ((r.rewards || 0) >= 2 || Math.random() > 0.11) return;
  r.rewards = (r.rewards || 0) + 1;
  let kind = Math.random();
  const missing = RARE_BADGES.filter(b => !S.badges.some(x => x.id === b.id));
  if (kind > 0.8 && missing.length) {
    const b = missing[Math.floor(Math.random() * missing.length)];
    S.badges.push({ id: b.id, d: today() });
    pushFx({ type: 'gift', kind: 'badge', badge: b });
  } else if (kind > 0.55 && S.momentum.shields < S.settings.maxShields) {
    S.momentum.shields++;
    pushFx({ type: 'gift', kind: 'shield' });
  } else {
    ev.reward = true;
    emit({ k: 'bonus', xp: ev.xp, note: 'Двойной опыт', noMult: true, stat: ev.stat, extra: { rewardOf: ev.id } });
    pushFx({ type: 'gift', kind: 'double', amount: ev.xp, title: qq.title });
  }
}

/* ================= Испытание дня ================= */
const CHALLENGES = {
  weight: ['Пройди на 2 000 шагов больше обычного', 'Выпей лишний стакан воды до обеда', 'Обойдись сегодня без сладкого', 'Поднимайся по лестнице вместо лифта'],
  workout: ['Потренируйся на 10 минут дольше обычного', 'Сделай 30 отжиманий в течение дня', 'Растяжка 10 минут после тренировки', 'Попробуй вид активности, которого давно не было', 'Пройди пешком 30 минут вместо транспорта'],
  reading: ['Прочитай на 10 страниц больше обычного', 'Почитай 15 минут без телефона рядом', 'Выпиши одну мысль из книги'],
  meditation: ['Медитируй на 5 минут дольше обычного', 'Сделай 10 осознанных вдохов перед сном', 'Пройдись 10 минут без наушников'],
  abstinence: ['Проведи час без телефона', 'Замени один импульсивный порыв прогулкой'],
  journal: ['Опиши один момент дня в деталях', 'Запиши, чему ты сегодня научился'],
  gratitude: ['Запиши пять благодарностей вместо трёх', 'Поблагодари кого-нибудь лично'],
  content: [
    'Придумай 3 варианта начала (хука) и выбери сильнейший',
    'Подготовь 2 публикации в запас сверх нормы',
    'Посмотри 10 работ в своей нише и выпиши 3 приёма',
    'Ответь лично каждому, кто написал тебе',
    'Покажи закулисье: как создаётся твой контент',
    'Спроси аудиторию, что ей интересно увидеть дальше',
    'Перепиши описание лучшей публикации — сделай его сильнее',
    'Попробуй формат, которого у тебя ещё не было',
  ],
  custom: ['Сделай одно дело, которое давно откладывал', 'Выдели 25 минут полной концентрации'],
};
function todayChallenge() {
  const types = [...new Set(visibleSections().map(s => s.type))];
  const pool = [];
  for (const t of types) for (const text of CHALLENGES[t] || CHALLENGES.custom) pool.push({ text, type: t });
  if (!pool.length) for (const text of CHALLENGES.custom) pool.push({ text, type: 'custom' });
  const c = pool[hashStr(today() + 'ch') % pool.length];
  const sec = visibleSections().find(s => s.type === c.type);
  return { ...c, xp: 40, sectionId: sec ? sec.id : null, done: !!dayRec().challenge };
}
function toggleChallenge() {
  const r = dayRec(), c = todayChallenge();
  if (r.challenge) {
    const ev = S.events.find(e => e.d === today() && e.k === 'challenge');
    if (ev) removeEvent(ev);
    r.challenge = false;
  } else {
    r.challenge = true;
    emit({ k: 'challenge', s: c.sectionId, xp: c.xp, note: 'Испытание: ' + c.text, tags: ['challenge', 'task'] });
    pushFx({ type: 'toast', icon: 'zap', title: 'Испытание дня пройдено', text: c.text });
  }
  afterChange();
}

/* ================= Неделя ================= */
function xpByWeek() {
  const m = {}, day = xpIndex().day;
  for (const d in day) { const w = weekStart(d); m[w] = (m[w] || 0) + day[d]; }
  return m;
}
function weekSummary() {
  const m = xpByWeek(), w = weekStart(), pw = addDays(w, -7);
  const cur = m[w] || 0, prev = m[pw] || 0;
  const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]);
  const rank = sorted.findIndex(([k]) => k === w) + 1;
  const daysActive = daysRange(w, today()).filter(d => (S.days[d] || {}).acts > 0).length;
  const prevActive = daysRange(pw, addDays(pw, 6)).filter(d => (S.days[d] || {}).acts > 0).length;
  const tasks = S.events.filter(e => e.k === 'quest' && e.d >= w).length;
  const prevTasks = S.events.filter(e => e.k === 'quest' && e.d >= pw && e.d < w).length;
  return { cur, prev, delta: prev ? (cur - prev) / prev * 100 : null, rank, total: sorted.length || 1, daysActive, prevActive, tasks, prevTasks };
}

/* ================= Достижения ================= */
const countEvents = f => S.events.filter(f).length;
const totalMedMin = () => sum(S.meditation.sessions, x => x.min);
const ACHIEVEMENTS = [
  { id: 'first', name: 'Первый шаг', desc: 'Выполни первое задание', icon: 'sparkle', test: () => countEvents(e => e.k === 'quest') >= 1 },
  { id: 'tasks100', name: 'Сотня', desc: '100 выполненных заданий', icon: 'check', test: () => countEvents(e => e.k === 'quest') >= 100 },
  { id: 'tasks1000', name: 'Тысяча шагов', desc: '1000 выполненных заданий', icon: 'mountain', test: () => countEvents(e => e.k === 'quest') >= 1000 },
  { id: 'streak7', name: 'Неделя огня', desc: 'Импульс 7 дней', icon: 'flame', test: () => S.momentum.best >= 7 },
  { id: 'streak30', name: 'Месяц силы', desc: 'Импульс 30 дней', icon: 'flame', test: () => S.momentum.best >= 30 },
  { id: 'streak100', name: 'Сотня дней', desc: 'Импульс 100 дней', icon: 'star', test: () => S.momentum.best >= 100 },
  { id: 'streak365', name: 'Год без остановки', desc: 'Импульс 365 дней', icon: 'sun', test: () => S.momentum.best >= 365 },
  { id: 'perfect1', name: 'Идеальный день', desc: 'Выполни все ежедневные задания', icon: 'sparkle', test: () => Object.values(S.days).filter(d => d.perfect).length >= 1 },
  { id: 'perfect10', name: 'Безупречность', desc: '10 идеальных дней', icon: 'crown', test: () => Object.values(S.days).filter(d => d.perfect).length >= 10 },
  { id: 'perfect50', name: 'Перфекционист', desc: '50 идеальных дней', icon: 'crown', test: () => Object.values(S.days).filter(d => d.perfect).length >= 50 },
  { id: 'lvl5', name: 'Пятый уровень', desc: 'Достигни 5 уровня', icon: 'arrowUp', test: () => levelInfo().level >= 5 },
  { id: 'lvl10', name: 'Десятый уровень', desc: 'Достигни 10 уровня', icon: 'arrowUp', test: () => levelInfo().level >= 10 },
  { id: 'lvl25', name: 'Четверть пути', desc: 'Достигни 25 уровня', icon: 'medal', test: () => levelInfo().level >= 25 },
  { id: 'lvl50', name: 'Легенда', desc: 'Достигни 50 уровня', icon: 'crown', test: () => levelInfo().level >= 50 },
  { id: 'boss1', name: 'Первая победа', desc: 'Победи босса', icon: 'swords', test: () => S.bosses.filter(b => b.status === 'won').length >= 1 },
  { id: 'boss5', name: 'Охотник', desc: 'Победи 5 боссов', icon: 'swords', test: () => S.bosses.filter(b => b.status === 'won').length >= 5 },
  { id: 'bossEpic', name: 'Эпос', desc: 'Победи эпического босса', icon: 'castle', test: () => S.bosses.some(b => b.status === 'won' && b.tier >= 3) },
  { id: 'bossLegend', name: 'Сказание', desc: 'Победи легендарного босса', icon: 'crown', test: () => S.bosses.some(b => b.status === 'won' && b.tier >= 4) },
  { id: 'woWeek', name: 'Неделя в цель', desc: 'Выполни недельную цель по тренировкам', icon: 'calendar', test: () => woBestStreak() >= 1 },
  { id: 'woWeeks4', name: 'Режим', desc: '4 недели подряд в цель', icon: 'flame', test: () => woBestStreak() >= 4 },
  { id: 'woWeeks12', name: 'Образ жизни', desc: '12 недель подряд в цель', icon: 'crown', test: () => woBestStreak() >= 12 },
  { id: 'woH10', name: '10 часов в движении', desc: '600 минут тренировок', icon: 'timer', test: () => woTotalMin() >= 600 },
  { id: 'woMix', name: 'Универсал', desc: '3 разных вида тренировок за неделю', icon: 'sparkle', test: () => woMixBest() >= 3 },
  { id: 'wo10', name: 'Железо', desc: '10 тренировок', icon: 'dumbbell', test: () => S.workouts.list.length >= 10 },
  { id: 'wo100', name: 'Сталь', desc: '100 тренировок', icon: 'shield', test: () => S.workouts.list.length >= 100 },
  { id: 'book1', name: 'Первая книга', desc: 'Дочитай книгу', icon: 'book', test: () => S.reading.books.filter(b => b.status === 'done').length >= 1 },
  { id: 'book10', name: 'Библиотека', desc: 'Прочитай 10 книг', icon: 'book', test: () => S.reading.books.filter(b => b.status === 'done').length >= 10 },
  { id: 'pages1000', name: 'Тысяча страниц', desc: 'Прочитай 1000 страниц', icon: 'book', test: () => sum(S.reading.log, x => x.pages) >= 1000 },
  { id: 'med100', name: 'Тишина', desc: '100 минут медитации', icon: 'lotus', test: () => totalMedMin() >= 100 },
  { id: 'med1000', name: 'Глубина', desc: '1000 минут медитации', icon: 'lotus', test: () => totalMedMin() >= 1000 },
  { id: 'abst7', name: 'Неделя воли', desc: 'Счётчик воздержания 7 дней', icon: 'ban', test: () => S.abstinence.counters.some(c => Math.max(c.best || 0, abstDays(c)) >= 7) },
  { id: 'abst30', name: 'Месяц воли', desc: 'Счётчик воздержания 30 дней', icon: 'shield', test: () => S.abstinence.counters.some(c => Math.max(c.best || 0, abstDays(c)) >= 30) },
  { id: 'abst90', name: 'Несгибаемый', desc: 'Счётчик воздержания 90 дней', icon: 'crown', test: () => S.abstinence.counters.some(c => Math.max(c.best || 0, abstDays(c)) >= 90) },
  { id: 'journal7', name: 'Летописец', desc: '7 записей в дневнике', icon: 'pen', test: () => Object.keys(S.journal).length >= 7 },
  { id: 'journal30', name: 'Хроникёр', desc: '30 записей в дневнике', icon: 'pen', test: () => Object.keys(S.journal).length >= 30 },
  { id: 'grat30', name: 'Благодарное сердце', desc: '30 дней благодарности', icon: 'heart', test: () => Object.keys(S.gratitude).length >= 30 },
  { id: 'kg5', name: 'Минус 5 кг', desc: 'Сбрось 5 кг от старта', icon: 'scale', test: () => weightLost() >= 5 },
  { id: 'kg10', name: 'Минус 10 кг', desc: 'Сбрось 10 кг от старта', icon: 'scale', test: () => weightLost() >= 10 },
  { id: 'kgGoal', name: 'Цель по весу', desc: 'Достигни целевого веса', icon: 'target', test: () => S.weight.goal && S.weight.entries.length && lastWeight() <= S.weight.goal },
  { id: 'car10', name: 'В эфире', desc: '10 публикаций', icon: 'video', test: () => S.content.posts.length >= 10 },
  { id: 'car100', name: 'Сотня', desc: '100 публикаций', icon: 'rocket', test: () => S.content.posts.length >= 100 },
  { id: 'car500', name: 'Медиамашина', desc: '500 публикаций', icon: 'crown', test: () => S.content.posts.length >= 500 },
  { id: 'accs7', name: 'Неделя в эфире', desc: 'Все площадки 7 дней подряд', icon: 'flame', test: () => allAccountsStreak() >= 7 },
  { id: 'accs30', name: 'Месяц в эфире', desc: 'Все площадки 30 дней подряд', icon: 'shield', test: () => allAccountsStreak() >= 30 },
  { id: 'stock3', name: 'Запас на три дня', desc: 'Готовый контент на три дня вперёд', icon: 'image', test: () => contentTarget() > 0 && S.content.stock >= contentTarget() * 3 },
  { id: 'fol1000', name: 'Тысяча', desc: '1000 подписчиков', icon: 'user', test: () => (followersTotal() || 0) >= 1000 },
  { id: 'challenge10', name: 'Смельчак', desc: 'Пройди 10 испытаний дня', icon: 'zap', test: () => countEvents(e => e.k === 'challenge') >= 10 },
  { id: 'comeback', name: 'Возвращение', desc: 'Вернись после перерыва', icon: 'refresh', test: () => S.comeback && Object.keys(S.days).some(d => d >= S.comeback.start && S.days[d].acts > 0) },
  { id: 'lucky', name: 'Везунчик', desc: 'Получи редкий значок', icon: 'gift', test: () => S.badges.length >= 1 },
  { id: 'collector', name: 'Коллекционер', desc: 'Собери 6 редких значков', icon: 'gift', test: () => S.badges.length >= 6 },
  { id: 'shields', name: 'Броня', desc: 'Держи максимум щитов', icon: 'shield', test: () => S.momentum.shields >= S.settings.maxShields },
];
function checkAchievements(silent = false) {
  for (const a of ACHIEVEMENTS) {
    if (S.achievements[a.id]) continue;
    let ok = false; try { ok = a.test(); } catch (e) { ok = false; }
    if (ok) {
      S.achievements[a.id] = today();
      emit({ k: 'achv', xp: 30, note: 'Достижение: ' + a.name, noMult: true });
      pushFx({ type: 'achievement', a });
    }
  }
}

/* ================= Трекеры: вспомогательные значения ================= */
function sortedWeights() { return [...S.weight.entries].sort((a, b) => a.d < b.d ? -1 : 1); }
function lastWeight() { const w = sortedWeights(); return w.length ? w[w.length - 1].kg : null; }
function weightLost() { const lw = lastWeight(); return S.weight.start && lw ? S.weight.start - lw : 0; }
function weightTrend() {   // экспоненциальное сглаживание
  const w = sortedWeights(); let ema = null; const out = [];
  for (const e of w) { ema = ema == null ? e.kg : ema + 0.25 * (e.kg - ema); out.push({ d: e.d, kg: e.kg, trend: ema }); }
  return out;
}
function abstDays(c) { return Math.max(0, diffDays(c.start, today())); }
/* тренировки: вид, длительность и ощущение — без упражнений и подходов */
const WO_TYPES = [
  { id: 'strength', name: 'Силовая', icon: 'dumbbell' },
  { id: 'cardio', name: 'Кардио', icon: 'run' },
  { id: 'hiit', name: 'Интервальная', icon: 'zap' },
  { id: 'stretch', name: 'Растяжка, йога', icon: 'leaf' },
  { id: 'sport', name: 'Спорт, игры', icon: 'trophy' },
];
const WO_EFFORT = ['Легко', 'Нормально', 'Тяжело'];
const woType = w => WO_TYPES.find(t => t.id === (w.type || 'strength')) || WO_TYPES[0];
const woMin = w => +w.min || 0;
const woXp = (min, effort) => 20 + Math.min(40, Math.round(min / 3)) + (effort >= 3 ? 10 : effort === 2 ? 5 : 0);
const woTotalMin = () => sum(S.workouts.list, woMin);
function woWeekCount(ws) { const we = addDays(ws, 6); return S.workouts.list.filter(x => x.d >= ws && x.d <= we).length; }
/* недели подряд с выполненной целью; текущая неделя засчитывается, как только цель взята */
function woWeekStreak() {
  const goal = S.workouts.weeklyGoal, cur = weekStart();
  let w = woWeekCount(cur) >= goal ? cur : addDays(cur, -7), n = 0;
  while (n < 520 && woWeekCount(w) >= goal) { n++; w = addDays(w, -7); }
  return n;
}
function woBestStreak() {
  const goal = S.workouts.weeklyGoal, weeks = [...new Set(S.workouts.list.map(x => weekStart(x.d)))].sort();
  let best = 0, run = 0, last = null;
  for (const w of weeks) {
    if (woWeekCount(w) < goal) continue;
    run = last && addDays(last, 7) === w ? run + 1 : 1;
    best = Math.max(best, run); last = w;
  }
  return best;
}
function woMixBest() {
  const m = {};
  for (const x of S.workouts.list) (m[weekStart(x.d)] ||= new Set()).add(woType(x).id);
  return Math.max(0, ...Object.values(m).map(s => s.size));
}
function woRecords(exceptId = null) {
  const L = S.workouts.list.filter(x => x.id !== exceptId), byWeek = {}, byMonth = {};
  for (const x of L) { byWeek[weekStart(x.d)] = (byWeek[weekStart(x.d)] || 0) + 1; byMonth[x.d.slice(0, 7)] = (byMonth[x.d.slice(0, 7)] || 0) + woMin(x); }
  const longest = L.reduce((a, x) => woMin(x) > woMin(a || {}) ? x : a, null);
  return { longest, bestWeek: Math.max(0, ...Object.values(byWeek)), bestMonth: Math.max(0, ...Object.values(byMonth)) };
}
/* старые записи с упражнениями — для боссов, созданных до упрощения */
function exerciseNames() { return [...new Set(S.workouts.list.flatMap(w => (w.items || []).map(i => i.ex)))].sort(); }
function exerciseBest(name, from = null) {
  let best = 0;
  for (const w of S.workouts.list) if (!from || w.d >= from) for (const it of w.items || []) if (it.ex.toLowerCase() === name.toLowerCase()) for (const s of it.sets) best = Math.max(best, +s.w || 0);
  return best;
}
/* контент: публикации по площадкам */
const contentTarget = () => S.content.accounts.length * S.content.perAccount;
const postsOn = d => S.content.posts.filter(p => p.d === d && S.content.accounts.includes(p.acc));
function allAccountsStreak() {
  const full = d => contentTarget() > 0 && postsOn(d).length >= contentTarget();
  let d = full(today()) ? today() : addDays(today(), -1), n = 0;
  while (full(d)) { n++; d = addDays(d, -1); }
  return n;
}
function followersSnap(before = null) {
  const list = [...S.content.followers].sort((a, b) => a.d < b.d ? -1 : 1).filter(f => !before || f.d <= before);
  return list[list.length - 1] || null;
}
function followersTotal(before = null) { const f = followersSnap(before); return f ? sum(Object.values(f.p)) : null; }
function journalStreak(src) {
  let d = src[today()] ? today() : addDays(today(), -1), n = 0;
  while (src[d]) { n++; d = addDays(d, -1); }
  return n;
}

/* ================= Боссы ================= */
const TIERS = [
  { name: 'Лёгкий', hp: 400, xp: 150 }, { name: 'Средний', hp: 900, xp: 350 }, { name: 'Тяжёлый', hp: 1800, xp: 700 },
  { name: 'Эпический', hp: 3200, xp: 1200 }, { name: 'Легендарный', hp: 5500, xp: 2500 },
];
const METRICS = {
  reach: [
    { id: 'weight', name: 'Вес тела, кг', unit: 'кг' },
    { id: 'exercise', name: 'Рабочий вес в упражнении, кг', unit: 'кг', arg: true, hidden: true },
    { id: 'followers', name: 'Подписчики (все площадки)', unit: 'подп.' },
    { id: 'manual', name: 'Своё значение (вручную)', unit: '' },
  ],
  count: [
    { id: 'pages', name: 'Прочитанные страницы', unit: 'стр.' },
    { id: 'books', name: 'Прочитанные книги', unit: 'книг' },
    { id: 'read_minutes', name: 'Минуты чтения', unit: 'мин' },
    { id: 'med_minutes', name: 'Минуты медитации', unit: 'мин' },
    { id: 'workouts', name: 'Тренировки', unit: 'трен.' },
    { id: 'wo_minutes', name: 'Минуты тренировок', unit: 'мин' },
    { id: 'publications', name: 'Публикации', unit: 'публ.' },
    { id: 'tasks', name: 'Задания в разделе', unit: 'зад.' },
    { id: 'manual', name: 'Своё количество (вручную)', unit: '' },
  ],
  endure: [
    { id: 'abst', name: 'Счётчик воздержания', unit: 'дн.', arg: true },
    { id: 'journal_streak', name: 'Дневник подряд', unit: 'дн.' },
    { id: 'gratitude_streak', name: 'Благодарность подряд', unit: 'дн.' },
    { id: 'momentum', name: 'Импульс', unit: 'дн.' },
    { id: 'quest_streak', name: 'Серия задания', unit: 'дн.', arg: true },
    { id: 'manual', name: 'Свой счётчик дней (вручную)', unit: 'дн.' },
  ],
};
const BOSS_ACTIONS = [
  { id: 'task', name: 'Задание этого раздела' }, { id: 'any', name: 'Любое задание' },
  { id: 'workout', name: 'Тренировка' }, { id: 'pr', name: 'Личный рекорд' },
  { id: 'reading', name: 'Запись чтения' }, { id: 'meditation', name: 'Сессия медитации' },
  { id: 'publish', name: 'Публикация' }, { id: 'content', name: 'Контент в запас' },
  { id: 'journal', name: 'Запись дневника' },{ id: 'perfect', name: 'Идеальный день' }, { id: 'challenge', name: 'Испытание дня' },
];
const HIT_LABELS = ['Нет', 'Удар', 'Сильный', 'Крит'];
const HIT_MULT = [0, 1, 2, 4];
function metricDef(type, id) { return (METRICS[type] || []).find(m => m.id === id) || { name: id, unit: '' }; }

function metricValue(b) {
  const since = b.startDate, ev = S.events;
  switch (b.metric) {
    case 'weight': return lastWeight() ?? b.start;
    case 'exercise': return Math.max(b.start, exerciseBest(b.arg || '', since));
    case 'pages': return b.start + sum(S.reading.log.filter(x => x.d >= since), x => x.pages);
    case 'read_minutes': return b.start + sum(S.reading.log.filter(x => x.d >= since), x => x.min);
    case 'books': return b.start + S.reading.books.filter(x => x.status === 'done' && (x.finished || '') >= since).length;
    case 'med_minutes': return b.start + sum(S.meditation.sessions.filter(x => x.d >= since), x => x.min);
    case 'workouts': return b.start + S.workouts.list.filter(x => x.d >= since).length;
    case 'wo_minutes': return b.start + sum(S.workouts.list.filter(x => x.d >= since), woMin);
    case 'followers': return followersTotal() ?? b.start;
    case 'publications': return b.start + S.content.posts.filter(x => x.d >= since).length;
    case 'tasks': return b.start + ev.filter(e => e.k === 'quest' && e.s === b.sectionId && e.d >= since).length;
    case 'abst': { const c = S.abstinence.counters.find(x => x.id === b.arg); return c ? abstDays(c) : 0; }
    case 'journal_streak': return journalStreak(S.journal);
    case 'gratitude_streak': return journalStreak(S.gratitude);
    case 'momentum': return momentumStreak();
    case 'quest_streak': { const qq = S.quests.find(x => x.id === b.arg); return qq ? questStatus(qq).streak : 0; }
    default: return b.manual ?? b.start;
  }
}
function metricStartValue(type, metric, arg) {
  switch (metric) {
    case 'weight': return lastWeight() ?? S.weight.start ?? 90;
    case 'exercise': return exerciseBest(arg || '') || 40;
    case 'followers': return followersTotal() ?? 0;
    case 'abst': { const c = S.abstinence.counters.find(x => x.id === arg); return c ? abstDays(c) : 0; }
    case 'journal_streak': return journalStreak(S.journal);
    case 'gratitude_streak': return journalStreak(S.gratitude);
    case 'momentum': return momentumStreak();
    case 'quest_streak': { const qq = S.quests.find(x => x.id === arg); return qq ? questStatus(qq).streak : 0; }
    default: return 0;
  }
}
/* средний дневной темп за последние 30 дней, иначе разумный ориентир */
function baselinePerDay(metric, sectionId) {
  const from = addDays(today(), -30), inWin = x => x.d >= from;
  const span = Math.min(30, Math.max(7, diffDays(S.createdAt, today())));
  const hist = {
    pages: sum(S.reading.log.filter(inWin), x => x.pages), read_minutes: sum(S.reading.log.filter(inWin), x => x.min),
    med_minutes: sum(S.meditation.sessions.filter(inWin), x => x.min), workouts: S.workouts.list.filter(inWin).length,
    wo_minutes: sum(S.workouts.list.filter(inWin), woMin),
    books: S.reading.books.filter(x => x.status === 'done' && (x.finished || '') >= from).length,
    tasks: S.events.filter(e => e.k === 'quest' && e.s === sectionId && inWin(e)).length,
    publications: S.content.posts.filter(inWin).length,
    followers: (() => { const a = followersTotal(from), b = followersTotal(); return a != null && b != null ? Math.max(0, b - a) : 0; })(),
  }[metric];
  const dflt = { pages: 20, read_minutes: 20, med_minutes: 10, workouts: 0.45, wo_minutes: 20, books: 0.04, tasks: 2, publications: 2, followers: 10 }[metric] || 1;
  const fromHist = hist ? hist / span : 0;
  return { perDay: fromHist > dflt * 0.3 ? fromHist : dflt, fromHistory: fromHist > dflt * 0.3 };
}

function assessBoss(dr) {
  const days = Math.max(1, diffDays(today(), dr.deadline || addDays(today(), 30)));
  const weeks = days / 7, start = +dr.start, target = +dr.target, delta = Math.abs(target - start);
  const L = levelInfo().level;
  const out = { days, warnings: [], notes: [], suggestion: null, ok: true };
  if (!isFinite(start) || !isFinite(target) || delta === 0) { out.ok = false; out.warnings.push('Задай стартовое значение и цель — они должны отличаться.'); return finish(out, 2, 1); }

  let M = 3, ratio = 1;
  if (dr.type === 'reach' && dr.metric === 'weight') {
    const losing = target < start, safe = losing ? 0.75 : 0.35, upper = losing ? 1 : 0.5;
    const req = delta / start * 100 / weeks;
    ratio = req / safe; M = 2 + delta / start * 100 / 2;
    out.notes.push(`Нужный темп: ${fmtNum(req, 2)}% массы в неделю (≈${fmtNum(delta / weeks, 2)} кг). Безопасно: ${losing ? '0,5–1' : '0,25–0,5'}%.`);
    if (req > upper * 1.05) {
      const realDays = Math.ceil(delta / (start * safe / 100) * 7);
      const mid = Math.round((losing ? start - start * safe / 100 * weeks : start + start * safe / 100 * weeks) * 2) / 2;
      out.warnings.push(`Цель слишком быстрая для здорового темпа: ${fmtSigned(target - start, 1)} кг за ${days} ${pDays(days)}.`);
      out.suggestion = { deadline: addDays(today(), realDays), mid, text: `Реальный срок — около ${Math.round(realDays / 7)} нед. Или промежуточный босс: ${fmtNum(mid, 1)} кг к этой дате.` };
    }
  } else if (dr.type === 'reach' && dr.metric === 'exercise') {
    const rate = L < 10 ? 1.5 : 1, req = start > 0 ? delta / start * 100 / weeks : 2;
    ratio = req / rate; M = 2 + (start > 0 ? delta / start * 100 / 5 : 3);
    out.notes.push(`Нужный прирост: ${fmtNum(req, 1)}% в неделю. Реальный темп для любителя: ~${rate}%.`);
    if (ratio > 1.6) {
      const realDays = Math.ceil(delta / (start * rate / 100) * 7);
      const mid = Math.round((start + start * rate / 100 * weeks) / 2.5) * 2.5;
      out.warnings.push('Такой прирост силы за этот срок маловероятен.');
      out.suggestion = { deadline: addDays(today(), realDays), mid, text: `Реальный срок — около ${Math.round(realDays / 7)} нед. Или промежуточный босс: ${fmtNum(mid, 1)} кг.` };
    }
  } else if (dr.type === 'count' || dr.metric === 'followers') {
    const base = dr.metric === 'manual' ? null : baselinePerDay(dr.metric, dr.sectionId);
    const need = delta / days;
    M = 1.5 + Math.log2(1 + days / 7) * 1.3;
    if (base) {
      ratio = need / base.perDay;
      const u = metricDef(dr.type, dr.metric).unit;
      out.notes.push(`Нужно ≈${fmtNum(need, need < 3 ? 1 : 0)} ${u} в день. ${base.fromHistory ? 'Твой средний темп' : 'Обычный темп'}: ${fmtNum(base.perDay, base.perDay < 3 ? 1 : 0)} ${u}.`.replace('..', '.'));
      if (ratio > 2) {
        const realDays = Math.ceil(delta / (base.perDay * 1.3));
        const mid = Math.round(start + base.perDay * 1.3 * days);
        out.warnings.push('Темп заметно выше твоего обычного — есть риск выгореть.');
        out.suggestion = { deadline: addDays(today(), realDays), mid, text: `Реальный срок — ${realDays} ${pDays(realDays)}. Или промежуточный босс: ${fmtNum(mid)} к этой дате.` };
      }
    } else out.notes.push('Для своего значения нет ориентиров — сложность оценена по объёму и сроку.');
  } else if (dr.type === 'endure') {
    const D = Math.max(1, target - start);
    M = 1 + Math.log2(D) * 1.05;
    out.notes.push(`Продержаться ещё ${D} ${pDays(D)}. Чем длиннее серия, тем выше сложность.`);
    if (D > days + 1) {
      out.warnings.push(`Срок короче нужной серии: за ${days} ${pDays(days)} не набрать ${D}.`);
      out.suggestion = { deadline: addDays(today(), D + 2), mid: start + days, text: `Поставь срок не раньше ${fmtDay(addDays(today(), D + 2))} или промежуточного босса на ${start + days} ${pDays(start + days)}.` };
      ratio = 2;
    }
  } else {
    M = 2 + Math.log2(1 + days / 7);
    out.notes.push('Своё значение: сложность оценена по сроку.');
  }
  return finish(out, M, ratio);

  function finish(o, M, ratio) {
    const score = M * clamp(ratio, 0.6, 1.8);
    const tier = score < 3.2 ? 0 : score < 5 ? 1 : score < 7 ? 2 : score < 9 ? 3 : 4;
    const lvlK = 1 + Math.min(L, 50) * 0.01;
    o.tier = tier; o.score = score; o.ratio = ratio;
    o.hp = Math.round(TIERS[tier].hp * lvlK / 10) * 10;
    o.xp = Math.round(TIERS[tier].xp * clamp(ratio, 0.8, 1.4) / 10) * 10;
    o.phases = tier >= 2;
    return o;
  }
}

function bossState(b) {
  const cur = metricValue(b), span = b.target - b.start;
  const p = b.status === 'won' ? 1 : clamp(span ? (cur - b.start) / span : 0, 0, 1);
  const prog = p * 0.75 * b.maxHp, act = Math.min(b.act || 0, 0.25 * b.maxHp);
  const left = p >= 1 ? 0 : clamp(b.maxHp - prog - act + (b.regen || 0), 1, b.maxHp);
  const total = Math.max(1, diffDays(b.startDate, b.deadline));
  const elapsed = Math.max(0, diffDays(b.startDate, today()));
  const daysLeft = diffDays(today(), b.deadline);
  const dealt = b.maxHp - left;
  const avg = dealt / Math.max(1, elapsed);
  let forecast;
  if (p >= 1) forecast = { ok: true, text: 'Босс повержен' };
  else if (elapsed < 2 || p <= 0) forecast = { ok: null, text: 'Нужно пару дней, чтобы оценить темп' };
  else {
    const eta = Math.ceil((1 - p) / (p / elapsed));
    const ok = eta <= Math.max(0, daysLeft);
    forecast = { ok, eta, text: ok ? `Успеваешь: победа примерно ${fmtDay(addDays(today(), eta))}` : `При текущем темпе нужно ещё ~${eta} ${pDays(eta)}` };
  }
  const needPerDay = daysLeft > 0 ? (b.target - cur) / daysLeft : null;
  return { cur, p, left, pct: left / b.maxHp, total, elapsed, daysLeft, avg, forecast, needPerDay, actCapped: (b.act || 0) >= 0.25 * b.maxHp };
}

function bossesOnAction(ev, tags) {
  const streak = momentumStreak();
  for (const b of S.bosses) {
    if (b.status !== 'active') continue;
    let units = 0;
    for (const [on, lvl] of Object.entries(b.rules || {})) {
      if (!lvl) continue;
      const hit = on === 'task' ? (tags.includes('task') && ev.s === b.sectionId)
        : on === 'any' ? tags.includes('task')
        : tags.includes(on);
      if (hit) units += HIT_MULT[lvl];
    }
    if (!units) continue;
    let dmg = units * b.maxHp * 0.01 * (b.streakBonus && streak >= 7 ? 1.25 : 1);
    dmg = Math.round(dmg);
    const crit = tags.includes('pr') && b.rules.pr >= 3;
    if (b.regen > 0) { const r = Math.min(b.regen, dmg); b.regen -= r; }
    b.act = (b.act || 0) + dmg;
    b.lastHit = today(); b.hits = (b.hits || 0) + 1;
    (ev.hits ||= []).push({ id: b.id, dmg });
    pushFx({ type: 'hit', boss: b, dmg, crit });
  }
}

function checkBosses() {
  for (const b of S.bosses) {
    if (b.status !== 'active') continue;
    const st = bossState(b);
    if (b.phases) for (const th of [75, 50, 25]) {
      if (st.pct * 100 <= th && !(b.phasesHit || []).includes(th)) {
        (b.phasesHit ||= []).push(th);
        const bonus = Math.round(b.reward.xp * 0.05);
        emit({ k: 'boss', xp: bonus, note: `${b.name}: фаза ${4 - th / 25 + 1}`, noMult: true });
        pushFx({ type: 'toast', icon: 'swords', title: `${b.name}: новая фаза`, text: `Здоровье ниже ${th}%. Бонус +${bonus} XP.` });
      }
    }
    if (st.p >= 1) winBoss(b, st);
  }
}
function winBoss(b, st) {
  b.status = 'won'; b.wonAt = today(); b.final = st.cur;
  emit({ k: 'boss', xp: b.reward.xp, note: 'Победа: ' + b.name, noMult: true });
  const stats = b.stats && b.stats.length ? b.stats : [sectionById(b.sectionId)?.stat].filter(Boolean);
  for (const s of stats) S.statXp[s] = (S.statXp[s] || 0) + Math.round(b.reward.xp / stats.length / 2);
  if (b.reward.title) S.titles.includes(b.reward.title) || S.titles.push(b.reward.title);
  pushFx({ type: 'victory', boss: b, stats });
}

/* после любого изменения */
function afterChange() {
  checkBosses();
  checkAchievements();
  saveState();
}
