/* Арена: боссы, создание, битва, Зал славы */
'use strict';

let BD = null;   // черновик нового босса

function renderArena() {
  const act = S.bosses.filter(b => b.status === 'active');
  const won = S.bosses.filter(b => b.status === 'won').sort((a, b) => a.wonAt < b.wonAt ? 1 : -1);
  const totalDmg = sum(act, b => b.maxHp - bossState(b).left);
  return `
  <div class="page-h">
    <div><div class="eyebrow"><span class="live"></span>${act.length} ${plural(act.length, ['активный босс', 'активных босса', 'активных боссов'])} · ${won.length} ${plural(won.length, ['победа', 'победы', 'побед'])}</div>
      <h1>Арена</h1><p>Большие цели становятся боссами. Каждое действие — удар.</p></div>
    <button class="btn primary" data-act="newBoss">${icon('plus', 16)} Новый босс</button>
  </div>
  ${act.length ? `<div class="grid g2">${act.map(bossCard).join('')}</div>`
    : `<div class="card glow-b" style="--cg:rgba(200,150,200,.25)">${emptyState('swords', 'Арена пуста. Преврати большую цель в босса:<br>«Вес 80 кг», «Жим 100 кг», «50 книг», «90 дней без сахара».', '<button class="btn primary" data-act="newBoss">Создать первого босса</button>')}</div>`}
  <div class="section-title"><h2>${icon('crown', 18).replace('class="ic ', 'style="display:inline;vertical-align:-3px;margin-right:6px" class="ic ')}Зал славы</h2><small>${won.length ? `${fmtNum(sum(won, b => b.reward.xp))} XP за победы` : ''}</small></div>
  ${won.length ? `<div class="card"><table class="table"><thead><tr><th>Босс</th><th class="d-only">Сложность</th><th>Дата победы</th><th class="d-only">Битва длилась</th><th style="text-align:right">Награда</th></tr></thead><tbody>
    ${won.map(b => `<tr data-act="nav" data-to="boss/${b.id}" style="cursor:pointer"><td><div class="row"><div class="boss-emb" style="--bc:${b.color};width:34px;height:34px;border-radius:11px">${icon(b.icon, 16)}</div><b style="font-weight:500">${esc(b.name)}</b></div></td>
      <td class="d-only"><span class="tier t${b.tier}">${TIERS[b.tier].name}</span></td><td>${fmtDay(b.wonAt, true)}</td><td class="d-only">${diffDays(b.startDate, b.wonAt) + 1} ${pDays(diffDays(b.startDate, b.wonAt) + 1)}</td>
      <td style="text-align:right"><span class="delta up">+${fmtNum(b.reward.xp)} XP</span></td></tr>`).join('')}</tbody></table></div>`
    : `<div class="card flat">${emptyState('crown', 'Здесь появятся побеждённые боссы с датой и итогами битвы')}</div>`}`;
}
ACTIONS.newBoss = () => { BD = null; go('arena-new'); return false; };

