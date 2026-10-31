/* Утилиты: даты, форматирование, иконки */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sum = (arr, f = x => x) => arr.reduce((s, x) => s + (+f(x) || 0), 0);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- даты (локальные ключи YYYY-MM-DD) ---------- */
function ymd(d = new Date()) {
  const x = new Date(d);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}
const today = () => ymd();
function parseDay(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(k, n) { const d = parseDay(k); d.setDate(d.getDate() + n); return ymd(d); }
function diffDays(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 864e5); } // b - a
function weekStart(k = today()) { const d = parseDay(k); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return ymd(d); }
function daysRange(from, to) { const out = []; for (let k = from; k <= to; k = addDays(k, 1)) out.push(k); return out; }

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WD_LONG = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

function fmtDay(k, withYear = false) {
  const d = parseDay(k);
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + (withYear ? ' ' + d.getFullYear() : '');
}
function fmtShort(k) { const d = parseDay(k); return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()]; }
function relDay(k) {
  const n = diffDays(k, today());
  if (n === 0) return 'сегодня';
  if (n === 1) return 'вчера';
  if (n === 2) return 'позавчера';
  if (n < 7) return n + ' ' + plural(n, ['день', 'дня', 'дней']) + ' назад';
  return fmtDay(k, parseDay(k).getFullYear() !== new Date().getFullYear());
}

function plural(n, forms) {
  n = Math.abs(Math.floor(n)) % 100; const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}
const pDays = n => plural(n, ['день', 'дня', 'дней']);

