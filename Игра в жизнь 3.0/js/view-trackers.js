/* Трекеры разделов: вес, тренировки, чтение, медитация, воздержание, дневник, благодарность */
'use strict';

const UI = { weightPeriod: '90', weightAgg: 'week', exercise: null, bookTab: 'now', jMonth: today().slice(0, 7), jSel: today() };
const TRACKERS = {};
const dayIdx = d => diffDays('2000-01-01', d);
const idxDay = i => addDays('2000-01-01', i);
function monthTicks(fromD, toD, max = 6) {
  const span = diffDays(fromD, toD), step = Math.max(1, Math.ceil(span / max));
  const out = []; for (let i = 0; i <= span; i += step) { const d = addDays(fromD, i); out.push({ x: dayIdx(d), text: fmtShort(d) }); }
  return out;
}
ACTIONS.dot = el => {
  const box = el.closest('[data-dots]'), form = el.closest('form');
  box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
  form.querySelector(`[name="${box.dataset.dots}"]`).value = el.dataset.v;
  return false;
};
ACTIONS.ui = el => { UI[el.dataset.k] = el.dataset.v; };

/* ======================= ВЕС ======================= */
TRACKERS.weight = sec => {
  const W = S.weight, ws = sortedWeights(), lw = lastWeight();
  if (!W.start || !W.goal) return `<div class="card glow mb">
    <div class="card-h"><h3>${icon('target', 18)} Старт и цель</h3></div>
    <p class="muted" style="margin-top:0">Задай стартовый и целевой вес — приложение покажет, сколько пути уже пройдено, и отметит каждый этап.</p>
    ${weightGoalForm()}</div>`;
  const cur = lw ?? W.start, lastD = ws.length ? ws[ws.length - 1].d : null;
  const total = W.start - W.goal, done = W.start - cur, pct = total ? clamp(done / total, 0, 1) : 0;
  const weekAgo = ws.filter(x => x.d <= addDays(today(), -7)).pop();
  const wkDelta = weekAgo ? cur - weekAgo.kg : null;
  const days = UI.weightPeriod === 'all' ? 99999 : +UI.weightPeriod;
  const from = addDays(today(), -days);
  const pts = ws.filter(x => x.d >= from);
  const step = W.step || 5, reached = Math.floor(Math.max(0, W.start - (lw ?? W.start)) / step);
  const msCount = Math.max(1, Math.ceil(Math.abs(total) / step));
  return `
  <div class="grid g-hero">
    <div class="card glow">
      <div class="card-h"><h3>${icon('scale', 18)} Прогресс к цели</h3><button class="btn xs" data-act="weightGoal">${icon('pen', 13)} Цель</button></div>
      <div class="row" style="gap:26px;align-items:center;flex-wrap:wrap">
        ${ring(pct, { size: 150, stroke: 9, key: 'w-ring', color: sec.color, glow: true, center: `<div><div class="num num-m">${Math.round(pct * 100)}<span class="u">%</span></div><div class="sub">пути</div></div>` })}
        <div class="grow">
          <div class="label">Текущий вес${lastD ? ' · ' + relDay(lastD) : ''}</div>
          <div class="num num-l" style="margin:8px 0 10px">${fmtNum(cur, 1)}<span class="u">кг</span></div>
          <div class="row wrap">${wkDelta != null ? deltaBadge(wkDelta, { digits: 1, suffix: ' кг', invert: W.goal < W.start }) + '<span class="sub">за неделю</span>' : '<span class="sub">Недельная динамика появится через 7 дней</span>'}</div>
        </div>
      </div>
      <div class="hr"></div>
      <div class="kv"><div><small>Старт</small><b>${fmtNum(W.start, 1)}</b></div><div><small>Пройдено</small><b>${fmtNum(Math.max(0, done), 1)}</b></div><div><small>Осталось</small><b>${fmtNum(Math.max(0, cur - W.goal), 1)}</b></div><div><small>Цель</small><b>${fmtNum(W.goal, 1)}</b></div></div>
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('plus', 18)} Записать вес</h3><span class="sub">${lw ? 'последний: ' + fmtNum(lw, 1) + ' кг' : ''}</span></div>
      <form data-form="logWeight" class="stack">
        <div class="form-grid"><label class="field"><span>Вес, кг</span><input class="input" type="number" step="0.1" min="20" max="400" name="kg" inputmode="decimal" placeholder="${lw ? fmtNum(lw, 1).replace(',', '.') : '80.0'}" required></label>
        <label class="field"><span>Дата</span><input class="input" type="date" name="d" value="${today()}" max="${today()}"></label></div>
        <button class="btn primary block">Записать · +5 XP</button>
      </form>
      <div class="callout mt">${icon('info', 16)}<div>Опыт даётся за действия, а не за цифру на весах. Вес скачет день ко дню из-за воды и соли — честнее всего видно по средним за неделю ниже.</div></div>
    </div>
  </div>
  <div class="card mt">
    <div class="card-h"><h3>${icon('chart', 18)} Динамика веса</h3>${segmented('ui', [['30', '1М'], ['90', '3М'], ['180', '6М'], ['all', 'Всё']], UI.weightPeriod, 'soft').replace(/data-act="ui"/g, 'data-act="ui" data-k="weightPeriod"')}</div>
    ${lineChart({
      id: 'weight', h: 230,
      series: [
        { pts: pts.map(p => ({ x: dayIdx(p.d), y: p.kg, d: p.d })), color: sec.color, fill: true, dots: true, width: 2 },
        ...(W.goal ? [{ pts: pts.length ? [{ x: dayIdx(pts[0].d), y: W.goal }, { x: dayIdx(pts[pts.length - 1].d), y: W.goal }] : [], color: 'rgba(255,255,255,.3)', dashed: true, width: 1, tip: false }] : []),
      ],
      yFmt: v => fmtNum(v, 0), xLabels: pts.length ? monthTicks(pts[0].d, pts[pts.length - 1].d) : [],
      tipFmt: p => `${fmtDay(p.d)}<b>${fmtNum(p.y, 1)} кг</b>`,
      empty: 'Запиши вес — здесь появится график',
    })}
    <div class="legend mt"><span><i style="--c:${sec.color}"></i>Вес</span><span><i class="dash" style="--c:rgba(255,255,255,.5)"></i>Цель</span></div>
  </div>
  ${weightWeeksCard(sec)}
  <div class="grid g2 mt">
    <div class="card">
      <div class="card-h"><h3>${icon('flag', 18)} Этапы</h3><span class="sub">каждые ${step} кг</span></div>
      <div class="milestones">${Array.from({ length: Math.min(msCount, 14) }, (_, i) => `<div class="ms ${i < reached ? 'on' : i === reached ? 'next' : ''}"><i>−${(i + 1) * step}</i>${i < reached ? 'взят' : i === reached ? 'дальше' : ''}</div>`).join('')}</div>
      <div class="sub mt">${reached ? `Взято этапов: ${reached}. За каждый — достижение и бонус.` : `До первого этапа: ${fmtNum(Math.max(0, (lw ?? W.start) - (W.start - step)), 1)} кг`}</div>
    </div>
    ${measuresCard(sec)}
  </div>
  ${photosCard()}`;
};
/* средний вес по неделям или месяцам: дневные скачки воды гасятся, видно настоящее направление */
function weightWeeksCard(sec) {
  const byWeek = UI.weightAgg !== 'month';
  const key = d => byWeek ? weekStart(d) : d.slice(0, 7) + '-01';
  const groups = {};
  for (const e of sortedWeights()) (groups[key(e.d)] = groups[key(e.d)] || []).push(e.kg);
  const rows = Object.keys(groups).sort().slice(-12).map(k => ({ k, avg: sum(groups[k], x => x) / groups[k].length, n: groups[k].length }));
  const label = k => byWeek ? `${fmtShort(k)} – ${fmtShort(addDays(k, 6))}` : MONTHS_NOM[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4);
  const cur = key(today()), invert = S.weight.goal < S.weight.start;
  const seg = segmented('ui', [['week', 'Недели'], ['month', 'Месяцы']], byWeek ? 'week' : 'month', 'soft').replace(/data-act="ui"/g, 'data-act="ui" data-k="weightAgg"');
  return `<div class="card mt">
    <div class="card-h"><h3>${icon('calendar', 18)} Средний вес</h3>${seg}</div>
    ${rows.length > 1 ? lineChart({
      id: 'wavg', h: 150,
      series: [{ pts: rows.map(r => ({ x: dayIdx(r.k), y: r.avg, d: r.k })), color: sec.color, fill: true, dots: true, width: 2 }],
      yFmt: v => fmtNum(v, 0), xLabels: rows.map(r => ({ x: dayIdx(r.k), text: byWeek ? fmtShort(r.k) : MONTHS_SHORT[+r.k.slice(5, 7) - 1] })).filter((_, i, a) => a.length <= 6 || i % Math.ceil(a.length / 6) === 0),
      tipFmt: p => `${label(p.d)}<b>${fmtNum(p.y, 1)} кг</b>`,
    }) : ''}
    ${rows.length ? `<table class="table mt"><tbody>${[...rows].reverse().map((r, i, a) => { const prev = a[i + 1];
      return `<tr><td>${label(r.k)}${r.k === cur ? ` <span class="delta acc" style="height:20px">${byWeek ? 'эта неделя' : 'этот месяц'}</span>` : ''}<div class="sub">${r.n} ${plural(r.n, ['взвешивание', 'взвешивания', 'взвешиваний'])}</div></td>
        <td style="text-align:right;white-space:nowrap"><b style="font-weight:500">${fmtNum(r.avg, 1)}</b> <span class="dim">кг</span></td>
        <td style="text-align:right;width:84px">${prev ? deltaBadge(r.avg - prev.avg, { digits: 1, suffix: '', invert }) : ''}</td></tr>`; }).join('')}</tbody></table>`
      : emptyState('scale', 'Записывай вес — здесь появятся средние по неделям')}
    <div class="sub mt">Взвешивайся 2–3 раза в неделю в одно время — средние станут точнее.</div>
  </div>`;
}
function weightGoalForm() {
  const W = S.weight;
  return `<form data-form="weightGoal" class="form-grid">
    <label class="field"><span>Стартовый вес, кг</span><input class="input" type="number" step="0.1" name="start" value="${W.start || lastWeight() || ''}" required></label>
    <label class="field"><span>Цель, кг</span><input class="input" type="number" step="0.1" name="goal" value="${W.goal || ''}" required></label>
    <label class="field"><span>Шаг этапов, кг</span><input class="input" type="number" step="0.5" min="0.5" name="step" value="${W.step || 5}"></label>
    <div class="field" style="align-self:end"><button class="btn primary block">Сохранить</button></div>
  </form>`;
}
ACTIONS.weightGoal = () => { openModal(modalHead('Старт и цель', 'Изменение не влияет на заработанный опыт') + weightGoalForm()); return false; };
FORMS.weightGoal = d => {
  Object.assign(S.weight, { start: +d.start, goal: +d.goal, step: +d.step || 5 });
  if (!S.weight.entries.length) S.weight.entries.push({ d: today(), kg: +d.start });
  saveState(); closeModal(true);
};
FORMS.logWeight = d => {
  const kg = +d.kg; if (!kg) return false;
  const date = d.d || today();
  const before = Math.floor(weightLost() / (S.weight.step || 5));
  S.weight.entries = S.weight.entries.filter(e => e.d !== date);
  S.weight.entries.push({ d: date, kg });
  tracker('weight', 5, 'Взвешивание', ['weigh']);
  const after = Math.floor(weightLost() / (S.weight.step || 5));
  if (after > before && after > (S.weight.milestones.length || 0)) {
    S.weight.milestones.push({ n: after, d: today() });
    emit({ k: 'bonus', s: 'weight', xp: 100, note: `Этап −${after * S.weight.step} кг`, noMult: true });
    celebrate(`<div class="cel-badge"><div class="num">−${after * S.weight.step}</div></div><div class="eyebrow">Этап пройден</div><h2>Минус ${after * S.weight.step} кг</h2><p>Каждый этап — это сотни правильных решений. +100 XP.</p>`, 'win');
  }
  afterChange();
};

