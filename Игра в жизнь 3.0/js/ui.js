/* Интерфейс: тосты, модальные окна, праздничные экраны, анимации */
'use strict';

const ACTIONS = {};   // data-act="имя" → обработчик
const FORMS = {};     // <form data-form="имя"> → обработчик
const INPUTS = {};    // data-input="имя" → обработчик ввода

/* ---------- звук: мягкий колокольчик ---------- */
let audioCtx = null;
function chime(kind = 'tap') {
  if (!S.settings.sound) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const notes = { tap: [880, 1320], level: [523, 659, 784, 1046], win: [392, 523, 659, 784, 1046], bell: [528, 792], soft: [660] }[kind] || [880];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = now + i * (kind === 'tap' ? 0.06 : 0.12);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(kind === 'bell' ? 0.18 : 0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'bell' ? 3.5 : 0.9));
      o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + 4);
    });
  } catch (e) { /* без звука */ }
}
const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };

/* ---------- тосты ---------- */
function toast({ icon: ic = 'info', title, text = '', cls = '', ms = 4200 }) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.innerHTML = `<div class="ico-box">${icon(ic, 17)}</div><div class="grow"><b>${esc(title)}</b>${text ? `<small>${esc(text)}</small>` : ''}</div>`;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
  el.onclick = kill;
  setTimeout(kill, ms);
}

/* ---------- «+40 XP» ---------- */
function xpFloat(amount, mult) {
  const p = lastTap || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.style.left = p.x + 'px'; el.style.top = (p.y - 10) + 'px';
  el.innerHTML = `+${amount} XP${mult > 1 ? `<small>×${String(mult).replace('.', ',')}</small>` : ''}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
function sparks(n = 26, x = window.innerWidth / 2, y = window.innerHeight * 0.42) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    el.className = 'spark-p';
    const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 200, s = .4 + Math.random() * .9;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.transform = `scale(${s})`;
    document.body.appendChild(el);
    el.animate([
      { transform: `translate(-50%,-50%) scale(${s})`, opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(0)`, opacity: 0 },
    ], { duration: 1200 + Math.random() * 900, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => el.remove();
  }
}

