/* Личный раздел «Долги»: виден только владельцу (по почте аккаунта), данные лежат только в его сохранении */
'use strict';

const OWNER_HASH = 3548593541;
function isOwner() {
  return !!(typeof Cloud !== 'undefined' && Cloud.user && Cloud.user.email && hashStr(Cloud.user.email.trim().toLowerCase()) === OWNER_HASH);
}
const sectionAllowed = s => s.type !== 'debts' || isOwner();

const DEBT_SECTION = { id: 'debts', type: 'debts', name: 'Долги', icon: 'wallet', color: '#ff9f80', stat: 'will' };
const DEBT_DEFAULT = () => ({ list: [], pays: [], hold: { start: today(), best: 0, resets: [], awarded: [] } });

/* раздел появляется один раз после входа владельца */
function ensureDebts() {
  if (!isOwner() || (typeof DEMO !== 'undefined' && DEMO)) return;
  S.debts = { ...DEBT_DEFAULT(), ...S.debts };
  if (S.sections.some(s => s.type === 'debts')) return;
  S.sections.push({ ...DEBT_SECTION, order: -1, hidden: false });
  S.quests.push(
    q('debts', 'Ни одного нового долга сегодня', 'daily', 15, { icon: 'shield' }),
    q('debts', 'Внести платёж по долгу', 'weekly', 60, { auto: 'debtPay', icon: 'wallet' }),
    q('debts', 'Без импульсных покупок 7 дней', 'weekly', 50, { icon: 'ban' }),
    q('debts', 'Закрыть первый долг', 'goal', 300, { auto: 'debtClose', icon: 'trophy' }),
  );
  saveState();
}

const rub = n => fmtNum(Math.round(n)) + ' ₽';
const debtOpen = () => S.debts.list.filter(x => !x.closed);
const debtHoldDays = () => Math.max(0, diffDays(S.debts.hold.start, today()));
function addMonth(k) {
  const [y, m, d] = k.split('-').map(Number), last = new Date(y, m + 1, 0).getDate();
  return ymd(new Date(y, m, Math.min(d, last)));
}
/* прогноз: обязательные ежемесячные платежи или реальный темп за 60 дней — что больше */
function debtForecast() {
  const left = sum(debtOpen().map(x => x.left));
  if (!left) return null;
  const from = addDays(today(), -59), paid60 = sum(S.debts.pays.filter(p => p.d >= from).map(p => p.sum));
  const perMonth = Math.max(paid60 / 2, sum(debtOpen().map(x => x.pay || 0)));
  if (!perMonth) return null;
  const months = Math.ceil(left / perMonth), d = new Date(); d.setMonth(d.getMonth() + months);
  return { months, label: MONTHS_NOM[d.getMonth()].toLowerCase() + ' ' + d.getFullYear(), perMonth };
}