function measuresCard(sec) {
  const M = [...S.weight.measures].sort((a, b) => a.d < b.d ? -1 : 1);
  const last = M[M.length - 1], prev = M[M.length - 2], first = M[0];
  const doneWeek = last && last.d >= weekStart();
  const row = (k, l) => `<div class="li"><div class="grow"><b>${l}</b><small>${first && last && first !== last ? `с начала: ${fmtSigned(last[k] - first[k], 1, ' см')}` : 'первая запись'}</small></div>
    <span class="num" style="font-size:20px">${last ? fmtNum(last[k], 1) : '—'}</span>${prev ? deltaBadge(last[k] - prev[k], { digits: 1, suffix: '', invert: true }) : ''}</div>`;
  return `<div class="card">
    <div class="card-h"><h3>${icon('ruler', 18)} Обхваты</h3><button class="btn xs ${doneWeek ? '' : 'primary'}" data-act="measure">${doneWeek ? 'Обновить' : 'Записать'}</button></div>
    ${last ? `<div class="list">${row('waist', 'Талия')}${row('chest', 'Грудь')}${row('hips', 'Бёдра')}</div><div class="sub mt">Последний замер: ${relDay(last.d)}</div>`
      : `<p class="muted" style="margin:0">Раз в неделю записывай обхваты: иногда вес стоит, а объёмы уходят.</p>`}
  </div>`;
}
ACTIONS.measure = () => {
  const l = S.weight.measures[S.weight.measures.length - 1] || {};
  openModal(`${modalHead('Обхваты', 'Измеряй утром, в одном и том же месте')}
    <form data-form="measure" class="form-grid">
      <label class="field"><span>Талия, см</span><input class="input" type="number" step="0.1" name="waist" value="${l.waist || ''}" required autofocus></label>
      <label class="field"><span>Грудь, см</span><input class="input" type="number" step="0.1" name="chest" value="${l.chest || ''}" required></label>
      <label class="field"><span>Бёдра, см</span><input class="input" type="number" step="0.1" name="hips" value="${l.hips || ''}" required></label>
      <div class="field" style="align-self:end"><button class="btn primary block">Сохранить · +10 XP</button></div>
    </form>`);
  return false;
};
FORMS.measure = d => {
  S.weight.measures = S.weight.measures.filter(m => m.d !== today());
  S.weight.measures.push({ d: today(), waist: +d.waist, chest: +d.chest, hips: +d.hips });
  closeModal(true);
  tracker('weight', 10, 'Обхваты', ['measure']);
  autoQuest('measure');
};

/* фото «до/после» — только на этом устройстве */
let photosCache = null;
function photosCard() {
  if (!isPremium()) return `<div class="card mt"><div class="card-h"><h3>${icon('camera', 18)} Фото «до» и «после»</h3><button class="btn xs" data-act="paywall">${icon('crown', 13)} Открыть</button></div><div class="sub">Сравнение фото — в подписке. Они видны только тебе.</div></div>`;
  if (!photosCache) { PhotoDB.all().then(p => { photosCache = p.sort((a, b) => a.d < b.d ? -1 : 1); if (route.name === 's') render(); }).catch(() => { photosCache = []; }); }
  const P = photosCache || [];
  const first = P[0], last = P[P.length - 1];
  return `<div class="card mt">
    <div class="card-h"><h3>${icon('camera', 18)} Фото «до» и «после»</h3>
      <label class="btn xs primary" style="cursor:pointer">${icon('plus', 13)} Фото<input type="file" accept="image/*" data-change="addPhoto" hidden></label></div>
    <div class="sub mb">Хранятся только на этом устройстве и никуда не отправляются.</div>
    ${P.length >= 2 ? `<div class="compare mb">
      <div class="photo"><img src="${first.src}" alt="До"><span>До · ${fmtShort(first.d)}</span></div>
      <div class="photo"><img src="${last.src}" alt="После"><span>Сейчас · ${fmtShort(last.d)}</span></div></div>` : ''}
    ${P.length ? `<div class="photo-grid">${P.map(p => `<div class="photo"><img src="${p.src}" alt="" loading="lazy"><span>${fmtShort(p.d)}</span><button class="icon-btn sm" data-act="delPhoto" data-id="${p.id}" aria-label="Удалить">${icon('x', 14)}</button></div>`).join('')}</div>`
      : emptyState('image', 'Сделай первое фото — через пару месяцев сравнение будет впечатляющим')}
  </div>`;
}
INPUTS.addPhoto = (el) => {
  const f = el.files && el.files[0]; if (!f) return false;
  resizeImage(f).then(src => PhotoDB.put({ id: uid(), d: today(), src })).then(() => { photosCache = null; toast({ icon: 'camera', title: 'Фото сохранено', text: 'Оно видно только тебе' }); render(); })
    .catch(() => toast({ icon: 'alert', title: 'Не удалось сохранить фото' }));
  return false;
};
ACTIONS.delPhoto = async el => {
  if (!await confirmDialog({ title: 'Удалить фото?', text: 'Его нельзя будет восстановить.', ok: 'Удалить', danger: true })) return false;
  await PhotoDB.del(el.dataset.id); photosCache = null;
};

