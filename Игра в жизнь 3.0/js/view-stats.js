/* Статистика, персонаж и достижения, настройки */
'use strict';

UI.period = 'month';
const PERIODS = { week: [7, 'Неделя'], month: [30, 'Месяц'], half: [182, 'Полгода'], year: [365, 'Год'] };
const STAT_COLORS = { body: '#8fdcc0', strength: '#f2a28e', intellect: '#9fc3ff', spirit: '#b7a6f2', will: '#f0c890', mastery: '#d7a8d0', influence: '#c8dca0' };


function renderStats() {
  const [n] = PERIODS[UI.period], t = today(), from = addDays(t, -(n - 1)), pFrom = addDays(from, -n), pTo = addDays(from, -1);
  const xp = xpBetween(from, t), pxp = xpBetween(pFrom, pTo), idx = xpIndex();
  const tasks = S.events.filter(e => e.k === 'quest' && e.d >= from).length, ptasks = S.events.filter(e => e.k === 'quest' && e.d >= pFrom && e.d <= pTo).length;
  const range = daysRange(from, t), prange = daysRange(pFrom, pTo);
  const perfect = range.filter(d => (S.days[d] || {}).perfect).length, pperfect = prange.filter(d => (S.days[d] || {}).perfect).length;
  const active = range.filter(d => (S.days[d] || {}).acts > 0).length, pactive = prange.filter(d => (S.days[d] || {}).acts > 0).length;
  const pct = (a, b) => b ? (a - b) / b * 100 : null;

  // опыт по дням (при длинном периоде — по неделям)
  const byWeek = n > 60;
  const xpPts = byWeek
    ? (() => { const out = []; for (let w = weekStart(from); w <= t; w = addDays(w, 7)) out.push({ x: dayIdx(w), d: w, y: daysRange(w, addDays(w, 6)).reduce((a, d) => a + xpOn(d), 0) }); return out; })()
    : range.map(d => ({ x: dayIdx(d), d, y: xpOn(d) }));
  // рост характеристик — накопительно
  const statSeries = STATS.map(s => {
    const m = idx.stat[s.id] || {};
    let acc = xpBetween('0000-00-00', addDays(from, -1), m);
    const step = byWeek ? 7 : 1, pts = [];
    for (let i = 0; i < range.length; i += step) {
      const d = range[i];
      for (let k = i; k < Math.min(i + step, range.length); k++) acc += xpOn(range[k], m);
      pts.push({ x: dayIdx(d), d, y: acc, s: s.name });
    }
    return { pts, color: STAT_COLORS[s.id], width: 1.6, name: s.name };
  }).filter(s => s.pts.some(p => p.y > 0));
  const tr = sortedWeights().filter(x => x.d >= from);
  const moods = Object.entries(S.journal).filter(([k, v]) => k >= from && v.mood).sort();
  const weeks = Object.entries(xpByWeek()).sort((a, b) => b[1] - a[1]);

  return `
  <div class="page-h">
    <div><div class="eyebrow"><span class="live"></span>Обновлено только что</div><h1>Статистика</h1><p>Сравнение только с самим собой.</p></div>
    ${segmented('period', Object.entries(PERIODS).map(([k, [, l]]) => [k, l]), UI.period)}
  </div>
  <div class="grid g4 keep">
    ${kpi('Опыт', fmtNum(xp), 'XP', pct(xp, pxp))}
    ${kpi('Заданий выполнено', tasks, '', pct(tasks, ptasks))}
    ${kpi('Активных дней', active, '/ ' + n, pct(active, pactive))}
    ${kpi('Идеальных дней', perfect, '', perfect - pperfect, ' дн.')}
  </div>
  <div class="card mt">
    <div class="card-h"><h3>${icon('chart', 18)} Опыт ${byWeek ? 'по неделям' : 'по дням'}</h3><span class="chip">прошлый период: <b>${fmtNum(pxp)}</b></span></div>
    ${lineChart({ id: 'xp', h: 230, zeroBase: true, series: [{ pts: xpPts, color: 'var(--accent)', fill: true, width: 2 }], yFmt: v => fmtNum(v),
      xLabels: monthTicks(xpPts[0].d, xpPts[xpPts.length - 1].d), tipFmt: p => `${byWeek ? 'Неделя с ' + fmtShort(p.d) : fmtDay(p.d)}<b>+${fmtNum(p.y)} XP</b>` })}
  </div>
  <div class="card mt">
    <div class="card-h"><h3>${icon('calendar', 18)} Карта активности за год</h3><div class="legend"><span>меньше</span>${[0, 1, 2, 3, 4].map(l => `<span class="hm" style="display:inline-grid;grid-template-rows:none"><i class="hm-${l}" style="width:11px;height:11px"></i></span>`).join('')}<span>больше</span></div></div>
    ${heatmap(addDays(t, -364), t, d => { const r = S.days[d] || {}, a = r.acts || 0; return { level: a === 0 ? 0 : a < 3 ? 1 : a < 6 ? 2 : a < 9 ? 3 : 4, perfect: r.perfect, title: `${a} действий${r.perfect ? ' · идеальный день' : ''}` }; })}
    <div class="sub mt">Обведённые клетки — идеальные дни. Всего активных дней: ${Object.values(S.days).filter(d => d.acts > 0).length}.</div>
  </div>
  <div class="grid g2 mt">
    <div class="card">
      <div class="card-h"><h3>${icon('arrowUp', 18)} Рост характеристик</h3></div>
      ${lineChart({ id: 'stats', h: 200, series: statSeries.length ? statSeries : [{ pts: [] }], yFmt: v => fmtNum(v),
        xLabels: monthTicks(from, t, 4), tipFmt: (p, ser) => `${fmtDay(p.d)}${ser.map(s => { const q = s.pts.find(x => x.x === p.x); return q ? `<div style="color:${s.color}">${s.name}: ${fmtNum(q.y)}</div>` : ''; }).join('')}`, empty: 'Выполняй задания — характеристики начнут расти' })}
      <div class="legend mt">${statSeries.map(s => `<span><i style="--c:${s.color}"></i>${s.name}</span>`).join('')}</div>
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('scale', 18)} Вес</h3>${tr.length > 1 ? deltaBadge(tr[tr.length - 1].kg - tr[0].kg, { digits: 1, suffix: ' кг', invert: true }) : ''}</div>
      ${lineChart({ id: 'sw', h: 200, series: [{ pts: tr.map(p => ({ x: dayIdx(p.d), y: p.kg, d: p.d })), color: '#8fdcc0', fill: true, width: 2 }], yFmt: v => fmtNum(v),
        xLabels: tr.length ? monthTicks(tr[0].d, tr[tr.length - 1].d, 4) : [], tipFmt: p => `${fmtDay(p.d)}<b>${fmtNum(p.y, 1)} кг</b>`, empty: 'Нет взвешиваний за этот период' })}
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('sun', 18)} Настроение</h3>${moods.length ? `<span class="chip">среднее <b>${fmtNum(sum(moods, ([, v]) => v.mood) / moods.length, 1)}</b></span>` : ''}</div>
      ${lineChart({ id: 'sm', h: 200, series: [{ pts: moods.map(([k, v]) => ({ x: dayIdx(k), y: v.mood, d: k })), color: '#d7a8d0', fill: true, width: 2 }], yFmt: v => fmtNum(v),
        xLabels: moods.length ? monthTicks(moods[0][0], moods[moods.length - 1][0], 4) : [], tipFmt: p => `${fmtDay(p.d)}<b>${MOODS[p.y - 1]}</b>`, empty: 'Отмечай настроение в дневнике' })}
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('trophy', 18)} Лучшие недели</h3></div>
      ${weeks.length ? `<table class="table"><tbody>${weeks.slice(0, 5).map(([w, v], i) => `<tr><td class="dim" style="width:30px">#${i + 1}</td><td>${fmtShort(w)} – ${fmtShort(addDays(w, 6))}${w === weekStart() ? ' <span class="delta acc" style="height:20px">эта неделя</span>' : ''}</td><td style="text-align:right"><b style="font-weight:500">${fmtNum(v)}</b> <span class="dim">XP</span></td></tr>`).join('')}</tbody></table>` : emptyState('trophy', 'Пока нет завершённых недель')}
    </div>
  </div>
  <div class="section-title"><h2>По разделам</h2><small>${PERIODS[UI.period][1].toLowerCase()}</small></div>
  <div class="grid g3">${activeSections().map(s => { const m = idx.sec[s.id] || {}, v = xpBetween(from, t, m), pv = xpBetween(pFrom, pTo, m);
    const sp = daysRange(addDays(t, -13), t).map(d => xpOn(d, m));
    return `<div class="card tight click" data-act="nav" data-to="s/${s.id}"><div class="row between">${sectionIconBox(s, 16, 'sm')}${deltaBadge(pct(v, pv))}</div>
      <div class="label mt">${esc(s.name)}</div><div class="num num-s" style="margin-top:6px">${fmtNum(v)}<span class="u">XP</span></div><div class="mt">${sparkline(sp, { color: s.color })}</div></div>`; }).join('')}</div>`;
}
function kpi(label, value, unit, delta, suffix = '%') {
  return `<div class="card tight"><div class="label">${label}</div><div class="num num-m" style="margin:12px 0 10px">${value}${unit ? `<span class="u">${unit}</span>` : ''}</div>
    ${delta == null ? '<span class="delta">нет сравнения</span>' : deltaBadge(delta, { suffix })}</div>`;
}
ACTIONS.period = el => {
  if (['half', 'year'].includes(el.dataset.v) && !isPremium()) { openPaywall('Статистика за полгода и год — в подписке.'); return false; }
  UI.period = el.dataset.v;
};