TRACKERS.debts = sec => {
  S.debts ||= DEBT_DEFAULT();
  const D = S.debts, open = debtOpen(), closed = D.list.filter(x => x.closed);
  const total = sum(D.list.map(x => x.total)), left = sum(open.map(x => x.left)), paid = total - left;
  const fc = debtForecast(), monthly = sum(open.map(x => x.pay || 0));
  const target = [...open].sort((a, b) => a.left - b.left)[0];
  const n = debtHoldDays(), best = Math.max(D.hold.best || 0, n);
  const next = ABST_MS.find(m => m > n), prev = [...ABST_MS].reverse().find(m => m <= n) || 0;
  const upcoming = open.filter(x => x.next).sort((a, b) => a.next < b.next ? -1 : 1);
  const due = x => { const k = diffDays(today(), x.next); return k < 0 ? `<span class="delta down">просрочен ${-k} ${pDays(-k)}</span>` : k === 0 ? '<span class="delta down">сегодня</span>' : k <= 3 ? `<span class="delta down">через ${k} ${pDays(k)}</span>` : `<span class="sub">через ${k} ${pDays(k)}</span>`; };
  return `
  <div class="grid g-main">
    <div class="card glow" style="--cg:color-mix(in srgb, ${sec.color} 14%, transparent)">
      <div class="card-h"><h3>${icon('skull', 18)} Долговой дракон</h3><button class="btn sm primary" data-act="newDebt">${icon('plus', 15)} Долг</button></div>
      ${D.list.length ? `
      <div class="label">Осталось отдать</div>
      <div class="num num-xl" style="margin:6px 0 4px">${rub(left)}</div>
      <div class="sub">из ${rub(total)} · отдано ${rub(paid)} (${total ? Math.round(paid / total * 100) : 0}%)</div>
      <div class="mt">${bar(total ? left / total : 0, 'debt-hp', { color: '#ff7d8a' })}</div>
      <div class="row wrap" style="margin-top:12px">
        <span class="chip">${icon('wallet', 13)} долгов: <b>${open.length}</b></span>
        ${monthly ? `<span class="chip">${icon('calendar', 13)} в месяц: <b>${rub(monthly)}</b></span>` : ''}
        ${closed.length ? `<span class="chip">${icon('trophy', 13)} закрыто: <b>${closed.length}</b></span>` : ''}
      </div>
      ${!open.length ? `<div class="callout acc mt2">${icon('crown', 16)}<div>Дракон повержен. Ты никому ничего не должен.</div></div>`
        : fc ? `<div class="callout mt2">${icon('flag', 16)}<div>При темпе ${rub(fc.perMonth)} в месяц свобода от долгов — <b>${fc.label}</b> (${fc.months} ${plural(fc.months, ['месяц', 'месяца', 'месяцев'])}).</div></div>` : ''}
      ${target && open.length > 1 ? `<div class="callout mt">${icon('target', 16)}<div>Сейчас бей по «${esc(target.name)}»: он самый маленький. Закроешь — освободится ${target.pay ? rub(target.pay) + ' в месяц' : 'платёж'} для следующего.</div></div>` : ''}`
      : emptyState('wallet', 'Запиши все долги и рассрочки — сумма, платёж и дата. Каждый платёж будет бить дракона.', '<button class="btn sm primary" data-act="newDebt">Добавить долг</button>')}
    </div>
    <div class="card glow" style="--cg:color-mix(in srgb, #f0c890 ${10 + Math.min(n, 90) / 3}%, transparent)">
      <div class="card-h"><h3>${icon('flame', 18)} Ударный режим</h3><span class="sub">без новых долгов</span></div>
      <div class="abst-big"><span class="num num-xl">${n}</span><span class="muted">${pDays(n)} без новых долгов и рассрочек</span></div>
      <div class="row wrap" style="margin-top:12px"><span class="chip">с ${fmtDay(D.hold.start)}</span><span class="chip">${icon('trophy', 13)} лучший: <b>${best}</b></span></div>
      ${next ? `<div class="mt2"><div class="row between" style="margin-bottom:8px"><span class="label">До этапа «${next} ${pDays(next)}»</span><span class="sub">${next - n} ${pDays(next - n)}</span></div>${bar((n - prev) / (next - prev), 'debt-hold', { color: '#f0c890' })}</div>` : `<div class="callout acc mt2">${icon('crown', 16)}<div>Все этапы пройдены. Кредитки больше не командуют тобой.</div></div>`}
      <div class="milestones mt2">${ABST_MS.map((m, i) => `<div class="ms ${n >= m ? 'on' : m === next ? 'next' : ''}"><i>${n >= m ? icon(ABST_ICONS[i], 16) : m}</i>${m} дн</div>`).join('')}</div>
      <div class="hr"></div>
      <div class="row between"><span class="sub">${D.hold.resets.length ? `Попыток: ${D.hold.resets.length + 1}` : 'Первая попытка'}</span><button class="btn xs ghost" data-act="debtSlip">${icon('refresh', 13)} Взял новый долг</button></div>
    </div>
  </div>
  ${upcoming.length ? `<div class="section-title"><h2>Ближайшие платежи</h2></div>
  <div class="card"><div class="list">${upcoming.map(x => `<div class="li"><div class="grow"><b>${esc(x.name)}</b><small>${fmtDay(x.next)}${x.pay ? ' · ' + rub(x.pay) : ''}</small><div style="margin-top:4px">${due(x)}</div></div>
    <button class="btn xs primary" data-act="debtPay" data-id="${x.id}">Оплатил</button></div>`).join('')}</div></div>` : ''}
  ${open.length ? `<div class="section-title"><h2>Кому я должен</h2><small>${open.length} ${plural(open.length, ['долг', 'долга', 'долгов'])}</small></div>
  <div class="grid g2">${[...open].sort((a, b) => b.left - a.left).map(x => `<div class="card">
    <div class="card-h"><h3>${icon(x === target ? 'target' : 'wallet', 18)} ${esc(x.name)}</h3><button class="icon-btn sm plain" data-act="editDebt" data-id="${x.id}">${icon('dots', 16)}</button></div>
    <div class="row between"><span class="num num-m">${rub(x.left)}</span><span class="sub">из ${rub(x.total)}</span></div>
    <div class="mt">${bar(x.total ? 1 - x.left / x.total : 0, 'debt-' + x.id, { color: sec.color })}</div>
    <div class="row wrap" style="margin-top:12px">${x.pay ? `<span class="chip">${rub(x.pay)} / мес</span>` : ''}${x.next ? `<span class="chip">${icon('calendar', 13)} ${fmtDay(x.next)}</span>` : ''}${x.note ? `<span class="chip">${esc(x.note)}</span>` : ''}</div>
    <div class="hr"></div>
    <div class="row between"><span class="sub">отдано ${x.total ? Math.round((1 - x.left / x.total) * 100) : 0}%</span><button class="btn xs primary" data-act="debtPay" data-id="${x.id}">${icon('zap', 13)} Внести платёж</button></div>
  </div>`).join('')}</div>` : ''}
  ${D.pays.length ? `<div class="section-title"><h2>Последние платежи</h2></div>
  <div class="card"><div class="list">${D.pays.slice(-8).reverse().map(p => { const x = D.list.find(y => y.id === p.debt); return `<div class="li">${icon('check', 16)}<div class="grow"><b>${rub(p.sum)}</b><small>${x ? esc(x.name) : 'удалённый долг'} · ${relDay(p.d)}</small></div>
    <button class="icon-btn sm plain" data-act="debtUnpay" data-id="${p.id}" aria-label="Отменить">${icon('undo', 15)}</button></div>`; }).join('')}</div></div>` : ''}
  ${closed.length ? `<div class="section-title"><h2>Закрытые долги</h2><small>трофеи</small></div>
  <div class="card"><div class="list">${closed.map(x => `<div class="li">${icon('trophy', 18)}<div class="grow"><b>${esc(x.name)}</b><small>${rub(x.total)} · закрыт ${fmtDay(x.closed, true)}</small></div></div>`).join('')}</div></div>` : ''}`;
};