function bossCard(b) {
  const st = bossState(b), sec = sectionById(b.sectionId), md = metricDef(b.type, b.metric);
  return `<div class="card click boss-card glow" data-boss="${b.id}" data-act="nav" data-to="boss/${b.id}" style="--bc:${b.color};--cg:color-mix(in srgb, ${b.color} 22%, transparent)">
    <div class="row" style="gap:16px;align-items:flex-start">
      <div class="boss-emb">${icon(b.icon, 26)}</div>
      <div class="grow"><div class="row between wrap"><b style="font-weight:500;font-size:17px">${esc(b.name)}</b><span class="tier t${b.tier}">${TIERS[b.tier].name}</span></div>
        <div class="sub" style="margin-top:3px">${sec ? esc(sec.name) + ' · ' : ''}${fmtNum(st.cur, 1)} → ${fmtNum(b.target, 1)} ${md.unit}</div></div>
    </div>
    <div class="row between mt2" style="margin-bottom:8px"><span class="num num-s">${fmtNum(st.left)}<span class="u">/ ${fmtNum(b.maxHp)} HP</span></span><span class="label">${Math.round(st.pct * 100)}%</span></div>
    ${hpBar(b, st)}
    <div class="row between mt"><span class="sub">${st.daysLeft >= 0 ? `${st.daysLeft} ${pDays(st.daysLeft)} до срока` : '<span style="color:var(--warn)">срок прошёл</span>'}</span>
      <span class="sub" style="color:${st.forecast.ok === true ? 'var(--up)' : st.forecast.ok === false ? 'var(--warn)' : 'var(--dim)'}">${st.forecast.ok === true ? 'успеваешь' : st.forecast.ok === false ? 'отстаёшь' : 'оцениваю темп'}</span></div>
  </div>`;
}
function hpBar(b, st, big) {
  return `<div>${bar(st.pct, 'hp-' + b.id + (big ? 'L' : ''), { cls: 'hp' + (big ? '' : ' thin'), style: `--bc:${b.color}` })}
    ${b.phases ? `<div class="phase-marks">${[75, 50, 25].map(p => `<i style="left:${p}%;${big ? 'top:-12px;height:12px' : 'top:-6px;height:6px'}"></i>`).join('')}</div>` : ''}</div>`;
}