/* ---------- персонаж и достижения ---------- */
function renderProfile() {
  const li = levelInfo(), nm = S.profile.name || 'Герой';
  const titles = [...TITLES.filter(([l]) => l <= li.level).map(([, n]) => n), ...S.titles];
  const got = ACHIEVEMENTS.filter(a => S.achievements[a.id]).length;
  const won = S.bosses.filter(b => b.status === 'won').length;
  return `
  <div class="page-h"><div><div class="eyebrow"><span class="live"></span>В игре с ${fmtDay(S.createdAt, true)}</div><h1>${esc(nm)}</h1><p>${esc(currentTitle())} · уровень ${li.level}</p></div>
    <button class="btn" data-act="nav" data-to="settings">${icon('settings', 16)} Настройки</button></div>
  <div class="grid g-hero">
    <div class="card glow">
      <div class="row" style="gap:24px;flex-wrap:wrap">
        ${ring(li.pct, { size: 150, stroke: 6, key: 'prof-lvl', color: 'var(--accent)', glow: true, center: `<div><div class="sub">уровень</div><div class="num num-l">${li.level}</div></div>` })}
        <div class="grow">
          <div class="label">Титул</div>
          <select class="input mt" style="max-width:280px" data-change="pickTitle"><option value="">Авто: ${titleForLevel(li.level)}</option>${titles.map(t => `<option ${S.profile.title === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
          <div class="kv mt2"><div><small>Опыт</small><b>${fmtNum(S.xp)}</b></div><div><small>До уровня</small><b>${fmtNum(li.left)}</b></div><div><small>Лучшая серия</small><b>${S.momentum.best}</b></div><div><small>Побед</small><b>${won}</b></div></div>
        </div>
      </div>
      <div class="hr"></div>
      <div class="label mb">Путь титулов</div>
      <div class="row wrap" style="gap:6px">${TITLES.map(([l, n]) => `<span class="chip" style="${li.level >= l ? 'color:var(--text);border-color:var(--line-2)' : 'opacity:.55'}">${l} · ${n}</span>`).join('')}</div>
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('user', 18)} Характеристики</h3></div>
      ${STATS.map(s => { const xp = S.statXp[s.id] || 0; return `<div class="stat-row"><span style="color:${STAT_COLORS[s.id]}">${icon(s.icon, 18)}</span><b>${s.name}</b><span class="sub">ур. ${statLevel(xp)} · ${fmtNum(xp)} XP</span>${bar(statProgress(xp), 'pstat-' + s.id, { cls: 'thin', color: STAT_COLORS[s.id] })}</div>`; }).join('')}
      <div class="sub mt">Каждый раздел качает свою характеристику. Победа над боссом даёт крупный прирост.</div>
    </div>
  </div>
  <div class="section-title"><h2>Достижения</h2><small>${got} из ${ACHIEVEMENTS.length}</small></div>
  <div class="grid g4 keep">${[...ACHIEVEMENTS].sort((a, b) => (S.achievements[b.id] ? 1 : 0) - (S.achievements[a.id] ? 1 : 0)).map(a => `<div class="achv ${S.achievements[a.id] ? 'on' : ''}"><div class="medal">${icon(a.icon, 24)}</div><b>${a.name}</b><small>${S.achievements[a.id] ? fmtDay(S.achievements[a.id]) : a.desc}</small></div>`).join('')}</div>
  <div class="section-title"><h2>Редкие значки</h2><small>${S.badges.length} из ${RARE_BADGES.length} · выпадают случайно</small></div>
  <div class="grid g4 keep">${RARE_BADGES.map(b => { const g = S.badges.find(x => x.id === b.id); return `<div class="achv ${g ? 'on' : ''}"><div class="medal">${g ? icon(b.icon, 24) : icon('gift', 22)}</div><b>${g ? b.name : '???'}</b><small>${g ? fmtDay(g.d) : 'ещё не выпал'}</small></div>`; }).join('')}</div>`;
}
INPUTS.pickTitle = el => { S.profile.title = el.value || null; saveState(); };

/* ---------- настройки ---------- */
function renderSettings() {
  const R = S.settings.reminders, perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `
  <div class="page-h"><div><h1>Настройки</h1><p>Всё хранится только на этом устройстве.</p></div></div>
  <div class="grid g2">
    <div class="stack">
      ${accountCard()}
      <div class="card"><div class="card-h"><h3>${icon('eye', 18)} Обучение</h3><button class="btn xs" data-act="tourReplay">Показать</button></div>
        <p class="muted" style="margin:0">Короткий тур по приложению на примере прокачанного героя. Твои данные не меняются.</p></div>
      <div class="card"><div class="card-h"><h3>${icon('user', 18)} Профиль</h3></div>
        <form data-form="saveName" class="row"><input class="input grow" name="name" value="${esc(S.profile.name)}" placeholder="Имя" maxlength="24"><button class="btn primary">Сохранить</button></form></div>
      <div class="card"><div class="card-h"><h3>${icon('bell', 18)} Напоминания</h3>${switchEl('remToggle', R.enabled)}</div>
        <p class="muted" style="margin-top:0">Вечером, если ты ещё ничего не сделал: «Твоему импульсу ${momentumStreak()} ${pDays(momentumStreak())}. Одно задание, и он продолжится».</p>
        <div class="form-grid ${R.enabled ? '' : 'hide'}">
          <label class="field"><span>Время</span><input class="input" type="time" value="${R.time}" data-change="remTime"></label>
          <div class="field"><span>Второе напоминание</span><div class="row">${switchEl('remSecond', R.second)}<input class="input" type="time" value="${R.secondTime}" data-change="remTime2" ${R.second ? '' : 'disabled style="opacity:.4"'}></div></div>
          <div class="field full"><span>Дни недели</span><div class="dots5">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" class="${R.days.includes(d) ? 'on' : ''}" data-act="remDay" data-v="${d}">${WD[(d + 6) % 7]}</button>`).join('')}</div></div>
          <div class="full row wrap"><button class="btn sm" data-act="remTest">${icon('bell', 14)} Проверить</button><span class="sub">Разрешение: ${{ granted: 'выдано', denied: 'запрещено в браузере', default: 'не запрошено', unsupported: 'не поддерживается' }[perm]}</span></div>
        </div>
        <div class="callout mt">${icon('info', 16)}<div>Напоминание приходит, пока приложение открыто или свёрнуто. На Android с установленной иконкой браузер иногда проверяет и в фоне. iPhone полностью закрытым веб-приложениям уведомления без сервера не доставляет — держи приложение свёрнутым, а не закрытым.</div></div>
      </div>
      <div class="card"><div class="card-h"><h3>${icon('flame', 18)} Игра</h3></div>
        <div class="list">
          <div class="li"><div class="grow"><b>Максимум щитов</b><small>Щит даётся за каждую неделю без пропусков</small></div>${segmented('setShields', [['2', '2'], ['3', '3']], String(S.settings.maxShields), 'soft')}</div>
          <div class="li"><div class="grow"><b>Дневная норма</b><small>Восстановление серии требует двойной нормы: ${restoreNeed()} задания</small></div>${segmented('setMin', [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], String(S.settings.minTasks), 'soft')}</div>
          <div class="li"><div class="grow"><b>Звуки</b><small>Мягкий отклик на действия и колокольчик медитации</small></div>${switchEl('setSound', S.settings.sound)}</div>
        </div></div>
    </div>
    <div class="stack">
      <div class="card"><div class="card-h"><h3>${icon('download', 18)} Данные</h3></div>
        <p class="muted" style="margin-top:0">Делай резервную копию время от времени: если очистить данные браузера, прогресс пропадёт.</p>
        <div class="row wrap"><button class="btn" data-act="exportData">${icon('download', 15)} Скачать копию</button>
          <label class="btn" style="cursor:pointer">${icon('upload', 15)} Восстановить<input type="file" accept="application/json,.json" data-change="importData" hidden></label></div>
        <div class="sub mt">Копия включает фото, если они есть.</div>
        ${safeCopies().length ? `<div class="hr"></div><div class="label mb">Страховочные копии</div>
          <div class="sub mb">Приложение само сохраняет их перед обновлениями и при ошибках чтения.</div>
          <div class="list">${safeCopies().map(c => `<div class="li"><div class="grow"><b>${new Date(c.at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</b><small>${esc(c.reason)} · ${esc(c.name || 'без имени')} · ${fmtNum(c.xp)} XP</small></div>
            <button class="btn xs" data-act="restoreSafe" data-k="${c.key}">${icon('undo', 13)} Вернуть</button></div>`).join('')}</div>` : ''}
      </div>
      <div class="card"><div class="card-h"><h3>${icon('home', 18)} Иконка на главном экране</h3>${standalone ? '<span class="delta up">Установлено</span>' : ''}</div>
        <div class="list">
          <div class="li"><div class="grow"><b>iPhone · Safari</b><small>Кнопка «Поделиться» → «На экран „Домой“»</small></div></div>
          <div class="li"><div class="grow"><b>Android · Chrome</b><small>Меню ⋮ → «Добавить на главный экран» или «Установить»</small></div></div>
          <div class="li"><div class="grow"><b>Компьютер · Chrome/Edge</b><small>Значок установки в адресной строке</small></div></div>
        </div>
        <div class="sub mt">Данные телефона и компьютера раздельные. Чтобы перенести прогресс, скачай копию на одном устройстве и восстанови на другом.</div></div>
      <div class="card"><div class="card-h"><h3>${icon('alert', 18)} Сброс</h3></div>
        <p class="muted" style="margin-top:0">Удалит весь прогресс на этом устройстве. Сначала скачай копию.</p>
        <button class="btn danger" data-act="resetAll">${icon('trash', 15)} Начать игру заново</button></div>
    </div>
  </div>`;
}
FORMS.saveName = d => { S.profile.name = d.name.trim() || 'Герой'; saveState(); toast({ icon: 'check', title: 'Сохранено' }); };
ACTIONS.remToggle = async () => {
  const R = S.settings.reminders;
  if (!R.enabled) {
    if (!('Notification' in window)) { toast({ icon: 'alert', title: 'Уведомления не поддерживаются', text: 'На iPhone установи приложение на главный экран — тогда они станут доступны.' }); return; }
    const p = await Notification.requestPermission();
    if (p !== 'granted') { toast({ icon: 'alert', title: 'Нет разрешения на уведомления', text: 'Разреши их в настройках браузера.' }); return; }
    R.enabled = true;
    try { const reg = await navigator.serviceWorker.ready; if ('periodicSync' in reg) await reg.periodicSync.register('lifegame-reminder', { minInterval: 3600e3 }); } catch (e) { }
  } else R.enabled = false;
  saveState();
};
INPUTS.remTime = el => { S.settings.reminders.time = el.value || '20:00'; saveState(); };
INPUTS.remTime2 = el => { S.settings.reminders.secondTime = el.value || '22:00'; saveState(); };
ACTIONS.remSecond = () => { S.settings.reminders.second = !S.settings.reminders.second; saveState(); };
ACTIONS.remDay = el => { const R = S.settings.reminders, v = +el.dataset.v; R.days = R.days.includes(v) ? R.days.filter(x => x !== v) : [...R.days, v]; saveState(); };
ACTIONS.remTest = () => { showNotification('Игра в жизнь', reminderText()); return false; };
ACTIONS.setShields = el => { S.settings.maxShields = +el.dataset.v; S.momentum.shields = Math.min(S.momentum.shields, S.settings.maxShields); saveState(); };
ACTIONS.setMin = el => { S.settings.minTasks = +el.dataset.v; saveState(); };
ACTIONS.setSound = () => { S.settings.sound = !S.settings.sound; saveState(); };
ACTIONS.exportData = async () => {
  let photos = []; try { photos = await PhotoDB.all(); } catch (e) { }
  const blob = new Blob([JSON.stringify({ app: 'lifegame', v: 1, exported: new Date().toISOString(), state: S, photos })], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `igra-v-zhizn-${today()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return false;
};
INPUTS.importData = el => {
  const f = el.files && el.files[0]; if (!f) return false;
  f.text().then(async txt => {
    const data = JSON.parse(txt);
    if (!data.state || !data.state.sections) throw new Error('bad');
    if (!await confirmDialog({ title: 'Восстановить из копии?', text: `Копия от ${new Date(data.exported).toLocaleString('ru-RU')}. Текущий прогресс на этом устройстве будет заменён.`, ok: 'Восстановить', danger: true })) return;
    safeCopy(JSON.stringify(S), 'перед восстановлением из файла');
    S = migrate(data.state); saveNow();
    if (data.photos && data.photos.length) { await PhotoDB.clear(); for (const p of data.photos) await PhotoDB.put(p); photosCache = null; }
    toast({ icon: 'check', title: 'Прогресс восстановлен' }); render();
  }).catch(() => toast({ icon: 'alert', title: 'Не получилось прочитать файл', text: 'Нужен файл копии из этого приложения.' }));
  return false;
};
ACTIONS.restoreSafe = async el => {
  const c = JSON.parse(localStorage.getItem(el.dataset.k));
  if (!await confirmDialog({ title: 'Вернуть эту копию?', text: 'Текущий прогресс тоже сохранится страховочной копией — его можно будет вернуть обратно.', ok: 'Вернуть' })) return false;
  safeCopy(JSON.stringify(S), 'перед восстановлением');
  try { S = migrate(JSON.parse(c.raw)); saveNow(); toast({ icon: 'check', title: 'Прогресс восстановлен' }); }
  catch (e) { toast({ icon: 'alert', title: 'Копия повреждена', text: 'Попробуй другую.' }); }
};
ACTIONS.resetAll = async () => {
  if (!await confirmDialog({ title: 'Удалить весь прогресс?', text: 'Уровень, опыт, серии, боссы и записи будут удалены с этого устройства. Отменить нельзя.', ok: 'Удалить всё', danger: true })) return false;
  safeCopy(JSON.stringify(S), 'перед сбросом');
  localStorage.removeItem(STORE_KEY); try { await PhotoDB.clear(); } catch (e) { }
  location.hash = ''; location.reload(); return false;
};
