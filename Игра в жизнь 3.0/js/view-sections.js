/* Разделы: список, управление, страница раздела, задания */
'use strict';

function renderSections() {
  const vis = activeSections().filter(s => !s.hidden), hid = activeSections().filter(s => s.hidden);
  const arch = S.sections.filter(s => s.archived);
  return `
  <div class="page-h">
    <div><div class="eyebrow"><span class="live"></span>${vis.length} ${plural(vis.length, ['раздел', 'раздела', 'разделов'])} в игре</div>
      <h1>Разделы <span class="soft">жизни</span></h1><p>Каждый раздел прокачивает характеристику персонажа.</p></div>
    <div class="row wrap"><button class="btn" data-act="manageSections">${icon('menu', 16)} Порядок</button><button class="btn primary" data-act="newSection">${icon('plus', 16)} Новый раздел</button></div>
  </div>
  <div class="grid g3">${vis.map(sectionTile).join('')}</div>
  ${hid.length ? `<div class="section-title"><h2>Скрытые</h2><small>не участвуют в заданиях дня</small></div>
    <div class="card"><div class="list">${hid.map(s => `<div class="li">${sectionIconBox(s, 16, 'sm')}<div class="grow"><b>${esc(s.name)}</b><small>${statName(s.stat)}</small></div>
      <button class="btn xs" data-act="toggleHidden" data-id="${s.id}">${icon('eye', 14)} Показать</button></div>`).join('')}</div></div>` : ''}
  ${arch.length ? `<div class="section-title"><h2>Архив</h2><small>история сохранена</small></div>
    <div class="card"><div class="list">${arch.map(s => `<div class="li">${sectionIconBox(s, 16, 'sm')}<div class="grow"><b>${esc(s.name)}</b><small>в архиве</small></div>
      <button class="btn xs" data-act="restoreSection" data-id="${s.id}">${icon('undo', 14)} Вернуть</button></div>`).join('')}</div></div>` : ''}`;
}

function sectionTile(s) {
  const dq = questsOf(s.id, 'daily'), done = dq.filter(x => questStatus(x).done).length;
  const streak = Math.max(0, ...questsOf(s.id).map(x => questStatus(x).streak));
  const xp30 = sum(S.events.filter(e => e.s === s.id && e.d >= addDays(today(), -29)), e => e.xp);
  const locked = !sectionUnlocked(s.id);
  return `<div class="card click sec-tile" data-act="nav" data-to="s/${s.id}" style="${locked ? 'opacity:.6' : ''}">
    <div class="row between">${sectionIconBox(s, 20)}<span class="chip">${locked ? icon('crown', 13) + ' Подписка' : icon(STATS.find(x => x.id === s.stat)?.icon || 'star', 13) + ' ' + statName(s.stat)}</span></div>
    <div><b style="font-weight:500;font-size:17px;letter-spacing:-.01em">${esc(s.name)}</b>
      <div class="sub" style="margin-top:4px">${sectionSummary(s)}</div></div>
    <div class="row between"><span class="sub">${dq.length ? `Сегодня ${done}/${dq.length}` : 'Без ежедневных'}${streak > 1 ? ` · ${icon('flame', 12).replace('class="ic ', 'style="display:inline;vertical-align:-2px" class="ic ')} ${streak}` : ''}</span><span class="sub">${fmtNum(xp30)} XP / 30 дн</span></div>
    ${bar(dq.length ? done / dq.length : 0, 'tile-' + s.id, { cls: 'thin', color: s.color })}
  </div>`;
}

function sectionSummary(s) {
  switch (s.type) {
    case 'weight': { const lw = lastWeight(); return lw ? `${fmtNum(lw, 1)} кг${S.weight.goal ? ` · цель ${fmtNum(S.weight.goal, 1)}` : ''}` : 'Запиши стартовый вес'; }
    case 'workout': { const w = S.workouts.list.filter(x => x.d >= weekStart()).length; return `${w} из ${S.workouts.weeklyGoal} тренировок за неделю`; }
    case 'reading': { const b = S.reading.books.find(x => x.status === 'now'); return b ? `«${esc(b.title)}» · ${Math.round((b.read || 0) / (b.pages || 1) * 100)}%` : 'Добавь книгу'; }
    case 'meditation': return `${fmtNum(totalMedMin())} минут всего`;
    case 'abstinence': { const c = S.abstinence.counters; return c.length ? c.map(x => `${esc(x.name)}: ${abstDays(x)} дн.`).slice(0, 2).join(' · ') : 'Добавь счётчик'; }
    case 'journal': return `${Object.keys(S.journal).length} записей`;
    case 'gratitude': return `${Object.keys(S.gratitude).length} дней благодарности`;
    case 'content': { const f = followersTotal(); return `Публикации сегодня: ${postsOn(today()).length} из ${contentTarget()}${f != null ? ' · ' + fmtNum(f) + ' подп.' : ''}`; }
    default: return `${questsOf(s.id).length} ${plural(questsOf(s.id).length, ['задание', 'задания', 'заданий'])}`;
  }
}