/* ======================= ТРЕНИРОВКИ ======================= */
const WO_MINUTES = [20, 30, 45, 60, 90];
const woDraft = { type: 'strength', min: 45, effort: 2 };
TRACKERS.workout = sec => {
  const WO = S.workouts, ws = weekStart(), wk = woWeekCount(ws), goal = WO.weeklyGoal;
  const weekMin = sum(WO.list.filter(x => x.d >= ws), woMin);
  const streak = woWeekStreak(), rec = woRecords();
  const left = Math.max(0, goal - wk), daysLeft = 7 - diffDays(ws, today());
  const hint = left === 0 ? `<b>Цель недели взята.</b> Серия недель продолжается — каждая следующая тренировка идёт в плюс.`
    : `Осталось ${left} ${plural(left, ['тренировка', 'тренировки', 'тренировок'])} за ${daysLeft} ${pDays(daysLeft)}${streak ? ` — и серия вырастет до ${streak + 1} ${plural(streak + 1, ['недели', 'недель', 'недель'])}` : ''}.`;
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const w = addDays(ws, (i - 11) * 7), c = woWeekCount(w);
    return { v: c, label: String(parseDay(w).getDate()), cur: i === 11, color: c >= goal ? sec.color : '', title: `Неделя с ${fmtDay(w)}: ${c} трен.` };
  });
  const month = today().slice(0, 7), mList = WO.list.filter(x => x.d.startsWith(month));
  const mix = WO_TYPES.map(t => ({ t, n: mList.filter(x => woType(x).id === t.id).length, min: sum(mList.filter(x => woType(x).id === t.id), woMin) })).filter(x => x.n);
  return `
  <div class="grid g-hero">
    <div class="card glow" style="--cg:color-mix(in srgb, ${sec.color} 30%, transparent)">
      <div class="card-h"><h3>${icon('calendar', 18)} Цель недели</h3>
        <div class="stepper"><button class="icon-btn sm" data-act="woGoal" data-d="-1">${icon('minus', 14)}</button><span class="sub" style="min-width:64px;text-align:center">${goal} трен.</span><button class="icon-btn sm" data-act="woGoal" data-d="1">${icon('plus', 14)}</button></div></div>
      <div class="row" style="gap:26px;align-items:center;flex-wrap:wrap">
        ${ring(wk / goal, { size: 150, stroke: 9, key: 'wo-ring', color: sec.color, glow: true, segments: goal, center: `<div><div class="num num-m">${wk}<span class="fade">/${goal}</span></div><div class="sub">на неделе</div></div>` })}
        <div class="grow"><div class="kv"><div><small>Серия недель</small><b>${streak}</b></div><div><small>Минут за неделю</small><b>${fmtNum(weekMin)}</b></div><div><small>Всего</small><b>${WO.list.length}</b></div></div>
          <div class="callout ${left ? '' : 'acc'} mt">${icon(left ? 'flag' : 'flame', 16)}<div>${hint}</div></div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('plus', 18)} Записать тренировку</h3></div>
      ${woFormHtml()}
    </div>
  </div>
  <div class="grid g2 mt">
    <div class="card">
      <div class="card-h"><h3>${icon('chart', 18)} 12 недель</h3><span class="sub">цветом — недели в цель</span></div>
      ${bars(weeks, { h: 110 })}
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('trophy', 18)} Твои рекорды</h3></div>
      <div class="kv"><div><small>Самая долгая</small><b>${rec.longest && woMin(rec.longest) ? fmtNum(woMin(rec.longest)) : '—'}<span class="u">мин</span></b></div>
        <div><small>Лучшая неделя</small><b>${rec.bestWeek}<span class="u">трен.</span></b></div>
        <div><small>Лучший месяц</small><b>${fmtNum(rec.bestMonth)}<span class="u">мин</span></b></div>
        <div><small>Лучшая серия</small><b>${woBestStreak()}<span class="u">нед.</span></b></div></div>
      <div class="sub mt">Побьёшь рекорд длительности — получишь бонус к опыту.</div>
    </div>
  </div>
  <div class="grid g2 mt">
    <div class="card">
      <div class="card-h"><h3>${icon('grid', 18)} Этот месяц</h3><span class="sub">${mList.length} трен. · ${fmtNum(sum(mList, woMin))} мин</span></div>
      ${mix.length ? `<div class="stack">${mix.map(x => `<div><div class="row between" style="margin-bottom:6px"><span class="row" style="gap:8px">${icon(x.t.icon, 15)}${x.t.name}</span><span class="sub">${x.n} · ${fmtNum(x.min)} мин</span></div>${bar(x.n / mList.length, 'wo-mix-' + x.t.id, { color: sec.color })}</div>`).join('')}</div>`
        : emptyState('dumbbell', 'В этом месяце тренировок ещё не было')}
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('clock', 18)} Последние тренировки</h3></div>
      ${WO.list.length ? `<div class="list">${[...WO.list].sort((a, b) => b.d < a.d ? -1 : b.d > a.d ? 1 : b.t - a.t).slice(0, 6).map(w => { const t = woType(w); return `<div class="li"><div class="ico-box sm">${icon(t.icon, 16)}</div>
        <div class="grow"><b>${t.name}${woMin(w) ? ` · ${woMin(w)} мин` : ''}</b><small>${relDay(w.d)}${w.effort ? ' · ' + WO_EFFORT[w.effort - 1].toLowerCase() : ''}</small></div>
        <button class="icon-btn sm plain" data-act="delWorkout" data-id="${w.id}" aria-label="Удалить">${icon('trash', 15)}</button></div>`; }).join('')}</div>` : emptyState('dumbbell', 'Пока пусто')}
    </div>
  </div>`;
};
function woFormHtml() {
  const D = woDraft;
  return `<form data-form="saveWorkout" class="stack">
    <div class="field"><span>Вид</span><input type="hidden" name="type" value="${D.type}"><div class="wo-types" data-dots="type">${WO_TYPES.map(t => `<button type="button" class="${D.type === t.id ? 'on' : ''}" data-act="dot" data-v="${t.id}">${icon(t.icon, 18)}<span>${t.name}</span></button>`).join('')}</div></div>
    <div class="field"><span>Длительность, минут</span><div class="dots5" data-dots="min">${WO_MINUTES.map(m => `<button type="button" class="${D.min === m ? 'on' : ''}" data-act="dot" data-v="${m}">${m}</button>`).join('')}<input class="input wo-min" type="number" name="min" min="1" max="600" inputmode="numeric" value="${D.min}" data-input="woMin" placeholder="своё" aria-label="Своя длительность, минут"></div></div>
    <div class="field"><span>Как прошла</span><input type="hidden" name="effort" value="${D.effort}"><div class="dots5" data-dots="effort">${WO_EFFORT.map((e, i) => `<button type="button" class="${D.effort === i + 1 ? 'on' : ''}" data-act="dot" data-v="${i + 1}">${e}</button>`).join('')}</div></div>
    <label class="field"><span>Дата</span><input class="input" type="date" name="d" value="${today()}" max="${today()}"></label>
    <button class="btn primary block">${icon('check', 16)}<span data-wo-xp>Записать · +${woXp(D.min, D.effort)} XP</span></button>
  </form>`;
}
/* выбор в форме запоминается и пересчитывает опыт на кнопке */
function woSyncForm(form) {
  const f = new FormData(form);
  woDraft.type = f.get('type'); woDraft.min = +f.get('min') || 0; woDraft.effort = +f.get('effort') || 2;
  form.querySelectorAll('[data-dots="min"] button').forEach(b => b.classList.toggle('on', +b.dataset.v === woDraft.min));
  const x = form.querySelector('[data-wo-xp]'); if (x) x.textContent = `Записать · +${woXp(woDraft.min, woDraft.effort)} XP`;
}
INPUTS.woMin = el => { woSyncForm(el.form); };
const dotBase = ACTIONS.dot;
ACTIONS.dot = el => { const r = dotBase(el), form = el.closest('form'); if (form && form.dataset.form === 'saveWorkout') woSyncForm(form); return r; };
ACTIONS.woGoal = el => { S.workouts.weeklyGoal = clamp(S.workouts.weeklyGoal + +el.dataset.d, 1, 14); const qq = S.quests.find(x => x.auto === 'workout'); if (qq) qq.target = S.workouts.weeklyGoal; saveState(); };
ACTIONS.newWorkout = () => { openModal(modalHead('Тренировка', 'Вид, длительность и как прошла — этого достаточно') + woFormHtml()); return false; };
FORMS.saveWorkout = (d, form) => {
  const min = clamp(Math.round(+d.min || 0), 0, 600);
  if (!min) { toast({ icon: 'alert', title: 'Укажи длительность' }); return false; }
  const type = WO_TYPES.some(t => t.id === d.type) ? d.type : 'strength', effort = clamp(+d.effort || 2, 1, 3), date = d.d || today();
  const prevLongest = woMin(woRecords().longest || {});
  const goal = S.workouts.weeklyGoal, ws = weekStart(date), before = woWeekCount(ws);
  S.workouts.list.push({ id: uid(), d: date, t: Date.now(), type, min, effort });
  Object.assign(woDraft, { type, min, effort });
  if (form.closest('.modal')) closeModal(true);
  tracker('workout', woXp(min, effort), `${WO_TYPES.find(t => t.id === type).name} · ${min} мин`, ['workout']);
  if (prevLongest && min > prevLongest) {
    emit({ k: 'tracker', s: 'workout', xp: 20, note: `Рекорд: ${min} мин`, tags: ['pr'], extra: { pr: true } });
    pushFx({ type: 'toast', icon: 'trophy', title: 'Новый рекорд длительности', text: `${min} мин — было ${prevLongest}. +20 XP` });
  }
  if (before < goal && before + 1 >= goal && ws === weekStart()) {
    const st = woWeekStreak();
    pushFx({ type: 'toast', icon: 'flame', title: 'Цель недели взята', text: st > 1 ? `Серия: ${st} ${plural(st, ['неделя', 'недели', 'недель'])} подряд` : 'Начало серии недель' });
  }
  autoQuest('workout');
  afterChange();
};
ACTIONS.delWorkout = async el => {
  if (!await confirmDialog({ title: 'Удалить тренировку?', text: 'Опыт за неё останется.', ok: 'Удалить', danger: true })) return false;
  S.workouts.list = S.workouts.list.filter(w => w.id !== el.dataset.id); saveState();
};