/* ---------- страница битвы ---------- */
function renderBoss(id) {
  const b = S.bosses.find(x => x.id === id);
  if (!b) return `<div class="card mt2">${emptyState('alert', 'Босс не найден', '<button class="btn sm" data-act="nav" data-to="arena">На арену</button>')}</div>`;
  const st = bossState(b), sec = sectionById(b.sectionId), md = metricDef(b.type, b.metric);
  const hits = S.events.filter(e => (e.hits || []).some(h => h.id === b.id)).slice(-8).reverse();
  const won = b.status === 'won';
  const rules = Object.entries(b.rules || {}).filter(([, v]) => v);
  const needTxt = st.needPerDay != null && !won ? `${fmtNum(Math.abs(st.needPerDay), Math.abs(st.needPerDay) < 3 ? 2 : 0)} ${md.unit} в день` : '—';
  return `
  <div class="page-h">
    <div class="row" style="gap:20px;align-items:center">
      <div class="boss-emb xl" style="--bc:${b.color}">${icon(b.icon, 44)}</div>
      <div><div class="eyebrow" style="margin-bottom:8px"><span class="tier t${b.tier}">${TIERS[b.tier].name}</span>${sec ? esc(sec.name) : ''}</div>
        <h1 style="font-size:clamp(28px,3.4vw,42px)">${esc(b.name)}</h1></div>
    </div>
    <div class="row wrap">${won ? `<span class="delta up">Повержен ${fmtDay(b.wonAt)}</span>` : `
      ${b.metric === 'manual' ? `<button class="btn sm primary" data-act="bossManual" data-id="${b.id}">${icon('refresh', 15)} Обновить прогресс</button>` : ''}
      <button class="btn sm" data-act="bossDeadline" data-id="${b.id}">${icon('calendar', 15)} Срок</button>
      <button class="btn sm ghost" data-act="bossRetreat" data-id="${b.id}">${icon('flag', 15)} Отступить</button>`}</div>
  </div>
  <div class="card boss-card glow" data-boss="${b.id}" style="--bc:${b.color};--cg:color-mix(in srgb, ${b.color} 25%, transparent)">
    <div class="row between wrap" style="align-items:flex-end;margin-bottom:14px">
      <div><div class="label">Здоровье босса</div><div class="num num-xl" style="margin-top:8px">${fmtNum(st.left)}<span class="u">/ ${fmtNum(b.maxHp)} HP</span></div></div>
      <div style="text-align:right"><div class="num num-m">${Math.round(st.pct * 100)}<span class="u">%</span></div>${b.regen > 1 && !won ? `<span class="delta warn">восстановил ${fmtNum(b.regen)} HP</span>` : ''}</div>
    </div>
    ${hpBar(b, st, true)}
    ${b.phases ? `<div class="row wrap mt" style="gap:8px">${[75, 50, 25].map((p, i) => `<span class="chip" style="${(b.phasesHit || []).includes(p) || won ? 'color:var(--text);border-color:var(--line-2)' : ''}">${(b.phasesHit || []).includes(p) || won ? icon('check', 13) : ''} Фаза ${i + 2} · ${p}%</span>`).join('')}</div>` : ''}
    <div class="hr"></div>
    <div class="kv">
      <div><small>Осталось дней</small><b>${won ? '—' : Math.max(0, st.daysLeft)}</b></div>
      <div><small>Средний урон в день</small><b>${fmtNum(st.avg)}</b></div>
      <div><small>Сейчас</small><b>${fmtNum(st.cur, 1)}<span class="dim" style="font-size:13px"> ${md.unit}</span></b></div>
      <div><small>Цель</small><b>${fmtNum(b.target, 1)}<span class="dim" style="font-size:13px"> ${md.unit}</span></b></div>
      <div><small>Нужно</small><b style="font-size:17px">${needTxt}</b></div>
    </div>
    ${!won ? `<div class="callout ${st.forecast.ok === false ? 'warn' : st.forecast.ok ? 'acc' : ''} mt2">${icon(st.forecast.ok === false ? 'alert' : 'chart', 17)}<div><b>Прогноз.</b> ${st.forecast.text}.${st.daysLeft < 0 ? ' Срок прошёл — продли его или отступи без штрафа.' : ''}</div></div>` : ''}
  </div>
  <div class="grid g2 mt">
    <div class="card">
      <div class="card-h"><h3>${icon('swords', 18)} Чем наносится урон</h3></div>
      <div class="list">
        <div class="li"><div class="grow"><b>Реальный прогресс к цели</b><small>${md.name} — до 75% здоровья</small></div><span class="chip">${Math.round(st.p * 100)}%</span></div>
        ${rules.map(([k, v]) => `<div class="li"><div class="grow"><b>${BOSS_ACTIONS.find(a => a.id === k)?.name || k}</b><small>${fmtNum(HIT_MULT[v] * b.maxHp * 0.01)} HP за действие</small></div><span class="chip">${HIT_LABELS[v]}</span></div>`).join('')}
        ${b.streakBonus ? `<div class="li"><div class="grow"><b>Бонус импульса</b><small>+25% урона при серии от 7 дней</small></div><span class="chip">${momentumStreak() >= 7 ? 'активен' : 'ждёт'}</span></div>` : ''}
      </div>
      <div class="sub mt">Действия наносят до 25% здоровья${st.actCapped ? ' — этот запас исчерпан, добивай реальным прогрессом' : ''}. Бездействие 3+ дня позволяет боссу немного восстановиться, но заработанный опыт не отнимается никогда.</div>
    </div>
    <div class="card">
      <div class="card-h"><h3>${icon('clock', 18)} Журнал битвы</h3><span class="sub">${b.hits || 0} ударов</span></div>
      ${hits.length ? `<div class="list">${hits.map(e => { const h = e.hits.find(x => x.id === b.id); return `<div class="li"><div class="grow"><b>${esc(e.note || 'Действие')}</b><small>${relDay(e.d)}</small></div><span class="delta down">−${h.dmg} HP</span></div>`; }).join('')}</div>`
        : emptyState('swords', 'Выполняй задания — каждый удар появится здесь')}
      <div class="hr"></div>
      <div class="row between"><span class="label">Награда за победу</span><span class="delta acc">+${fmtNum(b.reward.xp)} XP</span></div>
      <div class="sub" style="margin-top:6px">${(b.stats || []).map(statName).join(', ') || 'Характеристика раздела'}${b.reward.title ? ` · титул «${esc(b.reward.title)}»` : ''} · достижение</div>
    </div>
  </div>
  <div class="sub mt">Начало битвы: ${fmtDay(b.startDate, true)} · срок: ${fmtDay(b.deadline, true)}</div>`;
}
ACTIONS.bossManual = el => {
  const b = S.bosses.find(x => x.id === el.dataset.id);
  openModal(`${modalHead('Текущее значение', `${esc(b.name)}: старт ${fmtNum(b.start, 1)}, цель ${fmtNum(b.target, 1)}`)}
    <form data-form="bossManual" class="form-grid"><input type="hidden" name="id" value="${b.id}">
      <label class="field"><span>Значение сейчас</span><input class="input" type="number" step="any" name="v" value="${b.manual ?? b.start}" autofocus></label>
      <div class="field" style="align-self:end"><button class="btn primary block">Обновить</button></div></form>`);
  return false;
};
FORMS.bossManual = d => {
  const b = S.bosses.find(x => x.id === d.id); const before = bossState(b).left;
  b.manual = +d.v; closeModal(true);
  const dealt = Math.round(before - bossState(b).left);
  if (dealt > 0) { b.lastHit = today(); pushFx({ type: 'hit', boss: b, dmg: dealt }); }
  afterChange();
};
ACTIONS.bossDeadline = el => {
  const b = S.bosses.find(x => x.id === el.dataset.id);
  openModal(`${modalHead('Новый срок', 'Здоровье босса не изменится — просто больше времени на битву')}
    <form data-form="bossDeadline" class="form-grid"><input type="hidden" name="id" value="${b.id}">
      <label class="field"><span>Срок</span><input class="input" type="date" name="d" min="${addDays(today(), 1)}" value="${b.deadline > today() ? b.deadline : addDays(today(), 14)}"></label>
      <div class="field" style="align-self:end"><button class="btn primary block">Сохранить</button></div></form>`);
  return false;
};
FORMS.bossDeadline = d => { S.bosses.find(x => x.id === d.id).deadline = d.d; closeModal(true); saveState(); };
ACTIONS.bossRetreat = async el => {
  const b = S.bosses.find(x => x.id === el.dataset.id);
  if (!await confirmDialog({ title: 'Отступить?', text: 'Босс покинет арену. Никаких штрафов: весь опыт, заработанный в битве, остаётся. Можно вернуться к цели позже с новым боссом.', ok: 'Отступить' })) return false;
  b.status = 'retreat'; saveState(); go('arena'); return false;
};