/* ---------- страница раздела ---------- */
function renderSection(id) {
  const s = sectionById(id);
  if (!s) return `<div class="card mt2">${emptyState('alert', 'Раздел не найден', '<button class="btn sm" data-act="nav" data-to="sections">К разделам</button>')}</div>`;
  const body = (TRACKERS[s.type] || (() => ''))(s);
  const xpTotal = sum(S.events.filter(e => e.s === s.id), e => e.xp);
  return `
  <div class="page-h">
    <div class="row" style="gap:18px;align-items:center">
      <div class="ico-box tint" style="--ic:${s.color};width:64px;height:64px;border-radius:20px">${icon(s.icon, 28)}</div>
      <div><div class="eyebrow" style="margin-bottom:6px">${statName(s.stat)} · ${fmtNum(xpTotal)} XP</div><h1 style="font-size:clamp(28px,3.4vw,40px)">${esc(s.name)}</h1></div>
    </div>
    <div class="row"><button class="btn sm" data-act="editSection" data-id="${s.id}">${icon('pen', 15)} Настроить</button></div>
  </div>
  ${body}
  ${questsBlock(s)}`;
}

function questsBlock(s) {
  const kinds = [['daily', 'Ежедневные', 'sun'], ['weekly', 'Недельные', 'calendar'], ['goal', 'Большие цели', 'target']];
  return `<div class="section-title"><h2>Задания-квесты</h2><button class="btn sm" data-act="newQuest" data-s="${s.id}">${icon('plus', 15)} Задание</button></div>
  <div class="grid g3">${kinds.map(([k, l, ic]) => {
    const qs = questsOf(s.id, k);
    return `<div class="card"><div class="card-h"><h3>${icon(ic, 17)} ${l}</h3><span class="sub">${qs.length}</span></div>
      ${qs.length ? `<div class="quests">${qs.map(qq => questRow(qq, { edit: true, just: justQuest })).join('')}</div>` : `<div class="empty" style="padding:16px">Пусто. <button class="btn xs" data-act="newQuest" data-s="${s.id}" data-k="${k}">Добавить</button></div>`}
    </div>`;
  }).join('')}</div>`;
}