/* ======================= ЧТЕНИЕ ======================= */
TRACKERS.reading = sec => {
  const R = S.reading, y = String(new Date().getFullYear());
  const doneYear = R.books.filter(b => b.status === 'done' && (b.finished || '').startsWith(y)).length;
  const cur = R.books.filter(b => b.status === 'now');
  const tabs = { now: 'Читаю', want: 'Хочу прочитать', done: 'Прочитано' };
  const list = R.books.filter(b => b.status === UI.bookTab);
  const last14 = Array.from({ length: 14 }, (_, i) => { const d = addDays(today(), i - 13); return { v: sum(R.log.filter(x => x.d === d), x => x.pages), label: String(parseDay(d).getDate()), cur: i === 13, title: fmtDay(d) }; });
  const p30 = sum(R.log.filter(x => x.d >= addDays(today(), -29)), x => x.pages);
  const dayOfYear = diffDays(y + '-01-01', today()) + 1, expected = R.yearGoal * dayOfYear / 365;
  return `
  <div class="grid g-hero">
    <div class="card glow" style="--cg:color-mix(in srgb, ${sec.color} 28%, transparent)">
      <div class="card-h"><h3>${icon('book', 18)} Сейчас читаю</h3><button class="btn xs" data-act="newBook">${icon('plus', 13)} Книга</button></div>
      ${cur.length ? cur.map(b => { const p = (b.read || 0) / (b.pages || 1); return `<div class="book mb"><div class="book-cover" style="--bk:${COLORS[hashStr(b.title) % COLORS.length]}">${esc(b.title[0] || '?')}</div>
        <div class="grow"><b style="font-weight:500;font-size:15px;display:block">${esc(b.title)}</b><small class="dim">${esc(b.author || '')}</small>
          <div class="mt" style="margin-top:10px">${bar(p, 'book-' + b.id, { color: sec.color })}</div>
          <div class="row between" style="margin-top:6px"><span class="sub">${b.read || 0} из ${b.pages || '?'} стр.</span><span class="sub">${Math.round(p * 100)}%</span></div></div></div>`; }).join('')
        : emptyState('book', 'Добавь книгу, которую читаешь сейчас', '<button class="btn sm primary" data-act="newBook">Добавить книгу</button>')}
      <div class="hr"></div>
      <form data-form="logReading" class="form-grid">
        <label class="field"><span>Страниц сегодня</span><input class="input" type="number" min="0" name="pages" inputmode="numeric" placeholder="20"></label>
        <label class="field"><span>Минут</span><input class="input" type="number" min="0" name="min" inputmode="numeric" placeholder="25"></label>
        ${cur.length > 1 ? `<label class="field full"><span>Книга</span><select class="input" name="book">${cur.map(b => `<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select></label>` : `<input type="hidden" name="book" value="${cur[0] ? cur[0].id : ''}">`}
        <button class="btn primary full">Записать чтение</button>
      </form>
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('target', 18)} Цель на ${y} год</h3>
        <div class="stepper"><button class="icon-btn sm" data-act="yearGoal" data-d="-1">${icon('minus', 14)}</button><span class="sub" style="min-width:58px;text-align:center">${R.yearGoal} книг</span><button class="icon-btn sm" data-act="yearGoal" data-d="1">${icon('plus', 14)}</button></div></div>
      <div class="row" style="gap:22px">${ring(doneYear / R.yearGoal, { size: 128, stroke: 8, key: 'year-ring', color: sec.color, center: `<div><div class="num num-m">${doneYear}</div><div class="sub">из ${R.yearGoal}</div></div>` })}
        <div class="grow"><div class="label">Темп</div><div style="margin-top:8px">${doneYear >= expected ? '<span class="delta up">Опережаешь план</span>' : `<span class="delta warn">Отставание ${fmtNum(expected - doneYear, 1)} кн.</span>`}</div>
        <div class="sub mt">${fmtNum(p30)} страниц за 30 дней<br>≈${fmtNum(p30 / 30, 0)} в день</div></div></div>
      <div class="mt2">${bars(last14, { h: 64 })}</div>
    </div>
  </div>
  <div class="card mt">
    <div class="card-h">${segmented('ui', Object.entries(tabs), UI.bookTab, 'soft').replace(/data-act="ui"/g, 'data-act="ui" data-k="bookTab"')}<span class="sub">${list.length}</span></div>
    ${list.length ? `<div class="list">${list.map(b => `<div class="li"><div class="book-cover" style="--bk:${COLORS[hashStr(b.title) % COLORS.length]};width:36px;height:50px;font-size:14px">${esc(b.title[0] || '?')}</div>
      <div class="grow"><b>${esc(b.title)}</b><small>${esc(b.author || '')}${b.pages ? ' · ' + b.pages + ' стр.' : ''}${b.finished ? ' · ' + fmtDay(b.finished) : ''}</small></div>
      ${b.status === 'want' ? `<button class="btn xs" data-act="bookStatus" data-id="${b.id}" data-v="now">Начать</button>` : ''}
      ${b.status === 'now' ? `<button class="btn xs" data-act="bookStatus" data-id="${b.id}" data-v="done">Прочитал</button>` : ''}
      <button class="icon-btn sm plain" data-act="editBook" data-id="${b.id}">${icon('dots', 16)}</button></div>`).join('')}</div>`
      : `<div class="empty">Здесь пока пусто</div>`}
  </div>`;
};
ACTIONS.yearGoal = el => { S.reading.yearGoal = clamp(S.reading.yearGoal + +el.dataset.d, 1, 365); saveState(); };
function bookForm(b) {
  const isNew = !b; b ||= { title: '', author: '', pages: '', read: 0, status: 'now' };
  return `${modalHead(isNew ? 'Новая книга' : 'Книга')}
  <form data-form="saveBook" class="form-grid">
    <input type="hidden" name="id" value="${b.id || ''}">
    <label class="field full"><span>Название</span><input class="input" name="title" value="${esc(b.title)}" required autofocus></label>
    <label class="field full"><span>Автор</span><input class="input" name="author" value="${esc(b.author)}"></label>
    <label class="field"><span>Страниц</span><input class="input" type="number" name="pages" value="${b.pages}" min="1"></label>
    <label class="field"><span>Прочитано страниц</span><input class="input" type="number" name="read" value="${b.read || 0}" min="0"></label>
    <label class="field full"><span>Статус</span><select class="input" name="status">${[['now', 'Читаю сейчас'], ['want', 'Хочу прочитать'], ['done', 'Прочитано']].map(([v, l]) => `<option value="${v}" ${v === b.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="modal-f full">${isNew ? '' : `<button type="button" class="btn danger" data-act="delBook" data-id="${b.id}" style="margin-right:auto">${icon('trash', 15)} Удалить</button>`}
      <button class="btn primary">${isNew ? 'Добавить' : 'Сохранить'}</button></div>
  </form>`;
}
ACTIONS.newBook = () => { openModal(bookForm()); return false; };
ACTIONS.editBook = el => { openModal(bookForm(S.reading.books.find(b => b.id === el.dataset.id))); return false; };
FORMS.saveBook = d => {
  const data = { title: d.title.trim(), author: d.author.trim(), pages: +d.pages || 0, read: +d.read || 0, status: d.status };
  let b;
  if (d.id) { b = S.reading.books.find(x => x.id === d.id); const was = b.status; Object.assign(b, data); if (was !== 'done' && b.status === 'done') finishBook(b); }
  else { b = { id: uid(), added: today(), ...data }; S.reading.books.push(b); if (b.status === 'done') finishBook(b); }
  closeModal(true); afterChange();
};
ACTIONS.bookStatus = el => {
  const b = S.reading.books.find(x => x.id === el.dataset.id);
  b.status = el.dataset.v;
  if (b.status === 'done') finishBook(b);
  afterChange();
};
function finishBook(b) {
  b.finished = today(); if (b.pages) b.read = b.pages;
  tracker('reading', 80, 'Книга прочитана: ' + b.title, ['book']);
  celebrate(`<div class="cel-badge">${icon('book', 64)}</div><div class="eyebrow">Книга прочитана</div><h2>${esc(b.title)}</h2><p>+80 XP к Интеллекту. ${S.reading.books.filter(x => x.status === 'done').length}-я книга в твоей библиотеке.</p>`, 'win');
}
ACTIONS.delBook = async el => {
  closeModal(true);
  if (!await confirmDialog({ title: 'Удалить книгу?', ok: 'Удалить', danger: true })) return false;
  S.reading.books = S.reading.books.filter(b => b.id !== el.dataset.id); saveState();
};
FORMS.logReading = d => {
  const pages = +d.pages || 0, min = +d.min || 0;
  if (!pages && !min) { toast({ icon: 'alert', title: 'Укажи страницы или минуты' }); return false; }
  S.reading.log.push({ d: today(), pages, min, book: d.book || null });
  const b = S.reading.books.find(x => x.id === d.book);
  if (b && pages) { b.read = Math.min(b.pages || Infinity, (b.read || 0) + pages); }
  tracker('reading', clamp(Math.round(pages / 2 + min / 4), 5, 40), 'Чтение', ['reading']);
  autoQuest('reading');
  if (b && b.pages && b.read >= b.pages && b.status !== 'done') { b.status = 'done'; finishBook(b); }
  afterChange();
};

/* ======================= МЕДИТАЦИЯ ======================= */
const MED = { total: 0, left: 0, running: false, endAt: 0, timer: null };
TRACKERS.meditation = sec => {
  const M = S.meditation, ss = M.sessions;
  const dur = M.lastDuration || 10;
  if (!MED.running && !MED.left) { MED.total = dur * 60; }
  const left = MED.running ? Math.max(0, (MED.endAt - Date.now()) / 1000) : (MED.left || MED.total);
  const mm = Math.floor(left / 60), ss2 = Math.floor(left % 60);
  const days = [...new Set(ss.map(s => s.d))];
  let streak = 0, d = days.includes(today()) ? today() : addDays(today(), -1); while (days.includes(d)) { streak++; d = addDays(d, -1); }
  const last14 = Array.from({ length: 14 }, (_, i) => { const dd = addDays(today(), i - 13); return { v: sum(ss.filter(x => x.d === dd), x => x.min), label: String(parseDay(dd).getDate()), cur: i === 13, title: fmtDay(dd) }; });
  const active = MED.running || MED.left;
  return `
  <div class="grid g-hero">
    <div class="card glow-b" style="--cg:color-mix(in srgb, ${sec.color} 35%, transparent);text-align:center">
      <div class="card-h"><h3>${icon('timer', 18)} Таймер</h3></div>
      ${active ? '' : segmented('medDur', [3, 5, 10, 15, 20, 30].map(v => [String(v), v + ' мин']), String(dur), 'soft wrap')}
      <div class="timer-face">${ring(1 - left / MED.total, { size: 240, stroke: 4, key: 'med-ring', color: sec.color, glow: true, center: `<div><div class="num" id="medTime" style="font-size:58px">${String(mm).padStart(2, '0')}:${String(ss2).padStart(2, '0')}</div><div class="sub" style="margin-top:8px">${MED.running ? 'дыши спокойно' : active ? 'пауза' : 'готов начать'}</div></div>` })}</div>
      <div class="row" style="justify-content:center">
        ${MED.running ? `<button class="btn" data-act="medPause">${icon('pause', 16)} Пауза</button>` : `<button class="btn primary" data-act="medStart">${icon('play', 16)} ${active ? 'Продолжить' : 'Начать'}</button>`}
        ${active ? `<button class="btn ghost" data-act="medStop">${icon('stop', 16)} Завершить</button>` : ''}
      </div>
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('chart', 18)} Практика</h3><button class="btn xs" data-act="medManual">${icon('plus', 13)} Вручную</button></div>
      <div class="kv"><div><small>Всего минут</small><b>${fmtNum(totalMedMin())}</b></div><div><small>Сессий</small><b>${ss.length}</b></div><div><small>Дней подряд</small><b>${streak}</b></div><div><small>В среднем</small><b>${ss.length ? fmtNum(totalMedMin() / ss.length, 0) : 0}<span class="dim" style="font-size:13px"> мин</span></b></div></div>
      <div class="mt2">${bars(last14, { h: 80 })}</div>
      <div class="hr"></div>
      ${ss.length ? `<div class="list">${[...ss].reverse().slice(0, 4).map(s => `<div class="li">${icon('lotus', 18)}<div class="grow"><b>${s.min} мин</b><small>${relDay(s.d)}</small></div></div>`).join('')}</div>` : '<div class="sub">Каждая сессия записывается автоматически.</div>'}
    </div>
  </div>`;
};
ACTIONS.medDur = el => { S.meditation.lastDuration = +el.dataset.v; MED.total = +el.dataset.v * 60; MED.left = 0; saveState(); };
ACTIONS.medStart = () => {
  const left = MED.left || MED.total;
  MED.endAt = Date.now() + left * 1000; MED.running = true; MED.left = 0;
  chime('bell');
  clearInterval(MED.timer);
  MED.timer = setInterval(medTick, 250);
};
ACTIONS.medPause = () => { MED.left = Math.max(0, (MED.endAt - Date.now()) / 1000); MED.running = false; clearInterval(MED.timer); };
ACTIONS.medStop = async () => {
  const left = MED.running ? (MED.endAt - Date.now()) / 1000 : MED.left;
  const doneMin = Math.floor((MED.total - left) / 60);
  clearInterval(MED.timer); MED.running = false; MED.left = 0;
  if (doneMin >= 1) { if (await confirmDialog({ title: `Записать ${doneMin} мин?`, text: 'Сессия завершена раньше — каждая минута считается.', ok: 'Записать' })) logMeditation(doneMin); }
  render();
};
function medTick() {
  const left = Math.max(0, (MED.endAt - Date.now()) / 1000);
  const el = $('#medTime');
  if (el) {
    el.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(Math.floor(left % 60)).padStart(2, '0');
    const c = el.closest('.ring').querySelector('.ring-fg'); const C = +c.getAttribute('stroke-dasharray');
    c.style.strokeDashoffset = C * (left / MED.total); ANIM['med-ring'] = 1 - left / MED.total;
  }
  if (left <= 0) {
    clearInterval(MED.timer); MED.running = false; MED.left = 0;
    chime('bell'); vibrate([200, 100, 200]);
    logMeditation(Math.round(MED.total / 60));
    if (document.hidden) showNotification('Медитация завершена', `${Math.round(MED.total / 60)} минут тишины записаны.`);
    render(); flushFx();
  }
}

function logMeditation(min) {
  S.meditation.sessions.push({ d: today(), min, t: Date.now() });
  tracker('meditation', Math.min(40, 8 + Math.round(min * 1.5)), `Медитация ${min} мин`, ['meditation']);
  autoQuest('meditation');
  toast({ icon: 'lotus', title: 'Сессия записана', text: `${min} мин · всего ${fmtNum(totalMedMin())} мин` });
}
ACTIONS.medManual = () => {
  openModal(`${modalHead('Сессия медитации', 'Если медитировал без таймера')}
    <form data-form="medManual" class="form-grid"><label class="field"><span>Минут</span><input class="input" type="number" name="min" min="1" max="240" value="10" autofocus></label>
    <div class="field" style="align-self:end"><button class="btn primary block">Записать</button></div></form>`);
  return false;
};
FORMS.medManual = d => { closeModal(true); logMeditation(clamp(+d.min || 1, 1, 240)); afterChange(); };

/* ======================= ВОЗДЕРЖАНИЕ ======================= */
const ABST_MS = [1, 3, 7, 14, 30, 60, 90];
const ABST_ICONS = ['sparkle', 'leaf', 'flame', 'shield', 'star', 'mountain', 'crown'];
TRACKERS.abstinence = sec => {
  const C = S.abstinence.counters;
  return `
  <div class="row between mb"><span class="muted">Сам выбираешь, от чего воздерживаться. Срыв — не провал: лучший результат сохраняется.</span>
    <button class="btn sm primary" data-act="newCounter">${icon('plus', 15)} Счётчик</button></div>
  ${C.length ? `<div class="grid g2">${C.map(c => {
    const n = abstDays(c), best = Math.max(c.best || 0, n);
    const next = ABST_MS.find(m => m > n), prev = [...ABST_MS].reverse().find(m => m <= n) || 0;
    return `<div class="card glow" style="--cg:color-mix(in srgb, ${sec.color} ${10 + Math.min(n, 90) / 3}%, transparent)">
      <div class="card-h"><h3>${icon('ban', 18)} ${esc(c.name)}</h3><button class="icon-btn sm plain" data-act="editCounter" data-id="${c.id}">${icon('dots', 16)}</button></div>
      <div class="abst-big"><span class="num num-xl">${n}</span><span class="muted">${pDays(n)}</span></div>
      <div class="row wrap" style="margin-top:12px"><span class="chip">с ${fmtDay(c.start)}</span><span class="chip">${icon('trophy', 13)} лучший: <b>${best}</b></span></div>
      ${next ? `<div class="mt2"><div class="row between" style="margin-bottom:8px"><span class="label">До этапа «${next} ${pDays(next)}»</span><span class="sub">${next - n} ${pDays(next - n)}</span></div>${bar((n - prev) / (next - prev), 'ab-' + c.id, { color: sec.color })}</div>` : '<div class="callout acc mt2">' + icon('crown', 16) + '<div>Все этапы пройдены. Ты — пример несгибаемой воли.</div></div>'}
      <div class="milestones mt2">${ABST_MS.map((m, i) => `<div class="ms ${n >= m ? 'on' : m === next ? 'next' : ''}" title="${m} ${pDays(m)}"><i>${n >= m ? icon(ABST_ICONS[i], 16) : m}</i>${m} дн</div>`).join('')}</div>
      <div class="hr"></div>
      <div class="row between"><span class="sub">${c.resets && c.resets.length ? `Попыток: ${c.resets.length + 1}` : 'Первая попытка'}</span><button class="btn xs ghost" data-act="resetCounter" data-id="${c.id}">${icon('refresh', 13)} Начать заново</button></div>
    </div>`;
  }).join('')}</div>` : `<div class="card">${emptyState('ban', 'Добавь первый счётчик — например, «Сладкое», «Соцсети» или «Сигареты»', '<button class="btn sm primary" data-act="newCounter">Добавить счётчик</button>')}</div>`}`;
};
function checkAbstMilestones() {
  for (const c of S.abstinence.counters) {
    const n = abstDays(c); c.awarded ||= [];
    ABST_MS.forEach((m, i) => {
      if (n >= m && !c.awarded.includes(m)) {
        c.awarded.push(m);
        emit({ k: 'bonus', s: 'abstinence', stat: 'will', xp: 15 + i * 20, note: `${c.name}: ${m} ${pDays(m)}`, noMult: true });
        pushFx({ type: 'toast', icon: ABST_ICONS[i], title: `Этап: ${m} ${pDays(m)}`, text: `${c.name} · +${15 + i * 20} XP` });
      }
    });
    c.best = Math.max(c.best || 0, n);
  }
}
function counterForm(c) {
  const isNew = !c; c ||= { name: '', start: today() };
  return `${modalHead(isNew ? 'Новый счётчик' : 'Счётчик')}
  <form data-form="saveCounter" class="form-grid"><input type="hidden" name="id" value="${c.id || ''}">
    <label class="field full"><span>От чего воздерживаюсь</span><input class="input" name="name" value="${esc(c.name)}" placeholder="Например: сладкое" required autofocus></label>
    <label class="field full"><span>Дата старта</span><input class="input" type="date" name="start" value="${c.start}" max="${today()}"></label>
    <div class="modal-f full">${isNew ? '' : `<button type="button" class="btn danger" data-act="delCounter" data-id="${c.id}" style="margin-right:auto">${icon('trash', 15)} Удалить</button>`}<button class="btn primary">Сохранить</button></div></form>`;
}
ACTIONS.newCounter = () => { openModal(counterForm()); return false; };
ACTIONS.editCounter = el => { openModal(counterForm(S.abstinence.counters.find(c => c.id === el.dataset.id))); return false; };
FORMS.saveCounter = d => {
  if (d.id) { const c = S.abstinence.counters.find(x => x.id === d.id); c.name = d.name.trim(); c.start = d.start; c.awarded = (c.awarded || []).filter(m => m <= abstDays(c)); }
  else { const c = { id: uid(), name: d.name.trim(), start: d.start || today(), best: 0, resets: [], awarded: [] }; c.awarded = ABST_MS.filter(m => m <= abstDays(c)); S.abstinence.counters.push(c); }
  closeModal(true); checkAbstMilestones(); afterChange();
};
ACTIONS.resetCounter = async el => {
  const c = S.abstinence.counters.find(x => x.id === el.dataset.id), n = abstDays(c);
  const ok = await confirmDialog({ title: 'Начать заново?', text: `Ничего страшного — так бывает. ${n} ${pDays(n)} никуда не денутся: лучший результат ${Math.max(c.best || 0, n)} ${pDays(Math.max(c.best || 0, n))} сохранится, а новый отсчёт начнётся сегодня.`, ok: 'Начать новый отсчёт' });
  if (!ok) return false;
  c.best = Math.max(c.best || 0, n); (c.resets ||= []).push({ d: today(), days: n }); c.start = today(); c.awarded = [];
  saveState();
  toast({ icon: 'leaf', title: 'Новый отсчёт начат', text: 'Каждая попытка делает тебя сильнее.' });
};
ACTIONS.delCounter = async el => {
  closeModal(true);
  if (!await confirmDialog({ title: 'Удалить счётчик?', text: 'История попыток будет удалена. Опыт останется.', ok: 'Удалить', danger: true })) return false;
  S.abstinence.counters = S.abstinence.counters.filter(c => c.id !== el.dataset.id); saveState();
};

/* ======================= ДНЕВНИК ======================= */
const MOODS = ['Тяжело', 'Так себе', 'Нормально', 'Хорошо', 'Отлично'];
TRACKERS.journal = sec => {
  const J = S.journal, sel = UI.jSel, e = J[sel] || { text: '', mood: '', energy: '' };
  const [yy, mm] = UI.jMonth.split('-').map(Number);
  const first = new Date(yy, mm - 1, 1), offset = (first.getDay() + 6) % 7, dim = new Date(yy, mm, 0).getDate();
  let cal = WD.map(w => `<div class="wd">${w}</div>`).join('');
  for (let i = 0; i < offset; i++) cal += '<button class="out"></button>';
  for (let dd = 1; dd <= dim; dd++) {
    const k = `${UI.jMonth}-${String(dd).padStart(2, '0')}`, has = J[k];
    cal += `<button class="${has ? 'has' : ''} ${k === sel ? 'sel' : ''} ${k === today() ? 'td' : ''} ${(S.days[k] || {}).perfect ? 'pf' : ''}" ${has ? `style="--mc:${['#ff7d8a', '#f0c890', '#d9d9de', '#9fc3ff', '#63d99a'][(has.mood || 3) - 1]}"` : ''} data-act="jDay" data-v="${k}" ${k > today() ? 'disabled style="opacity:.3"' : ''}>${dd}</button>`;
  }
  const from = addDays(today(), -29), pts = Object.entries(J).filter(([k]) => k >= from).sort();
  return `
  <div class="grid g-main">
    <div class="card">
      <div class="card-h"><h3>${icon('pen', 18)} ${sel === today() ? 'Запись о сегодняшнем дне' : fmtDay(sel, true)}</h3>${J[sel] ? '<span class="delta up">Сохранено</span>' : ''}</div>
      <form data-form="saveJournal" class="stack">
        <input type="hidden" name="d" value="${sel}">
        <textarea class="input" name="text" placeholder="Как прошёл день? Что получилось, что запомнилось?" maxlength="3000">${esc(e.text)}</textarea>
        <div class="field"><span>Настроение${e.mood ? ' · ' + MOODS[e.mood - 1] : ''}</span><input type="hidden" name="mood" value="${e.mood}"><div class="dots5" data-dots="mood">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="${+e.mood === v ? 'on' : ''}" data-act="dot" data-v="${v}">${v}</button>`).join('')}</div></div>
        <div class="field"><span>Энергия</span><input type="hidden" name="energy" value="${e.energy}"><div class="dots5" data-dots="energy">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="${+e.energy === v ? 'on' : ''}" data-act="dot" data-v="${v}">${v}</button>`).join('')}</div></div>
        <button class="btn primary">${J[sel] ? 'Обновить запись' : 'Сохранить запись'}</button>
      </form>
    </div>
    <div class="stack">
      <div class="card">
        <div class="card-h"><button class="icon-btn sm" data-act="jMonth" data-d="-1">${icon('chevL', 15)}</button><h3>${MONTHS_NOM[mm - 1]} ${yy}</h3><button class="icon-btn sm" data-act="jMonth" data-d="1">${icon('chevR', 15)}</button></div>
        <div class="cal">${cal}</div>
        <div class="sub mt">${Object.keys(J).length} записей · ${journalStreak(J)} ${pDays(journalStreak(J))} подряд</div>
      </div>
      <div class="card">
        <div class="card-h"><h3>${icon('chart', 18)} Настроение и энергия</h3><span class="sub">30 дней</span></div>
        ${lineChart({ id: 'mood', h: 140, series: [
          { pts: pts.filter(([, v]) => v.mood).map(([k, v]) => ({ x: dayIdx(k), y: +v.mood, d: k, en: v.energy })), color: sec.color, fill: true, width: 2 },
          { pts: pts.filter(([, v]) => v.energy).map(([k, v]) => ({ x: dayIdx(k), y: +v.energy, d: k })), color: 'rgba(255,255,255,.4)', dashed: true, tip: false }],
          yFmt: v => fmtNum(v), tipFmt: p => `${fmtDay(p.d)}<b>Настроение ${p.y}</b>${p.en ? 'энергия ' + p.en : ''}`, empty: 'Заполни пару дней, чтобы увидеть график' })}
        <div class="legend mt"><span><i style="--c:${sec.color}"></i>Настроение</span><span><i class="dash" style="--c:rgba(255,255,255,.5)"></i>Энергия</span></div>
      </div>
    </div>
  </div>`;
};
ACTIONS.jDay = el => { UI.jSel = el.dataset.v; };
ACTIONS.jMonth = el => { const [y, m] = UI.jMonth.split('-').map(Number); const d = new Date(y, m - 1 + +el.dataset.d, 1); UI.jMonth = ymd(d).slice(0, 7); };
FORMS.saveJournal = d => {
  const isNew = !S.journal[d.d];
  if (!d.text.trim() && !d.mood) { toast({ icon: 'alert', title: 'Напиши пару слов или отметь настроение' }); return false; }
  S.journal[d.d] = { text: d.text.trim(), mood: +d.mood || null, energy: +d.energy || null };
  if (isNew && d.d === today()) { tracker('journal', 5, 'Запись в дневнике', ['journal']); autoQuest('journal'); }
  else { saveState(); toast({ icon: 'check', title: 'Запись сохранена' }); }
};

