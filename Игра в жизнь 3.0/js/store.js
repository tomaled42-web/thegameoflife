/* Хранилище: состояние в localStorage, фото в IndexedDB */
'use strict';

const STORE_KEY = 'lifegame.v3';

const STATS = [
  { id: 'body', name: 'Тело', icon: 'run' },
  { id: 'strength', name: 'Сила', icon: 'dumbbell' },
  { id: 'intellect', name: 'Интеллект', icon: 'brain' },
  { id: 'spirit', name: 'Дух', icon: 'lotus' },
  { id: 'will', name: 'Воля', icon: 'shield' },
  { id: 'mastery', name: 'Мастерство', icon: 'star' },
  { id: 'influence', name: 'Влияние', icon: 'video' },
];
const statName = id => (STATS.find(s => s.id === id) || {}).name || id;

const SECTION_TYPES = {
  weight: 'Снижение веса', workout: 'Тренировки', reading: 'Чтение', meditation: 'Медитация',
  abstinence: 'Воздержание', journal: 'Дневник', gratitude: 'Благодарность', content: 'Контент и бренд', custom: 'Свой раздел',
};

const CONTENT_SECTION = { id: 'content', type: 'content', name: 'Контент и бренд', icon: 'video', color: '#c8dca0', stat: 'influence' };
/* Общие задания для любого автора: регулярность, запас контента, обратная связь, рост через эксперименты */
const contentQuests = () => [
  q('content', 'Публикации на всех площадках', 'daily', 30, { target: 2, auto: 'carousel', icon: 'video' }),
  q('content', 'Подготовить контент в запас', 'daily', 20, { auto: 'creative', icon: 'image' }),
  q('content', 'Ответить на комментарии', 'daily', 10, { icon: 'heart' }),
  q('content', 'Разбор статистики: что сработало', 'weekly', 40, { icon: 'chart' }),
  q('content', 'Попробовать новый формат', 'weekly', 40, { icon: 'zap' }),
  q('content', 'Изучить 5 сильных работ в своей нише', 'weekly', 25, { icon: 'eye' }),
  q('content', 'Выйти на 2 публикации в день', 'goal', 300, { icon: 'rocket' }),
  q('content', 'Первые 1000 подписчиков', 'goal', 300, { icon: 'user' }),
];
const CONTENT_DEFAULT = () => ({ accounts: ['TikTok', 'Instagram'], perAccount: 1, posts: [], stock: 0, followers: [] });

function q(sectionId, title, kind, xp, extra = {}) {
  return { id: uid(), sectionId, title, kind, xp, target: 1, createdAt: today(), ...extra };
}

function defaultState() {
  const sections = [
    { id: 'weight', type: 'weight', name: 'Снижение веса', icon: 'scale', color: '#8fdcc0', stat: 'body' },
    { id: 'workout', type: 'workout', name: 'Тренировки', icon: 'dumbbell', color: '#f2a28e', stat: 'strength' },
    { id: 'reading', type: 'reading', name: 'Чтение', icon: 'book', color: '#9fc3ff', stat: 'intellect' },
    { id: 'meditation', type: 'meditation', name: 'Медитация', icon: 'lotus', color: '#b7a6f2', stat: 'spirit' },
    { id: 'abstinence', type: 'abstinence', name: 'Воздержание', icon: 'ban', color: '#f0c890', stat: 'will' },
    { id: 'journal', type: 'journal', name: 'Дневник', icon: 'pen', color: '#d7a8d0', stat: 'spirit' },
    { id: 'gratitude', type: 'gratitude', name: 'Благодарность', icon: 'heart', color: '#e88fa8', stat: 'spirit' },
    { ...CONTENT_SECTION },
  ];
  sections.forEach((s, i) => { s.order = i; s.hidden = false; });
  const quests = [
    q('weight', 'Шаги: 8 000', 'daily', 20, { icon: 'foot' }),
    q('weight', 'Вода: 2 литра', 'daily', 15, { icon: 'droplet' }),
    q('weight', 'Ужин без фастфуда', 'daily', 20, { icon: 'apple' }),
    q('weight', 'Записать обхваты', 'weekly', 40, { auto: 'measure', icon: 'ruler' }),
    q('workout', 'Тренировки за неделю', 'weekly', 160, { target: 4, auto: 'workout', icon: 'dumbbell' }),
    q('reading', 'Читать 20 минут', 'daily', 20, { auto: 'reading', icon: 'book' }),
    q('meditation', 'Медитация 10 минут', 'daily', 20, { auto: 'meditation', icon: 'lotus' }),
    q('abstinence', 'Держусь сегодня', 'daily', 15, { auto: 'abst', icon: 'shield' }),
    q('journal', 'Запись в дневник', 'daily', 15, { auto: 'journal', icon: 'pen' }),
    q('gratitude', 'Три благодарности', 'daily', 15, { auto: 'gratitude', icon: 'heart' }),
    ...contentQuests(),
  ];
  return {
    v: 1,
    createdAt: today(),
    profile: { name: '', title: null },
    xp: 0,
    statXp: Object.fromEntries(STATS.map(s => [s.id, 0])),
    sections, quests,
    events: [],          // {id, d, t, k, q, s, xp, stat, note}
    days: {},            // date -> {acts, login, first, perfect, challenge}
    momentum: { cover: {}, best: 0, shields: 1, checked: null, broken: null, lastShield: null },
    comeback: null,
    weight: { start: null, goal: null, step: 5, entries: [], measures: [], milestones: [] },
    workouts: { list: [], prs: {}, weeklyGoal: 4 },
    reading: { books: [], log: [], yearGoal: 12 },
    meditation: { sessions: [], lastDuration: 10 },
    abstinence: { counters: [] },
    journal: {},
    gratitude: {},
    content: CONTENT_DEFAULT(),
    bosses: [],
    achievements: {},
    badges: [],
    titles: [],
    settings: {
      reminders: { enabled: false, time: '20:00', days: [1, 2, 3, 4, 5, 6, 0], second: false, secondTime: '22:00' },
      minTasks: 1, maxShields: 3, sound: true,
    },
    lastOpen: null,
    migrations: ['content', 'content2', 'content3', 'workout2'],
  };
}