/* ---------- задания: создание и правка ---------- */
function questForm(qq, sectionId, kind) {
  const isNew = !qq;
  qq ||= { title: '', kind: kind || 'daily', xp: 20, target: 1, sectionId };
  return `${modalHead(isNew ? 'Новое задание' : 'Задание', 'Отмечается одним нажатием и даёт опыт')}
  <form data-form="saveQuest" class="form-grid">
    <input type="hidden" name="id" value="${qq.id || ''}"><input type="hidden" name="sectionId" value="${qq.sectionId}">
    <label class="field full"><span>Название</span><input class="input" name="title" value="${esc(qq.title)}" placeholder="Например: 10 000 шагов" required autofocus maxlength="60"></label>
    <label class="field"><span>Тип</span><select class="input" name="kind">
      <option value="daily" ${qq.kind === 'daily' ? 'selected' : ''}>Ежедневное</option>
      <option value="weekly" ${qq.kind === 'weekly' ? 'selected' : ''}>Недельное</option>
      <option value="goal" ${qq.kind === 'goal' ? 'selected' : ''}>Большая цель</option></select></label>
    <label class="field"><span>Опыт за выполнение</span><input class="input" type="number" name="xp" min="1" max="2000" value="${qq.xp}"></label>
    <label class="field"><span>Раз в неделю (для недельных)</span><input class="input" type="number" name="target" min="1" max="21" value="${qq.target || 1}"></label>
    <label class="field"><span>Раздел</span><select class="input" name="sectionId">${activeSections().map(s => `<option value="${s.id}" ${s.id === qq.sectionId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
    ${qq.auto ? `<div class="full callout">${icon('link', 16)}<div>Отмечается автоматически, когда ты делаешь запись в разделе. Можно отметить и вручную.</div></div>` : ''}
    <div class="modal-f full">
      ${isNew ? '' : `<button type="button" class="btn danger" data-act="deleteQuest" data-id="${qq.id}" style="margin-right:auto">${icon('trash', 15)} Удалить</button>`}
      <button type="button" class="btn ghost" data-act="closeModal">Отмена</button><button class="btn primary">${isNew ? 'Добавить' : 'Сохранить'}</button>
    </div>
  </form>`;
}
ACTIONS.newQuest = el => { openModal(questForm(null, el.dataset.s, el.dataset.k)); return false; };
ACTIONS.editQuest = el => { openModal(questForm(S.quests.find(x => x.id === el.dataset.id))); return false; };
FORMS.saveQuest = d => {
  const data = { title: d.title.trim(), kind: d.kind, xp: clamp(+d.xp || 10, 1, 2000), target: d.kind === 'weekly' ? clamp(+d.target || 1, 1, 21) : 1, sectionId: d.sectionId };
  if (d.id) Object.assign(S.quests.find(x => x.id === d.id), data);
  else S.quests.push({ id: uid(), createdAt: today(), ...data });
  saveState(); closeModal(true);
  toast({ icon: 'check', title: d.id ? 'Задание обновлено' : 'Задание добавлено', text: data.title });
};
ACTIONS.deleteQuest = async el => {
  const qq = S.quests.find(x => x.id === el.dataset.id);
  const ok = await confirmDialog({ title: 'Удалить задание?', text: `«${qq.title}» исчезнет из списка. Заработанный опыт останется.`, ok: 'Удалить', danger: true });
  if (!ok) return false;
  qq.archived = true; saveState();
};

/* ---------- разделы: создание, правка, удаление ---------- */
function sectionForm(s) {
  const isNew = !s;
  s ||= { name: '', icon: 'star', color: COLORS[hashStr(String(Date.now())) % COLORS.length], stat: 'mastery', type: 'custom' };
  return `${modalHead(isNew ? 'Новый раздел' : 'Настройки раздела', 'Название, иконка, цвет и характеристика, которую он качает')}
  <form data-form="saveSection" class="stack">
    <input type="hidden" name="id" value="${s.id || ''}">
    <input type="hidden" name="icon" value="${s.icon}"><input type="hidden" name="color" value="${s.color}">
    <label class="field"><span>Название</span><input class="input" name="name" value="${esc(s.name)}" placeholder="Например: Английский" required maxlength="32" autofocus></label>
    <div class="form-grid">
      <label class="field"><span>Характеристика</span><select class="input" name="stat">${STATS.map(x => `<option value="${x.id}" ${x.id === s.stat ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
      ${isNew ? `<label class="field"><span>Шаблон</span><select class="input" name="type">${Object.entries(SECTION_TYPES).map(([k, v]) => `<option value="${k}" ${k === 'custom' ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`
        : `<div class="field"><span>Шаблон</span><div class="input" style="display:flex;align-items:center;color:var(--muted)">${SECTION_TYPES[s.type]}</div></div>`}
    </div>
    <div class="field"><span>Иконка</span><div class="picker" data-pick="icon">${SECTION_ICONS.map(i => `<button type="button" class="${i === s.icon ? 'on' : ''}" data-act="pick" data-v="${i}">${icon(i, 18)}</button>`).join('')}</div></div>
    <div class="field"><span>Цвет акцента</span><div class="picker colors" data-pick="color">${COLORS.map(c => `<button type="button" class="${c === s.color ? 'on' : ''}" style="--c:${c}" data-act="pick" data-v="${c}"><i></i></button>`).join('')}</div></div>
    <div class="modal-f">
      ${isNew ? '' : `<button type="button" class="btn danger" data-act="deleteSection" data-id="${s.id}" style="margin-right:auto">${icon('trash', 15)} Удалить</button>
        <button type="button" class="btn ghost" data-act="toggleHidden" data-id="${s.id}">${icon(s.hidden ? 'eye' : 'eyeOff', 15)} ${s.hidden ? 'Показать' : 'Скрыть'}</button>`}
      <button class="btn primary">${isNew ? 'Создать' : 'Сохранить'}</button>
    </div>
  </form>`;
}
ACTIONS.pick = el => {
  const box = el.closest('[data-pick]'), form = el.closest('form');
  box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
  form.querySelector(`[name="${box.dataset.pick}"]`).value = el.dataset.v;
  const inp = form.querySelector(`[name="${box.dataset.pick}"]`);
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  return false;
};
ACTIONS.newSection = () => {
  if (!isPremium() && activeSections().filter(s => !s.hidden).length >= FREE_SECTIONS) { openPaywall('Свои разделы без ограничений — в подписке. В бесплатной версии можно скрыть ненужный раздел и выбрать другой.'); return false; }
  openModal(sectionForm()); return false;
};
ACTIONS.editSection = el => { openModal(sectionForm(sectionById(el.dataset.id))); return false; };
FORMS.saveSection = d => {
  const data = { name: d.name.trim(), icon: d.icon, color: d.color, stat: d.stat };
  if (d.id) Object.assign(sectionById(d.id), data);
  else {
    const type = d.type || 'custom';
    const id = type !== 'custom' && !S.sections.some(s => s.id === type) ? type : uid();
    S.sections.push({ id, type, order: S.sections.length, hidden: false, ...data });
    if (type === 'custom') S.quests.push({ id: uid(), sectionId: id, title: 'Первый шаг в разделе', kind: 'daily', xp: 15, target: 1, createdAt: today() });
    closeModal(true); saveState();
    toast({ icon: data.icon, title: 'Раздел создан', text: data.name });
    go('s/' + id); return false;
  }
  saveState(); closeModal(true);
};
ACTIONS.toggleHidden = el => { const s = sectionById(el.dataset.id); s.hidden = !s.hidden; saveState(); closeModal(true); };
ACTIONS.restoreSection = el => { const s = sectionById(el.dataset.id); s.archived = false; s.hidden = false; S.quests.filter(x => x.sectionId === s.id && x.archivedWith).forEach(x => { x.archived = false; delete x.archivedWith; }); saveState(); };
ACTIONS.deleteSection = async el => {
  const s = sectionById(el.dataset.id);
  closeModal(true);
  const res = await confirmDialog({
    title: `Удалить «${s.name}»?`, text: 'Раздел исчезнет из игры. Заработанный опыт останется у персонажа.', ok: 'Удалить', danger: true,
    extra: `<form class="callout"><label class="row" style="gap:12px;cursor:pointer"><input type="checkbox" name="keep" checked style="width:18px;height:18px;accent-color:#fff"><div><b>Сохранить историю</b><br>Раздел уйдёт в архив, его можно будет вернуть вместе со всеми записями.</div></label></form>`,
  });
  if (!res) return false;
  if (res.keep) {
    s.archived = true;
    S.quests.filter(x => x.sectionId === s.id && !x.archived).forEach(x => { x.archived = true; x.archivedWith = true; });
  } else {
    S.sections = S.sections.filter(x => x.id !== s.id);
    S.quests = S.quests.filter(x => x.sectionId !== s.id);
    S.bosses.filter(b => b.sectionId === s.id && b.status === 'active').forEach(b => b.status = 'retreat');
  }
  saveState(); go('sections'); return false;
};

/* порядок и видимость */
ACTIONS.manageSections = () => { openModal(manageHtml()); return false; };
function manageHtml() {
  const list = activeSections();
  return `${modalHead('Порядок разделов', 'Меняй порядок, скрывай и настраивай разделы')}
  <div class="list" id="manageList">${list.map((s, i) => `<div class="li">
    ${sectionIconBox(s, 16, 'sm')}<div class="grow"><b style="${s.hidden ? 'color:var(--dim)' : ''}">${esc(s.name)}</b><small>${statName(s.stat)}${s.hidden ? ' · скрыт' : ''}</small></div>
    <div class="reorder">
      <button class="icon-btn sm" data-act="moveSection" data-id="${s.id}" data-d="-1" ${i === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Выше">${icon('chevU', 15)}</button>
      <button class="icon-btn sm" data-act="moveSection" data-id="${s.id}" data-d="1" ${i === list.length - 1 ? 'disabled style="opacity:.3"' : ''} aria-label="Ниже">${icon('chevD', 15)}</button>
      <button class="icon-btn sm" data-act="hideInManage" data-id="${s.id}" aria-label="Скрыть">${icon(s.hidden ? 'eyeOff' : 'eye', 15)}</button>
      <button class="icon-btn sm" data-act="editSection" data-id="${s.id}" aria-label="Изменить">${icon('pen', 14)}</button>
    </div></div>`).join('')}</div>
  <div class="modal-f"><button class="btn" data-act="newSection">${icon('plus', 15)} Новый раздел</button><button class="btn primary" data-act="closeModal">Готово</button></div>`;
}
ACTIONS.moveSection = el => {
  const list = activeSections(), i = list.findIndex(s => s.id === el.dataset.id), j = i + +el.dataset.d;
  if (j < 0 || j >= list.length) return false;
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((s, k) => s.order = k);
  saveState();
  $('#modal .modal').innerHTML = manageHtml();
};
ACTIONS.hideInManage = el => { const s = sectionById(el.dataset.id); s.hidden = !s.hidden; saveState(); $('#modal .modal').innerHTML = manageHtml(); };