/* ======================= БЛАГОДАРНОСТЬ ======================= */
TRACKERS.gratitude = sec => {
  const G = S.gratitude, t = G[today()] || [];
  const n = Math.max(3, t.length);
  const hist = Object.entries(G).filter(([k]) => k !== today()).sort((a, b) => a[0] < b[0] ? 1 : -1).slice(0, 10);
  return `
  <div class="grid g-main">
    <div class="card glow" style="--cg:color-mix(in srgb, ${sec.color} 25%, transparent)">
      <div class="card-h"><h3>${icon('heart', 18)} Три благодарности</h3>${t.length ? '<span class="delta up">Квест выполнен</span>' : '<span class="sub">квест дня</span>'}</div>
      <form data-form="saveGratitude" class="stack">
        ${Array.from({ length: n }, (_, i) => `<label class="field"><span>${i + 1}. Я благодарен за…</span><input class="input" name="g${i}" value="${esc(t[i] || '')}" maxlength="140" ${i < 3 ? 'required' : ''}></label>`).join('')}
        <div class="row"><button class="btn primary grow">${t.length ? 'Обновить' : 'Сохранить'}</button>${n < 5 ? `<button type="button" class="btn" data-act="gratMore">${icon('plus', 15)} Ещё</button>` : ''}</div>
      </form>
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('calendar', 18)} История</h3><span class="sub">${journalStreak(G)} ${pDays(journalStreak(G))} подряд</span></div>
      <div class="kv mb"><div><small>Дней</small><b>${Object.keys(G).length}</b></div><div><small>Благодарностей</small><b>${sum(Object.values(G), a => a.length)}</b></div></div>
      ${hist.length ? `<div class="list">${hist.map(([k, a]) => `<div class="li" style="align-items:flex-start"><div class="grow"><small>${relDay(k)}</small>${a.map(x => `<div style="margin-top:4px">· ${esc(x)}</div>`).join('')}</div></div>`).join('')}</div>` : '<div class="sub">Здесь будут твои прошлые записи.</div>'}
    </div>
  </div>`;
};
ACTIONS.gratMore = el => {
  const form = el.closest('form'), n = form.querySelectorAll('.field').length;
  if (n >= 5) return false;
  form.querySelector('.row').insertAdjacentHTML('beforebegin', `<label class="field"><span>${n + 1}. Я благодарен за…</span><input class="input" name="g${n}" maxlength="140"></label>`);
  return false;
};
FORMS.saveGratitude = d => {
  const items = Object.keys(d).filter(k => /^g\d$/.test(k)).sort().map(k => d[k].trim()).filter(Boolean);
  if (items.length < 3) { toast({ icon: 'alert', title: 'Нужно три пункта' }); return false; }
  const isNew = !S.gratitude[today()];
  S.gratitude[today()] = items;
  if (isNew) { tracker('gratitude', items.length >= 5 ? 10 : 5, 'Благодарность', ['gratitude']); autoQuest('gratitude'); }
  else saveState();
};