/* ---------- модальные окна ---------- */
let modalOnClose = null;
function openModal(html, o = {}) {
  closeModal(true);
  const bg = document.createElement('div');
  bg.className = 'modal-bg'; bg.id = 'modal';
  bg.innerHTML = `<div class="modal ${o.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
  $('#layer').appendChild(bg);
  modalOnClose = o.onClose || null;
  animateAfterRender(bg);
  const f = bg.querySelector('[autofocus]');
  if (f && window.innerWidth > 900) setTimeout(() => f.focus(), 60);
  return bg;
}
function closeModal(silent) {
  const m = $('#modal'); if (!m) return;
  m.remove();
  if (!silent && modalOnClose) { const f = modalOnClose; modalOnClose = null; f(); }
}
function modalHead(title, sub = '') {
  return `<div class="modal-h"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="icon-btn sm" data-act="closeModal" aria-label="Закрыть">${icon('x', 16)}</button></div>`;
}
ACTIONS.closeModal = () => closeModal();

function confirmDialog({ title, text = '', ok = 'Подтвердить', danger = false, extra = '' }) {
  return new Promise(res => {
    let done = false;
    const m = openModal(`${modalHead(title, text)}${extra}
      <div class="modal-f"><button class="btn ghost" data-r="0">Отмена</button><button class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${ok}</button></div>`,
      { onClose: () => { if (!done) res(false); } });
    m.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation(); done = true;
      const form = m.querySelector('form');
      const data = form ? Object.fromEntries(new FormData(form)) : {};
      closeModal(true);
      res(b.dataset.r === '1' ? (extra ? data : true) : false);
    }));
  });
}

/* ---------- праздничные экраны ---------- */
const celebQueue = [];
let celebOpen = false;
function celebrate(html, sound = 'level') {
  celebQueue.push({ html, sound });
  if (!celebOpen) nextCeleb();
}
function nextCeleb() {
  const c = celebQueue.shift();
  if (!c) { celebOpen = false; return; }
  celebOpen = true;
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.innerHTML = `<div class="cel-in">${c.html}<div class="tap">Нажми, чтобы продолжить</div></div>`;
  $('#layer').appendChild(el);
  chime(c.sound); vibrate([20, 40, 30]);
  setTimeout(() => sparks(34), 250);
  let ok = false;
  setTimeout(() => ok = true, 700);
  el.addEventListener('click', () => {
    if (!ok) return;
    el.style.transition = 'opacity .35s'; el.style.opacity = '0';
    setTimeout(() => { el.remove(); nextCeleb(); }, 350);
  });
}

/* ---------- очередь эффектов от движка ---------- */
function flushFx() {
  const list = FX.splice(0);
  let xpTotal = 0, mult = 1;
  for (const f of list) {
    switch (f.type) {
      case 'xp': xpTotal += f.amount; mult = Math.max(mult, f.mult); break;
      case 'toast': toast(f); break;
      case 'momentum': {
        const orb = $('.orb'); if (orb) { orb.classList.remove('bump'); void orb.offsetWidth; orb.classList.add('bump'); }
        toast({ icon: 'flame', title: `Импульс: ${f.streak} ${pDays(f.streak)}`, text: f.tierUp ? `Новая ступень — «${momentumTier(f.streak).name}»` : 'Серия продолжается. Так держать.' });
        if ([7, 30, 100, 365].includes(f.streak)) celebrate(`<div class="cel-badge"><div class="num">${f.streak}</div></div>
          <div class="eyebrow"><span class="live"></span>Новая ступень импульса</div><h2>${momentumTier(f.streak).name}</h2>
          <p>${f.streak} ${pDays(f.streak)} подряд. Множитель опыта теперь ×${String(multiplierFor(f.streak)).replace('.', ',')}.</p>`, 'win');
        break;
      }
      case 'levelup':
        celebrate(`<div class="cel-badge"><div class="num">${f.level}</div></div>
          <div class="eyebrow"><span class="live"></span>Новый уровень</div>
          <h2>${f.newTitle ? 'Титул: ' + esc(f.title) : 'Уровень ' + f.level}</h2>
          <p>${f.newTitle ? 'Ты вырос до нового титула. Персонаж становится сильнее с каждым днём.' : 'Ещё один шаг вверх. Продолжай в том же ритме.'}</p>`);
        break;
      case 'perfect':
        toast({ icon: 'sparkle', title: 'Идеальный день', text: 'Все ежедневные задания выполнены. +50 XP' });
        sparks(18, lastTap ? lastTap.x : undefined, lastTap ? lastTap.y : undefined);
        break;
      case 'gift': {
        const body = f.kind === 'double' ? `<div class="cel-badge">${icon('zap', 64)}</div><div class="eyebrow">Случайная награда</div><h2>Двойной опыт</h2><p>«${esc(f.title)}» принесло ещё +${f.amount} XP.</p>`
          : f.kind === 'shield' ? `<div class="cel-badge">${icon('shield', 64)}</div><div class="eyebrow">Случайная награда</div><h2>Лишний щит</h2><p>Он прикроет импульс в день, когда всё пойдёт не так. Щитов: ${S.momentum.shields}.</p>`
          : `<div class="cel-badge">${icon(f.badge.icon, 64)}</div><div class="eyebrow">Редкий значок</div><h2>${esc(f.badge.name)}</h2><p>Такие выпадают нечасто. Он уже в твоей коллекции.</p>`;
        setTimeout(() => celebrate(body, 'win'), 500);
        break;
      }
      case 'achievement':
        toast({ icon: f.a.icon, title: 'Достижение: ' + f.a.name, text: f.a.desc + ' · +30 XP', ms: 5200 });
        break;
      case 'hit': {
        toast({ icon: f.crit ? 'zap' : 'swords', title: `${f.crit ? 'Критический удар' : 'Удар'} −${f.dmg} HP`, text: f.boss.name, ms: 2600 });
        const c = $(`[data-boss="${f.boss.id}"]`); if (c) { c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); }
        break;
      }
      case 'pr':
        toast({ icon: 'trophy', cls: 'pr', title: 'Новый личный рекорд', text: `${f.ex}: ${fmtNum(f.w, 1)} кг (было ${fmtNum(f.prev, 1)})`, ms: 6000 });
        chime('win');
        break;
      case 'victory':
        celebrate(`<div class="cel-badge" style="--bc:${f.boss.color}">${icon(f.boss.icon, 72)}</div>
          <div class="eyebrow"><span class="live"></span>Победа · ${TIERS[f.boss.tier].name} босс</div>
          <h2>${esc(f.boss.name)} повержен</h2>
          <p>+${f.boss.reward.xp} XP${f.stats.length ? ' · ' + f.stats.map(statName).join(', ') + ' растёт' : ''}${f.boss.reward.title ? ` · новый титул «${esc(f.boss.reward.title)}»` : ''}. Босс отправился в Зал славы.</p>`, 'win');
        break;
    }
  }
  if (xpTotal > 0) { xpFloat(xpTotal, mult); chime('tap'); vibrate(12); }
}

/* плавное заполнение шкал и колец после перерисовки */
function animateAfterRender(root = document) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll('.bar i[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; i.removeAttribute('data-w'); });
    root.querySelectorAll('.ring-fg[data-to]').forEach(c => { c.style.strokeDashoffset = c.dataset.to; c.removeAttribute('data-to'); });
  }));
}

/* ---------- общие блоки разметки ---------- */
function deltaBadge(v, { digits = 0, suffix = '%', invert = false, flat = 'без изменений' } = {}) {
  if (v == null || !isFinite(v)) return '';
  if (Math.abs(v) < 0.05) return `<span class="delta">${flat}</span>`;
  const good = invert ? v < 0 : v > 0;
  return `<span class="delta ${good ? 'up' : 'down'}">${fmtSigned(v, digits, suffix)}</span>`;
}
function segmented(name, options, value, cls = '') {
  return `<div class="seg ${cls}">${options.map(([v, l]) => `<button type="button" class="${v === value ? 'on' : ''}" data-act="${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
}
function switchEl(act, on, extra = '') { return `<button type="button" class="switch ${on ? 'on' : ''}" data-act="${act}" ${extra} aria-pressed="${on}"></button>`; }
function emptyState(ic, text, btn = '') { return `<div class="empty">${icon(ic, 28)}<div>${text}</div>${btn ? `<div class="mt">${btn}</div>` : ''}</div>`; }
function sectionIconBox(sec, size = 18, cls = '') { return `<div class="ico-box tint ${cls}" style="--ic:${sec.color}">${icon(sec.icon, size)}</div>`; }

/* строка задания: одно нажатие — отметка */
function questRow(qq, o = {}) {
  const st = questStatus(qq), sec = sectionById(qq.sectionId) || { color: '#fff' };
  const kindLbl = qq.kind === 'daily' ? (st.target > 1 ? `${Math.min(st.count, st.target)} из ${st.target} сегодня` : '') : qq.kind === 'weekly' ? `${st.count} из ${st.target} за неделю` : 'Большая цель';
  const xp = qq.kind !== 'goal' && qq.target > 1 ? Math.round(qq.xp / qq.target) : qq.xp;
  const streak = st.streak > 1 ? `<span class="streak-mini">${icon('flame', 12)} ${st.streak}</span>` : '';
  const multi = qq.kind !== 'goal' && qq.target > 1;
  const prog = multi ? `<div class="qprog">${Array.from({ length: qq.target }, (_, i) => `<i class="${i < st.count ? 'on' : ''}"></i>`).join('')}</div>` : '';
  // в задании из нескольких отметок лишнюю можно снять в любой момент, а не только когда всё выполнено
  const undo = multi && st.count > 0 ? `<button type="button" class="q-undo" data-act="questUndo" data-id="${qq.id}" aria-label="Снять одну отметку">${icon('undo', 12)}снять</button>` : '';
  return `<div class="quest ${st.done ? 'done' : ''} ${o.just === qq.id ? 'just' : ''}" style="--qc:${sec.color}" data-act="quest" data-id="${qq.id}" role="button" aria-pressed="${st.done}">
    <div class="chk">${icon('check', 16)}</div>
    <div class="qt"><b>${esc(qq.title)}</b><small>${o.showSection ? `<span>${esc(sec.name)}</span>` : ''}${kindLbl ? `<span>${kindLbl}</span>` : ''}${undo}${streak}</small>${prog}</div>
    ${o.edit ? `<button class="icon-btn sm plain" data-act="editQuest" data-id="${qq.id}" aria-label="Изменить">${icon('dots', 16)}</button>` : `<span class="qx">+${xp} XP</span>`}
  </div>`;
}