/* этапы ударного режима дают опыт, как этапы воздержания */
function checkDebtHold() {
  if (!S.debts || !S.sections.some(s => s.type === 'debts' && !s.archived)) return;
  const h = S.debts.hold, n = debtHoldDays(); h.awarded ||= [];
  ABST_MS.forEach((m, i) => {
    if (n >= m && !h.awarded.includes(m)) {
      h.awarded.push(m);
      emit({ k: 'bonus', s: 'debts', stat: 'will', xp: 20 + i * 25, note: `Без новых долгов: ${m} ${pDays(m)}`, noMult: true });
      pushFx({ type: 'toast', icon: ABST_ICONS[i], title: `Ударный режим: ${m} ${pDays(m)}`, text: `Без новых долгов · +${20 + i * 25} XP` });
    }
  });
  h.best = Math.max(h.best || 0, n);
}
function holdReset() {
  const h = S.debts.hold, n = debtHoldDays();
  h.best = Math.max(h.best || 0, n); h.resets.push({ d: today(), days: n }); h.start = today(); h.awarded = [];
}

function debtForm(x) {
  const isNew = !x; x ||= { name: '', total: '', left: '', pay: '', next: '', monthly: true, note: '' };
  return `${modalHead(isNew ? 'Новый долг' : 'Долг', 'Кредит, рассрочка, кредитка или долг человеку')}
  <form data-form="saveDebt" class="form-grid"><input type="hidden" name="id" value="${x.id || ''}">
    <label class="field full"><span>Кому / за что</span><input class="input" name="name" value="${esc(x.name)}" placeholder="Например: рассрочка за телефон" required maxlength="40" autofocus></label>
    <label class="field"><span>Сумма долга, ₽</span><input class="input" type="number" name="total" min="1" step="1" value="${x.total}" required></label>
    <label class="field"><span>Осталось отдать, ₽</span><input class="input" type="number" name="left" min="0" step="1" value="${x.left}" placeholder="если меньше суммы"></label>
    <label class="field"><span>Платёж в месяц, ₽</span><input class="input" type="number" name="pay" min="0" step="1" value="${x.pay || ''}" placeholder="необязательно"></label>
    <label class="field"><span>Дата платежа</span><input class="input" type="date" name="next" value="${x.next || ''}"></label>
    <label class="field full row" style="gap:10px;cursor:pointer"><input type="checkbox" name="monthly" ${x.monthly ? 'checked' : ''} style="width:18px;height:18px;accent-color:#fff"><span style="margin:0">Платёж каждый месяц — после оплаты дата сдвинется на месяц</span></label>
    <label class="field full"><span>Заметка</span><input class="input" name="note" value="${esc(x.note || '')}" maxlength="40" placeholder="например: Сбер, карта *1234"></label>
    ${isNew ? `<label class="field full row callout" style="gap:10px;cursor:pointer"><input type="checkbox" name="fresh" style="width:18px;height:18px;accent-color:#fff"><span style="margin:0">Это новый долг — взял только что (ударный режим начнётся заново)</span></label>` : ''}
    <div class="modal-f full">${isNew ? '' : `<button type="button" class="btn danger" data-act="delDebt" data-id="${x.id}" style="margin-right:auto">${icon('trash', 15)} Удалить</button>`}<button class="btn primary">Сохранить</button></div></form>`;
}
ACTIONS.newDebt = () => { openModal(debtForm()); return false; };
ACTIONS.editDebt = el => { openModal(debtForm(S.debts.list.find(x => x.id === el.dataset.id))); return false; };
FORMS.saveDebt = d => {
  const total = Math.max(1, +d.total || 0), left = d.left === '' ? total : clamp(+d.left || 0, 0, total);
  const data = { name: d.name.trim(), total, left, pay: Math.max(0, +d.pay || 0), next: d.next || '', monthly: !!d.monthly, note: (d.note || '').trim() };
  if (d.id) {
    const x = S.debts.list.find(y => y.id === d.id); Object.assign(x, data);
    if (x.left > 0) x.closed = null;
  } else {
    S.debts.list.push({ id: uid(), created: today(), closed: null, ...data });
    if (d.fresh) { holdReset(); toast({ icon: 'refresh', title: 'Ударный режим начат заново', text: 'Лучший результат сохранён. Новый отсчёт — с сегодняшнего дня.' }); }
  }
  closeModal(true); saveState();
};
ACTIONS.delDebt = async el => {
  closeModal(true);
  if (!await confirmDialog({ title: 'Удалить долг?', text: 'Он исчезнет из списка и из общей суммы. Опыт за платежи останется.', ok: 'Удалить', danger: true })) return false;
  S.debts.list = S.debts.list.filter(x => x.id !== el.dataset.id); saveState();
};
ACTIONS.debtSlip = async () => {
  const n = debtHoldDays();
  const ok = await confirmDialog({ title: 'Взял новый долг?', text: `Бывает. ${n} ${pDays(n)} не пропадут — лучший результат сохранится. Не забудь добавить новый долг в список, чтобы общая сумма была честной.`, ok: 'Начать отсчёт заново' });
  if (!ok) return false;
  holdReset(); saveState();
  openModal(debtForm());
};

