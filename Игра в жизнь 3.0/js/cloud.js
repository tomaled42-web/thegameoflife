/* Аккаунты, облачное сохранение и подписка (Supabase) */
'use strict';

const CLOUD_URL = 'https://tsxovrldstzkusraelll.supabase.co';
const CLOUD_KEY = 'sb_publishable_s20--dldNQVRtjh_HHX-IA_KHw8WvyM';   // публичный ключ — его можно хранить в приложении

/* Подписка. paywall: true — включить замки на платных разделах (когда заработает оплата).
   payments: true — кнопка «Оформить» ведёт на оплату. */
const BILLING = { paywall: true, payments: true };
const PRICES = { month: 199, year: 1490 };
const FREE_SECTIONS = 4;

const Cloud = {
  sb: null, user: null, profile: null, status: 'off',
  lastSync: localStorage.getItem('lifegame.lastSync') || '',
  dirty: localStorage.getItem('lifegame.dirty') === '1',
  pushTimer: null, lastPull: 0, busy: false,
};
function cloudMeta() {
  try {
    localStorage.setItem('lifegame.lastSync', Cloud.lastSync || '');
    localStorage.setItem('lifegame.dirty', Cloud.dirty ? '1' : '0');
  } catch (e) { }
}
const safeRender = () => { if (typeof render === 'function' && document.getElementById('view')) { render(); flushFx(); } };

function cloudInit() {
  if (!window.supabase || !window.supabase.createClient) { Cloud.status = 'unavailable'; return; }
  Cloud.sb = window.supabase.createClient(CLOUD_URL, CLOUD_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'lifegame.auth' },
  });
  Cloud.sb.auth.onAuthStateChange((event, session) => {
    const u = session ? session.user : null;
    const changed = (u && u.id) !== (Cloud.user && Cloud.user.id);
    Cloud.user = u;
    if (u) forgetLoginStep();
    if (!u) { Cloud.profile = null; Cloud.status = 'off'; }
    // ушёл в почту за кодом, а приложение перезапустилось — сразу возвращаем окно ввода кода
    if (event === 'INITIAL_SESSION' && !u && typeof resumeLogin === 'function') setTimeout(resumeLogin, 0);
    if (changed && u) setTimeout(onSignedIn, 0);   // вызовы Supabase нельзя делать прямо внутри обработчика
    else if (changed) safeRender();
  });
  window.addEventListener('online', () => { if (Cloud.dirty) cloudPush(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) cloudRefresh(); });
}

/* ---------- вход по коду из письма ---------- */
/* шаг «код отправлен» помним 15 минут: столько живёт код */
const LOGIN_KEY = 'lifegame.loginStep';
function rememberLoginStep(email) { try { localStorage.setItem(LOGIN_KEY, JSON.stringify({ email, t: Date.now() })); } catch (e) { } }
function forgetLoginStep() { try { localStorage.removeItem(LOGIN_KEY); } catch (e) { } }
function pendingLoginStep() {
  try {
    const s = JSON.parse(localStorage.getItem(LOGIN_KEY) || 'null');
    return s && s.email && Date.now() - s.t < 15 * 60 * 1000 ? s : null;
  } catch (e) { return null; }
}
async function cloudSendCode(email) {
  const { error } = await Cloud.sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
  if (error) throw error;
}
async function cloudVerify(email, token) {
  const { error } = await Cloud.sb.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}