/* ======================= КОНТЕНТ И БРЕНД ======================= */
TRACKERS.content = sec => {
  const C = S.content, t = today(), target = contentTarget(), done = postsOn(t).length;
  const from30 = addDays(t, -29), streak = allAccountsStreak();
  const days14 = Array.from({ length: 14 }, (_, i) => { const d = addDays(t, i - 13); return { v: postsOn(d).length, label: String(parseDay(d).getDate()), cur: i === 13, title: fmtDay(d), color: postsOn(d).length >= target ? sec.color : '' }; });
  const total = followersTotal(), total30 = followersTotal(from30);
  const snaps = [...C.followers].sort((a, b) => a.d < b.d ? -1 : 1);
  const fPts = snaps.map(f => ({ x: dayIdx(f.d), d: f.d, y: sum(Object.values(f.p)), p: f.p }));
  return `
  <div class="grid g-hero">
    <div class="card glow" style="--cg:color-mix(in srgb, ${sec.color} 28%, transparent)">
      <div class="card-h"><h3>${icon('video', 18)} Публикации сегодня</h3><button class="btn xs" data-act="cBrand">${icon('settings', 13)} Площадки</button></div>
      <div class="row" style="gap:22px;align-items:center;flex-wrap:wrap">
        ${ring(target ? done / target : 0, { size: 132, stroke: 8, key: 'c-ring', color: sec.color, glow: true, center: `<div><div class="num num-m">${done}<span class="fade">/${target}</span></div><div class="sub">сегодня</div></div>` })}
        <div class="grow" style="min-width:200px">
          <div class="acc-grid">${C.accounts.map((a, i) => { const n = postsOn(t).filter(p => p.acc === a).length, ok = n >= C.perAccount;
            return `<div class="acc-cell"><button class="acc ${ok ? 'on' : ''}" data-act="cPost" data-i="${i}"><span class="acc-chk">${icon('check', 14)}</span><b>${esc(a)}</b><small>${n}/${C.perAccount}</small></button>${n ? `<button type="button" class="acc-minus" data-act="cUnpost" data-i="${i}" aria-label="Снять одну публикацию">${icon('minus', 13)}</button>` : ''}</div>`; }).join('')}</div>
          <div class="sub" style="margin-top:10px">Нажми на площадку, когда опубликовал. Лишнюю отметку снимает «−» в углу.</div>
        </div>
      </div>
      <div class="hr"></div>
      <span class="chip">${icon('flame', 13)} Все площадки подряд: <b>${streak} ${pDays(streak)}</b></span>
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('image', 18)} Запас контента</h3><span class="sub">${target ? `хватит на ${fmtNum(C.stock / target, 1)} дн.` : ''}</span></div>
      <div class="row between" style="align-items:center">
        <div><div class="num num-l">${C.stock}</div><div class="sub" style="margin-top:6px">${plural(C.stock, ['публикация готова', 'публикации готово', 'публикаций готово'])}</div></div>
        <div class="row"><button class="icon-btn" data-act="cStock" data-d="-1" aria-label="Убрать из запаса">${icon('minus', 16)}</button><button class="btn primary sm" data-act="cStock" data-d="1">${icon('plus', 15)} Готово · +15</button></div>
      </div>
      <div class="mt">${bar(target ? C.stock / (target * 3) : 0, 'c-stock', { color: sec.color })}</div>
      <div class="sub" style="margin-top:8px">${C.stock >= target * 3 ? 'Запас на три дня — можно спокойно экспериментировать.' : C.stock >= target ? 'Завтра закрыто. Цель — запас на три дня вперёд.' : 'Подготовь контент хотя бы на завтра: так регулярность не зависит от настроения.'}</div>
      <div class="sub mt">Публикация сама списывает одну единицу из запаса.</div>
    </div>
  </div>
  <div class="grid g2 mt">
    <div class="card">
      <div class="card-h"><h3>${icon('user', 18)} Аудитория</h3><button class="btn xs" data-act="cFollowers">${icon('refresh', 13)} Обновить</button></div>
      ${total != null ? `<div class="row between" style="align-items:flex-end"><div class="num num-m">${fmtNum(total)}</div>${total30 != null && snaps[0].d < from30 ? deltaBadge(total - total30, { suffix: '' }) : ''}</div>
        <div class="row wrap mt" style="gap:6px">${Object.entries(followersSnap().p).map(([p, n]) => `<span class="chip">${esc(p)} <b>${fmtNum(n)}</b></span>`).join('')}</div>
        ${fPts.length > 1 ? `<div class="mt">${lineChart({ id: 'fol', h: 110, series: [{ pts: fPts, color: sec.color, fill: true, width: 2 }], yFmt: v => fmtNum(v), tipFmt: p => `${fmtDay(p.d)}<b>${fmtNum(p.y)}</b>` })}</div>` : '<div class="sub mt">Обновляй цифры раз в неделю — появится график роста.</div>'}`
        : emptyState('user', 'Запиши, сколько подписчиков на каждой площадке', '<button class="btn sm primary" data-act="cFollowers">Записать</button>')}
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('chart', 18)} Регулярность</h3><span class="sub">14 дней</span></div>
      ${bars(days14, { h: 80 })}
      <div class="kv mt"><div><small>Всего публикаций</small><b>${C.posts.length}</b></div><div><small>За 30 дней</small><b>${C.posts.filter(p => p.d >= from30).length}</b></div><div><small>Лучшая серия</small><b>${bestAllAccounts()}</b></div></div>
    </div>
  </div>`;
};
function bestAllAccounts() {
  const days = [...new Set(S.content.posts.map(p => p.d))].sort(), tgt = contentTarget();
  let best = 0, run = 0, prev = null;
  for (const d of days) { if (postsOn(d).length < tgt) { run = 0; prev = d; continue; } run = prev && addDays(prev, 1) === d && run ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}
/* снять последнюю сегодняшнюю публикацию на площадке — вместе с XP, запасом и отметкой задания */
function unpost(acc) {
  const C = S.content, t = today();
  const mine = C.posts.filter(p => p.d === t && p.acc === acc);
  const p = mine[mine.length - 1]; if (!p) return;
  C.posts.splice(C.posts.indexOf(p), 1);
  if (p.fromStock) C.stock++;
  const ev = S.events.find(e => e.id === p.ev); if (ev) removeEvent(ev);
  const qq = S.quests.find(x => x.auto === 'carousel' && !x.archived);
  if (qq && questStatus(qq).count > postsOn(t).length) undoQuest(qq);
  afterChange();
}
ACTIONS.cUnpost = el => unpost(S.content.accounts[+el.dataset.i]);
ACTIONS.cPost = el => {
  const C = S.content, acc = C.accounts[+el.dataset.i], t = today();
  if (C.posts.filter(p => p.d === t && p.acc === acc).length >= C.perAccount) { unpost(acc); return; }
  const fromStock = C.stock > 0; if (fromStock) C.stock--;
  const ev = tracker('content', 15, 'Публикация · ' + acc, ['publish']);
  C.posts.push({ d: t, t: Date.now(), acc, fromStock, ev: ev.id });
  autoQuest('carousel');
  if (postsOn(t).length === contentTarget()) pushFx({ type: 'toast', icon: 'flame', title: 'Все площадки закрыты', text: `Сегодня ${contentTarget()} из ${contentTarget()}. Серия: ${allAccountsStreak()} ${pDays(allAccountsStreak())}` });
  afterChange();
};
ACTIONS.cStock = el => {
  const C = S.content;
  if (+el.dataset.d < 0) { if (C.stock > 0) C.stock--; saveState(); return; }
  C.stock++;
  tracker('content', 15, 'Контент в запас', ['content']);
  autoQuest('creative');
};
ACTIONS.cBrand = () => {
  const C = S.content;
  openModal(`${modalHead('Площадки', 'Где ты публикуешься. Цель на день = площадки × публикации на каждой')}
    <form data-form="cBrand" class="stack">
      <div class="field"><span>Площадки или аккаунты</span>${[0, 1, 2, 3, 4, 5].map(i => `<input class="input" name="a${i}" value="${esc(C.accounts[i] || '')}" placeholder="${i < 2 ? 'Например: TikTok' : 'Ещё площадка (необязательно)'}" maxlength="24" style="margin-top:${i ? 6 : 0}px">`).join('')}</div>
      <div class="field"><span>Публикаций в день на каждой площадке</span><div class="dots5" data-dots="per">${[1, 2, 3].map(v => `<button type="button" class="${C.perAccount === v ? 'on' : ''}" data-act="dot" data-v="${v}">${v}</button>`).join('')}</div><input type="hidden" name="per" value="${C.perAccount}"></div>
      <div class="modal-f"><button class="btn primary">Сохранить</button></div>
    </form>`);
  return false;
};
FORMS.cBrand = d => {
  const C = S.content;
  const accs = [0, 1, 2, 3, 4, 5].map(i => (d['a' + i] || '').trim()).filter(Boolean);
  if (!accs.length) { toast({ icon: 'alert', title: 'Нужна хотя бы одна площадка' }); return false; }
  const renamed = Object.fromEntries(C.accounts.map((a, i) => [a, accs[i]]).filter(([a, b]) => b && a !== b));
  C.posts.forEach(p => { if (renamed[p.acc]) p.acc = renamed[p.acc]; });
  C.accounts = accs; C.perAccount = clamp(+d.per || 1, 1, 3);
  const qq = S.quests.find(x => x.auto === 'carousel' && !x.archived); if (qq) qq.target = contentTarget();
  closeModal(true); saveState();
  toast({ icon: 'check', title: 'Сохранено', text: `Цель на день: ${contentTarget()} ${plural(contentTarget(), ['публикация', 'публикации', 'публикаций'])}` });
};
ACTIONS.cFollowers = () => {
  const last = (followersSnap() || { p: {} }).p;
  const plats = [...new Set([...S.content.accounts, ...Object.keys(last)])];
  openModal(`${modalHead('Подписчики', 'Обновляй раз в неделю — рост появится на графике')}
    <form data-form="cFollowers" class="form-grid">
      ${plats.map(p => `<label class="field"><span>${esc(p)}</span><input class="input" type="number" min="0" data-p="${esc(p)}" value="${last[p] ?? ''}" inputmode="numeric" placeholder="0"></label>`).join('')}
      <div class="modal-f full"><button class="btn primary">Сохранить · +5 XP</button></div>
    </form>`);
  return false;
};
FORMS.cFollowers = (d, form) => {
  const p = {};
  form.querySelectorAll('input[data-p]').forEach(inp => { if (inp.value !== '') p[inp.dataset.p] = +inp.value; });
  if (!Object.keys(p).length) { toast({ icon: 'alert', title: 'Укажи хотя бы одну цифру' }); return false; }
  const before = followersTotal();
  S.content.followers = S.content.followers.filter(f => f.d !== today());
  S.content.followers.push({ d: today(), p });
  closeModal(true);
  tracker('content', 5, 'Аудитория обновлена', ['followers']);
  const after = followersTotal();
  if (before != null && after > before) toast({ icon: 'arrowUp', title: `+${fmtNum(after - before)} подписчиков`, text: `Всего ${fmtNum(after)}` });
};

/* ======================= СВОЙ РАЗДЕЛ ======================= */
TRACKERS.custom = sec => {
  const from = addDays(today(), -29);
  const m = xpIndex().sec[sec.id];
  const pts = daysRange(from, today()).map(d => ({ x: dayIdx(d), d, y: xpOn(d, m) }));
  const total = sum(pts, p => p.y);
  return `<div class="card">
    <div class="card-h"><h3>${icon('chart', 18)} Опыт раздела за 30 дней</h3><span class="chip"><b>${fmtNum(total)}</b> XP</span></div>
    ${total ? lineChart({ id: 'cust', h: 160, series: [{ pts, color: sec.color, fill: true, width: 2 }], zeroBase: true, yFmt: v => fmtNum(v), xLabels: monthTicks(from, today()), tipFmt: p => `${fmtDay(p.d)}<b>+${p.y} XP</b>` })
      : '<div class="chart-empty">Выполняй задания раздела — здесь появится динамика</div>'}
  </div>`;
};