function fmtNum(v, digits = 0) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtSigned(v, digits = 0, suffix = '') {
  const s = v > 0 ? '+' : v < 0 ? '−' : '';
  return s + fmtNum(Math.abs(v), digits) + suffix;
}
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------- иконки (24×24, линейные) ---------- */
const ICONS = {
  home: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
  chart: '<path d="M3.5 3.5v17h17"/><path d="m7.5 14.5 3.5-4 3 2.5 5-6"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M8 10a5 5 0 0 1 8 0M12 10l1.6-2.4"/>',
  dumbbell: '<path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
  book: '<path d="M4 5.5A2 2 0 0 1 6 3.5h14v14H6a2 2 0 0 0-2 2zM4 19.5a2 2 0 0 0 2 2h14v-4"/>',
  lotus: '<path d="M12 20.5c-4.5 0-8.5-2.3-9.5-6.5 3.2 0 6.7 1.5 9.5 4.5 2.8-3 6.3-4.5 9.5-4.5-1 4.2-5 6.5-9.5 6.5z"/><path d="M12 18c-2.2-2-3.5-5-3.5-8.5C10 10 11.2 11 12 12.5c.8-1.5 2-2.5 3.5-3 0 3.5-1.3 6.5-3.5 8.5zM12 9V4.5"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
  pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  heart: '<path d="M12 20s-7.5-4.6-9-9.3A4.7 4.7 0 0 1 12 7.2a4.7 4.7 0 0 1 9 3.5C19.5 15.4 12 20 12 20z"/>',
  flame: '<path d="M12 21.5c-4 0-7-2.7-7-6.5 0-3.6 2.6-5.6 4-8.2.6 2 1.6 3 3 3.6.1-3 .7-5.4 2.7-6.9.6 3.1 4.3 5.6 4.3 11.5 0 3.8-3 6.5-7 6.5z"/>',
  shield: '<path d="M12 3.2 19.5 6v5.8c0 4.6-3.2 8-7.5 9-4.3-1-7.5-4.4-7.5-9V6z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevD: '<path d="m6 9.5 6 6 6-6"/>',
  chevU: '<path d="m6 14.5 6-6 6 6"/>',
  arrowUpR: '<path d="M7 17 17 7M8 7h9v9"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  eye: '<path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18M10.6 5.1Q11.3 5 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.8M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  play: '<path d="M7.5 4.8v14.4L19 12z"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  crown: '<path d="m3.5 8 4.5 4 4-6.5 4 6.5 4.5-4-2 11h-13z"/>',
  skull: '<path d="M12 3a8 8 0 0 0-8 8c0 2.5 1 4.2 3 5.2V20h10v-3.8c2-1 3-2.7 3-5.2a8 8 0 0 0-8-8z"/><circle cx="9" cy="11.5" r="1.6"/><circle cx="15" cy="11.5" r="1.6"/><path d="M10.5 20v-2.5M13.5 20v-2.5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4.5" rx="1"/><path d="M5 12.5V21h14v-8.5M12 8v13M12 8S10.6 3.4 8.2 4 7.7 8 12 8zM12 8s1.4-4.6 3.8-4S16.3 8 12 8z"/>',
  zap: '<path d="M13 2.5 4.5 14H11l-1 7.5L18.5 10H12z"/>',
  mountain: '<path d="m2.5 20 7-12 4 7 2-3.5 6 8.5z"/>',
  droplet: '<path d="M12 3.2s6 6.4 6 10.8a6 6 0 0 1-12 0c0-4.4 6-10.8 6-10.8z"/>',
  foot: '<path d="M8.5 3c1.8 0 2.8 2 2.8 4.6S10.3 12.5 8.5 12.5 5.7 10.2 5.7 7.6 6.7 3 8.5 3zM6.2 14.5h4.6v1.8a2.3 2.3 0 0 1-4.6 0zM15.5 7c1.8 0 2.8 2 2.8 4.6s-1 4.9-2.8 4.9-2.8-2.3-2.8-4.9S13.7 7 15.5 7zM13.2 18.5h4.6v.2a2.3 2.3 0 0 1-4.6 0z"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  brain: '<path d="M9.5 4A3 3 0 0 0 6.5 7 3 3 0 0 0 4.5 12a3 3 0 0 0 2 5 3 3 0 0 0 5.5 1.5V5.5A2.3 2.3 0 0 0 9.5 4zM14.5 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-5.5 1.5"/>',
  sparkle: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16.5v4M17 18.5h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  download: '<path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4.5 20.5h15"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 20.5h15"/>',
  refresh: '<path d="M20 11.5a8 8 0 1 0-2.3 5.7M20 4.5v7h-7"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
  alert: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.3v.2"/>',
  leaf: '<path d="M5 19.5C5 10.5 11 5 20 4.5c0 9-5.5 15-14.5 15zM5 19.5l8-8"/>',
  dots: '<circle cx="5.5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18.5" cy="12" r="1"/>',
  ruler: '<path d="M3 17 17 3l4 4L7 21zM7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 15.5-4.5-4.5-9 8.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  arrowUp: '<path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/>',
  arrowDown: '<path d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5 5.5 3h4l2.5 6M15.5 10.5l3-7.5h-4L12 9"/>',
  coffee: '<path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
  wallet: '<rect x="3.5" y="6" width="17" height="13" rx="3"/><path d="M3.5 10h17M16 14.5h1"/>',
  bed: '<path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.8"/>',
  run: '<circle cx="14" cy="4.5" r="1.8"/><path d="m6 20 3.5-5 3 2V12l-3-2.5L7 11M12.5 9.5l3.5 3 3-1M12.5 17l2.5 4"/>',
  apple: '<path d="M12 7.5c-1.5-1-5.5-1.5-6.8 2.2C4 13.5 6.5 20 9 20.5c1.2.2 2-.6 3-.6s1.8.8 3 .6c2.5-.5 5-7 3.8-10.8C17.5 6 13.5 6.5 12 7.5z"/><path d="M12 7.5c0-2 1-3.5 3-4"/>',
  rocket: '<path d="M12 15.5 8.5 12C10 7 13.5 3.5 20.5 3.5c0 7-3.5 10.5-8.5 12zM8.5 12H5l2-3.5h4M12 15.5V19l3.5-2v-4"/><path d="M6 16c-1.5.5-2.5 2.5-2.5 4.5 2 0 4-1 4.5-2.5"/>',
  ghost: '<path d="M5 20.5V10a7 7 0 0 1 14 0v10.5l-2.3-1.8-2.4 1.8-2.3-1.8-2.3 1.8-2.4-1.8z"/><circle cx="9.5" cy="10.5" r="1"/><circle cx="14.5" cy="10.5" r="1"/>',
  castle: '<path d="M4 21V9h2.5v2.5h2.5V9h2v4h2V9h2v2.5h2.5V9H20v12zM9.5 21v-4a2.5 2.5 0 0 1 5 0v4M7 9V4.5l2 1.5M17 9V4.5l2 1.5"/>',
  flag: '<path d="M5 21V4M5 4.5h11l-2 4 2 4H5"/>',
  hourglass: '<path d="M6.5 3h11M6.5 21h11M7.5 3c0 5 4.5 6 4.5 9s-4.5 4-4.5 9M16.5 3c0 5-4.5 6-4.5 9s4.5 4 4.5 9"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10.5 5-3v9l-5-3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};

function icon(name, size = 20, cls = '') {
  const inner = ICONS[name] || ICONS.sparkle;
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

const SECTION_ICONS = ['scale', 'dumbbell', 'book', 'lotus', 'ban', 'pen', 'heart', 'video', 'mic', 'camera','run', 'droplet', 'foot', 'apple', 'bed', 'brain', 'code', 'music', 'globe', 'wallet', 'coffee', 'leaf', 'sun', 'moon', 'target', 'rocket', 'star'];
const BOSS_ICONS = ['skull', 'crown', 'flame', 'mountain', 'zap', 'ghost', 'castle', 'target', 'shield', 'star', 'rocket', 'hourglass', 'swords', 'dumbbell', 'book', 'lotus', 'scale', 'ban', 'moon', 'flag', 'video', 'mic'];
const COLORS = ['#d7a8d0', '#b7a6f2', '#9fc3ff', '#8fdcc0', '#c8dca0', '#f0c890', '#f2a28e', '#e88fa8', '#d9d9de'];