async function cloudSignInPassword(email, password) {
  const { error } = await Cloud.sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
async function cloudSignOut() {
  if (Cloud.dirty) await cloudPush();
  await Cloud.sb.auth.signOut();
}

/* ---------- синхронизация ---------- */
const hasProgress = s => (s.xp || 0) > 60 || (s.events || []).length > 3;
const summary = s => ({ xp: s.xp || 0, level: levelInfo(s.xp || 0).level, name: (s.profile || {}).name || '' });

async function loadProfile() {
  const { data, error } = await Cloud.sb.from('profiles').select('trial_until, premium_until').eq('id', Cloud.user.id).maybeSingle();
  if (!error) Cloud.profile = data;
}
async function cloudPull() {
  const { data, error } = await Cloud.sb.from('saves').select('data, updated_at').eq('user_id', Cloud.user.id).maybeSingle();
  if (error) throw error;
  return data;
}
async function cloudPush(force = false) {
  if (!Cloud.user || !Cloud.sb) return;
  if (Cloud.busy && !force) { cloudSchedule(); return; }
  Cloud.busy = true;
  const now = new Date().toISOString();
  try {
    const { error } = await Cloud.sb.from('saves').upsert({ user_id: Cloud.user.id, data: S, updated_at: now });
    if (error) throw error;
    Cloud.lastSync = now; Cloud.dirty = false; Cloud.status = 'ok';
  } catch (e) { console.warn('cloud push failed', e); Cloud.status = 'error'; }
  Cloud.busy = false;
  cloudMeta();
}
/* вызывается после каждого локального сохранения */
function cloudSchedule() {
  Cloud.dirty = true; cloudMeta();
  if (!Cloud.user) return;
  clearTimeout(Cloud.pushTimer);
  Cloud.pushTimer = setTimeout(() => cloudPush(), 2500);
}
function applyRemote(remote, reason = 'перед загрузкой из облака') {
  safeCopy(JSON.stringify(S), reason);
  S = migrate(remote.data);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { }
  Cloud.lastSync = remote.updated_at; Cloud.dirty = false; cloudMeta();
  rollover();
}
/* подтянуть изменения с другого устройства */
async function cloudRefresh() {
  if (!Cloud.user || Cloud.dirty || Date.now() - Cloud.lastPull < 30000) return;
  Cloud.lastPull = Date.now();
  try {
    loadProfile();
    const remote = await cloudPull();
    if (remote && new Date(remote.updated_at) > new Date(Cloud.lastSync || 0)) {
      applyRemote(remote);
      toast({ icon: 'refresh', title: 'Прогресс обновлён', text: 'Подтянуты изменения с другого устройства' });
      safeRender();
    }
  } catch (e) { console.warn('cloud refresh failed', e); }
}
async function onSignedIn() {
  Cloud.status = 'syncing'; safeRender();
  try {
    await loadProfile();
    const remote = await cloudPull();
    const linked = localStorage.getItem('lifegame.cloudUser');
    if (!remote) await cloudPush(true);
    else if (linked === Cloud.user.id) {
      const remoteNewer = new Date(remote.updated_at) > new Date(Cloud.lastSync || 0);
      if (Cloud.dirty && remoteNewer) await chooseVersion(remote);
      else if (remoteNewer) applyRemote(remote);
      else if (Cloud.dirty) await cloudPush(true);
    } else if (hasProgress(S)) await chooseVersion(remote);
    else applyRemote(remote);
    localStorage.setItem('lifegame.cloudUser', Cloud.user.id);
    Cloud.status = 'ok';
  } catch (e) { console.warn('cloud sync failed', e); Cloud.status = 'error'; }
  Cloud.lastPull = Date.now();
  safeRender();
  if (typeof watchPayment === 'function') watchPayment();
}
/* на устройстве и в облаке разный прогресс — пусть решает человек; другой вариант остаётся страховочной копией */
function chooseVersion(remote) {
  return new Promise(resolve => {
    const r = summary(remote.data), l = summary(S);
    const card = (k, title, s, when) => `<button class="card flat click" data-pick-ver="${k}" style="text-align:left;width:100%">
      <div class="label">${title}</div><div class="num num-m" style="margin:8px 0 6px">${fmtNum(s.xp)}<span class="u">XP</span></div>
      <div class="sub">Уровень ${s.level}${s.name ? ' · ' + esc(s.name) : ''}${when ? ' · ' + when : ''}</div></button>`;
    const m = openModal(`${modalHead('Какой прогресс оставить?', 'В аккаунте уже есть сохранение. Второй вариант не пропадёт — он останется страховочной копией в настройках.')}
      <div class="grid g2">${card('cloud', 'Из облака', r, new Date(remote.updated_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }))}${card('local', 'На этом устройстве', l, '')}</div>`,
      { onClose: () => resolve(null) });
    m.querySelectorAll('[data-pick-ver]').forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation(); closeModal(true);
      if (b.dataset.pickVer === 'cloud') applyRemote(remote);
      else { safeCopy(JSON.stringify(remote.data), 'облачная версия, заменена версией с устройства'); await cloudPush(true); }
      resolve(b.dataset.pickVer);
    }));
  });
}

/* ---------- подписка ---------- */
function premiumState() {
  if (!BILLING.paywall) return { active: true, kind: 'open' };
  const p = Cloud.profile, now = Date.now();
  if (p && p.premium_until && new Date(p.premium_until) > now) return { active: true, kind: 'premium', until: p.premium_until };
  if (p && p.trial_until && new Date(p.trial_until) > now) return { active: true, kind: 'trial', until: p.trial_until };
  return { active: false, kind: Cloud.user ? 'expired' : 'guest' };
}
const isPremium = () => premiumState().active;
function sectionUnlocked(id) {
  if (isPremium()) return true;
  return visibleSections().slice(0, FREE_SECTIONS).some(s => s.id === id);
}
function premiumGate() { if (isPremium()) return true; openPaywall(); return false; }