/* Страховочные копии: старые данные никогда не затираются молча */
const SAFE_PREFIX = STORE_KEY + '.safe.';
function safeCopy(raw, reason) {
  try {
    localStorage.setItem(SAFE_PREFIX + Date.now(), JSON.stringify({ reason, at: new Date().toISOString(), raw }));
    const keys = Object.keys(localStorage).filter(k => k.startsWith(SAFE_PREFIX)).sort();
    while (keys.length > 3) localStorage.removeItem(keys.shift());   // храним три последние
  } catch (e) { console.warn('safe copy failed', e); }
}
function safeCopies() {
  return Object.keys(localStorage).filter(k => k.startsWith(SAFE_PREFIX)).sort().reverse().map(k => {
    try { const c = JSON.parse(localStorage.getItem(k)); const s = JSON.parse(c.raw); return { key: k, at: c.at, reason: c.reason, xp: s.xp || 0, name: (s.profile || {}).name || '' }; }
    catch (e) { return null; }
  }).filter(Boolean);
}
function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return defaultState();
  try {
    const s = JSON.parse(raw);
    const before = JSON.stringify(s.migrations || []);
    const out = migrate(s);
    if (JSON.stringify(out.migrations) !== before) safeCopy(raw, 'перед обновлением');
    return out;
  } catch (e) {
    console.warn('load failed', e);
    safeCopy(raw, 'не удалось прочитать');
    return defaultState();
  }
}

function migrate(s) {
  const d = defaultState();
  if (!Array.isArray(s.migrations)) s.migrations = [];
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = { ...d.settings, ...s.settings, reminders: { ...d.settings.reminders, ...(s.settings || {}).reminders } };
  s.momentum = { ...d.momentum, ...s.momentum };
  for (const st of STATS) if (s.statXp[st.id] == null) s.statXp[st.id] = 0;
  // раздел «Контент и бренд» появился в обновлении — добавляем его один раз
  if (!s.migrations.includes('content')) {
    if (!s.sections.some(x => x.type === 'content')) {
      s.sections.push({ ...CONTENT_SECTION, order: s.sections.length, hidden: false });
      s.quests.push(...contentQuests());
      s.migrations.push('content2', 'content3');   // свежий раздел уже в актуальном виде
    }
    s.migrations.push('content');
  }
  // раздел стал общим для всех авторов: прежние задания раздела уходят в архив (опыт за них остаётся)
  if (!s.migrations.includes('content3')) {
    const fresh = contentQuests();
    if (s.sections.some(x => x.id === 'content')) {
      s.quests.filter(x => x.sectionId === 'content' && !x.archived).forEach(x => { x.archived = true; });
      s.quests.push(...fresh);
    }
    const c = s.content || {};
    if (!Array.isArray(c.accounts) || c.accounts.join() === 'ARETE 1,ARETE 2,ARETE 3') c.accounts = CONTENT_DEFAULT().accounts;
    s.content = c;
    s.migrations.push('content2', 'content3');
  }
  // тренировки стали проще: вид и длительность вместо упражнений; старые записи считаем силовыми
  if (!s.migrations.includes('workout2')) {
    for (const w of (s.workouts || {}).list || []) if (!w.type) w.type = 'strength';
    s.migrations.push('workout2');
  }
  s.content = { ...CONTENT_DEFAULT(), ...s.content };
  const cq = s.quests.find(x => x.auto === 'carousel' && !x.archived);
  if (cq) cq.target = Math.max(1, s.content.accounts.length * s.content.perAccount);
  return s;
}

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 120);
}
function saveNow() {
  if (typeof DEMO !== 'undefined' && DEMO) return;   // демо-герой нигде не сохраняется
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); }
  writeStatusForSW();
  if (typeof cloudSchedule === 'function') cloudSchedule();
}

/* Краткий статус для сервис-воркера (напоминания в фоне) */
function writeStatusForSW() {
  if (!('caches' in window)) return;
  const status = {
    date: today(),
    acts: (S.days[today()] || {}).acts || 0,
    streak: momentumStreak(),
    reminders: S.settings.reminders,
  };
  caches.open('lifegame-meta').then(c => c.put('/__status.json', new Response(JSON.stringify(status), { headers: { 'Content-Type': 'application/json' } }))).catch(() => {});
}

/* ---------- фото (IndexedDB) ---------- */
const PhotoDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('lifegame-photos', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('photos', mode); const st = t.objectStore('photos');
      const out = fn(st);
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  },
  put(p) { return this.tx('readwrite', st => st.put(p)); },
  del(id) { return this.tx('readwrite', st => st.delete(id)); },
  all() { return this.tx('readonly', st => st.getAll()); },
  clear() { return this.tx('readwrite', st => st.clear()); },
};

function resizeImage(file, max = 1280) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', 0.84));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

let S = loadState();