/* ---------- создание босса ---------- */
function newDraft() {
  const sec = visibleSections()[0] || S.sections[0];
  const d = { sectionId: sec.id, name: '', icon: 'skull', color: COLORS[1], type: 'reach', metric: 'weight', arg: '', start: '', target: '', deadline: addDays(today(), 60),
    rules: { task: 1, pr: 0, workout: 0 }, streakBonus: true, stats: [sec.stat], rewardTitle: '' };
  applySectionDefaults(d, sec);
  return d;
}
function applySectionDefaults(d, sec) {
  const map = { weight: ['reach', 'weight'], workout: ['count', 'workouts'], reading: ['count', 'pages'], meditation: ['count', 'med_minutes'], abstinence: ['endure', 'abst'], journal: ['endure', 'journal_streak'], gratitude: ['endure', 'gratitude_streak'], content: ['count', 'publications'], custom: ['count', 'tasks'] };
  [d.type, d.metric] = map[sec.type] || map.custom;
  d.stats = [sec.stat];
  d.rules = sec.type === 'workout' ? { task: 1, workout: 2, pr: 2 } : sec.type === 'reading' ? { task: 1, reading: 1 } : sec.type === 'meditation' ? { task: 1, meditation: 1 } : sec.type === 'journal' ? { task: 1, journal: 1 } : sec.type === 'content' ? { task: 1, publish: 2, content: 1 } : { task: 1 };
  d.icon = { weight: 'mountain', workout: 'dumbbell', reading: 'book', meditation: 'lotus', abstinence: 'ban', journal: 'pen', gratitude: 'sparkle', content: 'video' }[sec.type] || 'skull';
  d.color = sec.color;
  setDraftArg(d);
}
function setDraftArg(d) {
  d.arg = d.metric === 'exercise' ? (exerciseNames()[0] || '') : d.metric === 'abst' ? (S.abstinence.counters[0] || {}).id || '' : d.metric === 'quest_streak' ? (S.quests.find(q => q.kind === 'daily' && !q.archived) || {}).id || '' : '';
  const s = metricStartValue(d.type, d.metric, d.arg);
  d.start = d.metric === 'manual' ? '' : Math.round(s * 10) / 10;
  d.target = d.metric === 'weight' && S.weight.goal ? S.weight.goal : d.type === 'endure' ? Math.max(30, d.start + 30) : '';
  if (d.type === 'endure' && d.target) d.deadline = addDays(today(), d.target - d.start + 3);
}

