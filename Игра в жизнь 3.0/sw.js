/* Сервис-воркер: офлайн-режим и фоновые напоминания */
const VERSION = 'lifegame-v22';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/util.js', 'js/store.js', 'js/engine.js', 'js/charts.js', 'js/ui.js',
  'js/cloud.js', 'js/view-home.js', 'js/view-sections.js', 'js/view-trackers.js', 'js/view-arena.js', 'js/view-stats.js', 'js/view-account.js', 'js/onboarding.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'lifegame-meta').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// сеть в приоритете (чтобы обновления приезжали сразу), кэш — если офлайн
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com') || url.hostname === 'cdn.jsdelivr.net';
  if (url.origin !== location.origin && !isFont) return;
  if (isFont) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })));
    return;
  }
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});

// фоновая проверка (Chrome/Android с установленным приложением)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'lifegame-reminder') e.waitUntil(backgroundReminder());
});
async function backgroundReminder() {
  const c = await caches.open('lifegame-meta');
  const res = await c.match('/__status.json'); if (!res) return;
  const st = await res.json(), r = st.reminders || {};
  if (!r.enabled) return;
  const now = new Date();
  const t = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  if (st.date === t && st.acts > 0) return;
  if (!(r.days || []).includes(now.getDay())) return;
  if (now.toTimeString().slice(0, 5) < r.time) return;
  const sent = await c.match('/__sent.json').then(x => x ? x.json() : {}).catch(() => ({}));
  if (sent[t]) return;
  sent[t] = 1;
  await c.put('/__sent.json', new Response(JSON.stringify(sent)));
  const streak = st.date === t || st.streak ? st.streak : 0;
  const body = streak > 0 ? `Твоему импульсу ${streak} ${plural(streak)}. Одно задание, и он продолжится.` : 'Одно маленькое дело сегодня — и твой персонаж станет чуть сильнее.';
  await self.registration.showNotification('Игра в жизнь', { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'lifegame-reminder' });
}
function plural(n) { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? 'дней' : b > 1 && b < 5 ? 'дня' : b === 1 ? 'день' : 'дней'; }

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