ACTIONS.debtPay = el => {
  const x = S.debts.list.find(y => y.id === el.dataset.id);
  openModal(`${modalHead('Платёж', esc(x.name) + ' · осталось ' + rub(x.left))}
    <form data-form="debtPay" class="form-grid"><input type="hidden" name="id" value="${x.id}">
      <label class="field"><span>Сколько внёс, ₽</span><input class="input" type="number" name="sum" min="1" step="1" value="${Math.min(x.pay || x.left, x.left)}" required autofocus></label>
      <div class="field" style="align-self:end"><button class="btn primary block">Ударить дракона</button></div></form>`);
  return false;
};
FORMS.debtPay = d => {
  const x = S.debts.list.find(y => y.id === d.id), amt = clamp(Math.round(+d.sum || 0), 1, x.left);
  closeModal(true);
  const ev = tracker('debts', clamp(15 + Math.round(Math.sqrt(amt) / 3), 15, 80), `Платёж: ${x.name}`, ['debt']);
  S.debts.pays.push({ id: uid(), debt: x.id, d: today(), sum: amt, ev: ev && ev.id, next: x.next });
  x.left -= amt;
  if (x.monthly && x.next && diffDays(today(), x.next) <= 20) x.next = addMonth(x.next);
  autoQuest('debtPay');
  if (x.left <= 0) {
    x.left = 0; x.closed = today();
    emit({ k: 'bonus', s: 'debts', stat: 'will', xp: 150, note: `Долг закрыт: ${x.name}`, noMult: true });
    autoQuest('debtClose');
    pushFx({ type: 'toast', icon: 'trophy', title: 'Долг закрыт!', text: `${x.name} · ${rub(x.total)} · +150 XP` });
    if (!debtOpen().length) pushFx({ type: 'toast', icon: 'crown', title: 'Дракон повержен', text: 'Ты свободен от всех долгов.' });
  } else toast({ icon: 'zap', title: `−${rub(amt)} дракону`, text: `${x.name}: осталось ${rub(x.left)}` });
  afterChange();
};
ACTIONS.debtUnpay = async el => {
  const p = S.debts.pays.find(y => y.id === el.dataset.id); if (!p) return false;
  if (!await confirmDialog({ title: 'Отменить платёж?', text: `${rub(p.sum)} вернутся в остаток долга, опыт за платёж снимется.`, ok: 'Отменить платёж' })) return false;
  const x = S.debts.list.find(y => y.id === p.debt);
  if (x) { x.left = Math.min(x.total, x.left + p.sum); if (x.closed) { x.closed = null; const b = S.events.find(e => e.note === `Долг закрыт: ${x.name}` && e.k === 'bonus'); if (b) removeEvent(b); } if (p.next) x.next = p.next; }
  const ev = S.events.find(e => e.id === p.ev); if (ev) removeEvent(ev);
  S.debts.pays = S.debts.pays.filter(y => y !== p);
  afterChange();
};