function renderBossForm() {
  BD ||= newDraft();
  const d = BD, ms = METRICS[d.type];
  const argField = d.metric === 'exercise' ? `<label class="field"><span>Упражнение</span><input class="input" list="bExList" value="${esc(d.arg)}" data-input="bd" name="arg" placeholder="Жим лёжа"><datalist id="bExList">${exerciseNames().map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>`
    : d.metric === 'abst' ? `<label class="field"><span>Счётчик</span><select class="input" name="arg" data-change="bdc">${S.abstinence.counters.map(c => `<option value="${c.id}" ${c.id === d.arg ? 'selected' : ''}>${esc(c.name)}</option>`).join('') || '<option value="">Сначала добавь счётчик в разделе «Воздержание»</option>'}</select></label>`
    : d.metric === 'quest_streak' ? `<label class="field"><span>Задание</span><select class="input" name="arg" data-change="bdc">${S.quests.filter(q => q.kind === 'daily' && !q.archived).map(q => `<option value="${q.id}" ${q.id === d.arg ? 'selected' : ''}>${esc(q.title)}</option>`).join('')}</select></label>` : '';
  const unit = metricDef(d.type, d.metric).unit;
  return `
  <div class="page-h"><div><div class="eyebrow"><span class="live"></span>Арена · новый босс</div><h1>Создать <span class="soft">босса</span></h1><p>Здоровье и сложность рассчитаются сами — по цели, сроку и твоей истории.</p></div>
    <button class="btn ghost" data-act="nav" data-to="arena">${icon('x', 15)} Отмена</button></div>
  <div class="grid g-main">
    <div class="stack">
      <div class="card"><div class="card-h"><h3>${icon('user', 18)} Облик</h3></div>
        <div class="form-grid">
          <label class="field full"><span>Название</span><input class="input" name="name" value="${esc(d.name)}" data-input="bd" placeholder="Например: Страж восьмидесяти" maxlength="40"></label>
          <label class="field"><span>Раздел</span><select class="input" name="sectionId" data-change="bdc">${activeSections().map(s => `<option value="${s.id}" ${s.id === d.sectionId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
          <div class="field"><span>Цвет</span><div class="picker colors">${COLORS.map(c => `<button type="button" class="${c === d.color ? 'on' : ''}" style="--c:${c}" data-act="bdPick" data-k="color" data-v="${c}"><i></i></button>`).join('')}</div></div>
          <div class="field full"><span>Эмблема</span><div class="picker">${BOSS_ICONS.map(i => `<button type="button" class="${i === d.icon ? 'on' : ''}" data-act="bdPick" data-k="icon" data-v="${i}">${icon(i, 18)}</button>`).join('')}</div></div>
        </div></div>
      <div class="card"><div class="card-h"><h3>${icon('target', 18)} Цель</h3></div>
        <div class="field mb"><span>Тип цели</span>${segmented('bdType', [['reach', 'Дойти до значения'], ['count', 'Набрать количество'], ['endure', 'Продержаться']], d.type, 'full')}</div>
        <div class="form-grid">
          <label class="field ${argField ? '' : 'full'}"><span>Что измеряем</span><select class="input" name="metric" data-change="bdc">${ms.filter(m => !m.hidden || m.id === d.metric).map(m => `<option value="${m.id}" ${m.id === d.metric ? 'selected' : ''}>${m.name}</option>`).join('')}</select></label>
          ${argField}
          <label class="field"><span>Старт${unit ? ', ' + unit : ''}</span><input class="input" type="number" step="any" name="start" value="${d.start}" data-input="bd"></label>
          <label class="field"><span>Цель${unit ? ', ' + unit : ''}</span><input class="input" type="number" step="any" name="target" value="${d.target}" data-input="bd" placeholder="${d.type === 'endure' ? '90' : ''}"></label>
          <label class="field full"><span>Срок</span><input class="input" type="date" name="deadline" value="${d.deadline}" min="${addDays(today(), 1)}" data-input="bd"></label>
        </div></div>
      <div class="card"><div class="card-h"><h3>${icon('swords', 18)} Урон по боссу</h3></div>
        <div class="sub mb">Реальный прогресс к цели снимает до 75% здоровья. Действия ниже — ещё до 25%.</div>
        <div class="list">${BOSS_ACTIONS.map(a => `<div class="li" style="flex-wrap:wrap"><div class="grow" style="min-width:150px"><b>${a.name}</b></div>${segmented('bdRule', HIT_LABELS.map((l, i) => [String(i), l]), String(d.rules[a.id] || 0), 'soft').replace(/data-act="bdRule"/g, `data-act="bdRule" data-k="${a.id}"`)}</div>`).join('')}
          <div class="li"><div class="grow"><b>Бонус импульса</b><small>+25% к урону при серии от 7 дней</small></div>${switchEl('bdStreak', d.streakBonus)}</div></div></div>
      <div class="card"><div class="card-h"><h3>${icon('gift', 18)} Награда</h3></div>
        <div class="field mb"><span>Какие характеристики прокачает победа</span><div class="row wrap">${STATS.map(s => `<button type="button" class="chip" style="${d.stats.includes(s.id) ? 'background:var(--text);color:#0b0b0e;border-color:transparent' : ''}" data-act="bdStat" data-v="${s.id}">${icon(s.icon, 13)} ${s.name}</button>`).join('')}</div></div>
        <label class="field"><span>Новый титул за победу (необязательно)</span><input class="input" name="rewardTitle" value="${esc(d.rewardTitle)}" data-input="bd" placeholder="Например: Покоритель вершин" maxlength="32"></label>
        <div class="sub mt">Опыт и достижение назначаются автоматически по сложности.</div></div>
    </div>
    <div class="stack" style="position:sticky;top:60px">
      <div class="card glow" id="bossAssess" style="--cg:color-mix(in srgb, ${d.color} 25%, transparent)">${assessHtml()}</div>
    </div>
  </div>`;
}
function assessHtml() {
  const d = BD, a = assessBoss(d), sec = sectionById(d.sectionId);
  return `<div class="row" style="gap:16px">
      <div class="boss-emb" style="--bc:${d.color}">${icon(d.icon, 26)}</div>
      <div class="grow"><b style="font-weight:500;font-size:17px;display:block">${esc(d.name || 'Безымянный босс')}</b><span class="sub">${sec ? esc(sec.name) : ''}</span></div>
    </div>
    <div class="hr"></div>
    <div class="label">Расчёт сложности</div>
    <div class="row between" style="margin:12px 0 8px"><span class="tier t${a.tier}" style="height:30px;font-size:13px;padding:0 14px">${TIERS[a.tier].name}</span><span class="sub">${a.days} ${pDays(a.days)} на битву</span></div>
    <div class="row" style="gap:4px;margin-bottom:18px">${TIERS.map((t, i) => `<i style="flex:1;height:4px;border-radius:2px;background:${i <= a.tier ? 'var(--text)' : 'rgba(255,255,255,.08)'}"></i>`).join('')}</div>
    <div class="kv"><div><small>Здоровье</small><b>${fmtNum(a.hp)}</b></div><div><small>Награда</small><b>${fmtNum(a.xp)}<span class="dim" style="font-size:13px"> XP</span></b></div><div><small>Фазы</small><b>${a.phases ? '3' : '—'}</b></div></div>
    ${a.notes.map(n => `<div class="callout mt">${icon('info', 16)}<div>${n}</div></div>`).join('')}
    ${a.warnings.map(w => `<div class="callout warn mt">${icon('alert', 16)}<div><b>${w}</b>${a.suggestion ? '<br>' + a.suggestion.text : ''}</div></div>`).join('')}
    ${a.suggestion ? `<div class="row wrap mt"><button class="btn sm" data-act="bdSuggest" data-w="deadline">Взять реальный срок</button><button class="btn sm" data-act="bdSuggest" data-w="mid">Промежуточный босс</button></div>` : ''}
    <div class="sub mt">Учтены: величина цели, срок, твой уровень (${levelInfo().level}) и средний темп за последние 30 дней.</div>
    <button class="btn primary block mt2" data-act="createBoss" ${a.ok ? '' : 'disabled'}>${icon('swords', 16)} Вызвать на бой</button>`;
}
INPUTS.bd = el => {
  BD[el.name] = el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
  const box = $('#bossAssess'); if (box) { box.innerHTML = assessHtml(); }
};
INPUTS.bdc = el => {
  if (el.name === 'sectionId') { BD.sectionId = el.value; applySectionDefaults(BD, sectionById(el.value)); }
  else if (el.name === 'metric') { BD.metric = el.value; setDraftArg(BD); }
  else if (el.name === 'arg') { BD.arg = el.value; const s = metricStartValue(BD.type, BD.metric, BD.arg); BD.start = s; }
};
ACTIONS.bdType = el => { BD.type = el.dataset.v; BD.metric = METRICS[BD.type][0].id; setDraftArg(BD); };
ACTIONS.bdPick = el => { BD[el.dataset.k] = el.dataset.v; };
ACTIONS.bdRule = el => { BD.rules[el.dataset.k] = +el.dataset.v; };
ACTIONS.bdStreak = () => { BD.streakBonus = !BD.streakBonus; };
ACTIONS.bdStat = el => { const v = el.dataset.v; BD.stats = BD.stats.includes(v) ? BD.stats.filter(x => x !== v) : [...BD.stats, v]; };
ACTIONS.bdSuggest = el => {
  const a = assessBoss(BD);
  if (el.dataset.w === 'deadline') BD.deadline = a.suggestion.deadline;
  else { BD.target = a.suggestion.mid; if (BD.name && !/промежуточн/i.test(BD.name)) BD.name += ' · этап'; }
};
ACTIONS.createBoss = () => {
  const d = BD, a = assessBoss(d);
  if (!a.ok) return false;
  if (d.metric === 'exercise' && !d.arg) { toast({ icon: 'alert', title: 'Укажи упражнение' }); return false; }
  if (d.metric === 'abst' && !d.arg) { toast({ icon: 'alert', title: 'Сначала добавь счётчик воздержания' }); return false; }
  const b = {
    id: uid(), name: d.name.trim() || 'Босс: ' + (sectionById(d.sectionId)?.name || ''), icon: d.icon, color: d.color, sectionId: d.sectionId,
    type: d.type, metric: d.metric, arg: d.arg, start: +d.start, target: +d.target, startDate: today(), deadline: d.deadline,
    rules: { ...d.rules }, streakBonus: d.streakBonus, stats: [...d.stats], tier: a.tier, maxHp: a.hp, phases: a.phases,
    reward: { xp: a.xp, title: d.rewardTitle.trim() || null }, act: 0, regen: 0, hits: 0, phasesHit: [], status: 'active',
  };
  if (b.metric === 'manual') b.manual = b.start;
  S.bosses.push(b); BD = null; saveState();
  toast({ icon: b.icon, title: 'Босс вызван на бой', text: `${b.name} · ${TIERS[b.tier].name} · ${fmtNum(b.maxHp)} HP` });
  go('boss/' + b.id); return false;
};
