/* Главный экран */
'use strict';

function greetingWord() {
  const h = new Date().getHours();
  return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
}

function renderHome() {
  const t = today(), nm = S.profile.name || 'Герой';
  const last = lastActiveDay(t);
  const d = new Date();
  return `
  <div class="page-h">
    <div>
      <div class="eyebrow"><span class="live"></span>Последняя активность: ${(S.days[t] || {}).acts ? 'сегодня' : last ? relDay(last) : 'ещё впереди'}</div>
      <h1>С возвращением,<br><em>${esc(nm)}</em></h1>
      <p>${greetingWord()} · ${WD_LONG[d.getDay()]}, ${fmtDay(t)}</p>
    </div>
    <div class="row wrap d-only">
      <span class="chip">${icon('zap', 14)} Множитель <b>×${String(xpMultiplier()).replace('.', ',')}</b></span>
      <span class="chip">${icon('shield', 14)} Щиты <b>${S.momentum.shields}/${S.settings.maxShields}</b></span>
    </div>
  </div>
  ${homeAlerts()}
  <div class="grid g-hero">
    ${momentumCard()}
    <div class="m-block">${todayCard()}</div>
    ${levelCard()}
  </div>
  <div class="grid g-main mt">
    <div class="stack">
      <div class="d-block">${todayCard()}</div>
      ${challengeCard()}
      ${weeklyQuestsCard()}
    </div>
    <div class="stack">
      ${weekCard()}
      ${arenaPreview()}
      ${statsMini()}
    </div>
  </div>`;
}

function homeAlerts() {
  const m = S.momentum, out = [];
  if (m.broken && addDays(m.broken.day, 1) === today()) {
    const need = restoreNeed(), have = (S.days[today()] || {}).acts || 0;
    out.push(`<div class="card mb glow" style="--cg:rgba(240,200,144,.25)">
      <div class="row wrap between">
        <div class="row" style="align-items:flex-start;gap:14px"><div class="ico-box tint" style="--ic:var(--warn)">${icon('flame', 18)}</div>
          <div><b style="font-weight:500">Импульс в ${m.broken.prev} ${pDays(m.broken.prev)} можно вернуть</b>
          <div class="muted" style="font-size:13px;margin-top:2px">Вчера не было отметок, а щитов не осталось. Выполни сегодня двойную норму — ${need} ${plural(need, ['задание', 'задания', 'заданий'])}, и серия восстановится.</div></div></div>
        <div style="min-width:160px"><div class="row between"><span class="label">Прогресс</span><b class="num" style="font-size:18px">${Math.min(have, need)}/${need}</b></div><div class="mt" style="margin-top:8px">${bar(have / need, 'restore', { cls: 'thin' })}</div></div>
      </div></div>`);
  }
  if (comebackActive()) {
    const n = diffDays(S.comeback.start, today()) + 1;
    out.push(`<div class="callout acc mb">${icon('sun', 18)}<div><b>План возвращения · день ${n} из 3.</b> Опыт идёт с бонусом ×1,5. ${n === 1 ? 'Сегодня достаточно одного задания.' : n === 2 ? 'Сегодня — два задания из любимого раздела.' : 'Сегодня — половина ежедневных заданий.'}</div></div>`);
  }
  return out.join('');
}

function momentumCard() {
  const s = momentumStreak(), tier = momentumTier(s), nt = nextMomentumTier(s), m = S.momentum;
  const nm = nextMultiplier(s), mult = multiplierFor(s);
  const prevMin = tier.min, pct = nt ? (s - prevMin) / (nt.min - prevMin) : 1;
  const todayOn = !!m.cover[today()];
  const shields = Array.from({ length: S.settings.maxShields }, (_, i) => `<span style="color:${i < m.shields ? 'var(--text)' : 'var(--faint)'}">${icon('shield', 16)}</span>`).join('');
  return `<div class="card glow" style="--cg:rgba(220,160,210,${0.12 + tier.lvl * 0.06})">
    <div class="card-h"><h3>${icon('flame', 18)} Импульс</h3>
      <div class="row">${todayOn ? '<span class="delta up">Сегодня засчитан</span>' : '<span class="delta warn">Ждёт отметки</span>'}</div></div>
    <div class="momentum">
      <div class="orb" data-lvl="${tier.lvl}" style="--lvl:${tier.lvl}">
        ${ring(pct, { size: window.innerWidth < 900 ? 112 : 132, stroke: 3, key: 'momentum-ring', color: 'rgba(255,255,255,.85)', track: 'rgba(255,255,255,.06)' })}
        <div class="orb-core" style="width:72%;height:72%">${icon('flame', 40)}</div>
      </div>
      <div class="grow">
        <div class="num num-xl">${s}<span class="u">${pDays(s)}</span></div>
        <div class="row wrap" style="margin-top:12px">
          <span class="chip"><b>${tier.name}</b></span>
          <span class="chip">${icon('zap', 13)} ×${String(mult).replace('.', ',')}</span>
          <span class="chip" title="Щиты">${shields}</span>
        </div>
        <div class="sub" style="margin-top:10px">${nm ? `Ещё ${nm.left} ${pDays(nm.left)} до множителя ×${String(nm.mult).replace('.', ',')}` : 'Максимальный множитель ×2'} · Лучшая серия: ${m.best}</div>
      </div>
    </div>
    <div class="mstages">${[[1, 'Искра'], [7, '7'], [30, '30'], [100, '100'], [365, '365']].map(([n, l]) => `<div class="mstage ${s >= n ? 'on' : ''}"><i></i>${l}</div>`).join('')}</div>
    <div class="hr"></div>
    <div class="row between mb" style="margin-bottom:10px"><span class="label">Последние 28 дней</span><span class="sub d-only">${chainLegend()}</span></div>
    ${chainRow(28)}
  </div>`;
}
function chainLegend() { return 'щит — пунктир · ● идеальный день'; }
function chainRow(n) {
  const t = today(), c = S.momentum.cover;
  let html = '';
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(t, -i), v = c[d], r = S.days[d] || {};
    html += `<i class="${v === 'active' ? 'on' : v === 'shield' ? 'sh' : v === 'restored' ? 'rs' : ''} ${r.perfect ? 'pf' : ''} ${d === t ? 'td' : ''}" title="${fmtDay(d)}${v === 'shield' ? ' · щит' : v === 'restored' ? ' · восстановлен' : ''}${r.perfect ? ' · идеальный день' : ''}"></i>`;
  }
  return `<div class="chain">${html}</div>`;
}

function levelCard() {
  const li = levelInfo(), t = today();
  const todayXp = xpOn(t), yXp = xpOn(addDays(t, -1));
  const nt = nextTitle(li.level);
  const top = STATS.map(s => ({ ...s, xp: S.statXp[s.id] || 0 })).sort((a, b) => b.xp - a.xp).slice(0, 3);
  return `<div class="card">
    <div class="card-h"><h3>${icon('user', 18)} Персонаж</h3><span class="lvl-badge"><i>${li.level}</i>${esc(currentTitle())}</span></div>
    <div class="hero-xp">
      <div><div class="label">Всего опыта</div><div class="num num-l" style="margin-top:8px">${fmtNum(S.xp)}<span class="u">XP</span></div></div>
      <div style="text-align:right"><div class="label">Сегодня</div><div class="row" style="justify-content:flex-end;margin-top:8px"><span class="num num-s">+${fmtNum(todayXp)}</span>${yXp ? deltaBadge((todayXp - yXp) / yXp * 100) : ''}</div></div>
    </div>
    <div class="mt2">${bar(li.pct, 'level-xp', { cls: 'thick acc' })}</div>
    <div class="row between" style="margin-top:10px"><span class="sub">Уровень ${li.level} → ${li.level + 1}</span><span class="sub">${fmtNum(li.into)} / ${fmtNum(li.need)} XP</span></div>
    ${nt ? `<div class="sub" style="margin-top:4px">Следующий титул «${nt.name}» — на ${nt.level} уровне</div>` : ''}
    <div class="hr"></div>
    ${top.map(s => `<div class="stat-row"><span class="dim">${icon(s.icon, 18)}</span><b>${s.name}</b><span class="sub">ур. ${statLevel(s.xp)}</span>${bar(statProgress(s.xp), 'stat-' + s.id, { cls: 'thin' })}</div>`).join('')}
  </div>`;
}

function todayCard() {
  const dq = dailyQuests(), done = dq.filter(x => questStatus(x).done).length;
  const perfect = (S.days[today()] || {}).perfect;
  const secs = visibleSections();
  const groups = secs.map(s => ({ s, qs: dq.filter(x => x.sectionId === s.id) })).filter(g => g.qs.length);
  return `<div class="card">
    <div class="card-h">
      <h3>${icon('check', 18)} Задания на сегодня</h3>
      <div class="row">${perfect ? '<span class="delta acc">Идеальный день</span>' : `<span class="sub">${dq.length - done ? `осталось ${dq.length - done}` : ''}</span>`}
        ${ring(dq.length ? done / dq.length : 0, { size: 40, stroke: 3.5, key: 'today-ring', center: `<span style="font-size:11px;font-weight:500">${done}/${dq.length}</span>` })}</div>
    </div>
    ${dq.length ? `<div class="quests">${groups.map(g => g.qs.map(qq => questRow(qq, { showSection: true, just: justQuest })).join('')).join('')}</div>`
      : emptyState('check', 'Ежедневных заданий пока нет', '<button class="btn sm" data-act="nav" data-to="sections">Открыть разделы</button>')}
    ${!perfect && dq.length && done ? `<div class="sub mt">${done === dq.length - 1 ? 'Последнее задание — и день станет идеальным (+50 XP)' : 'Выполни все задания, чтобы день стал идеальным: +50 XP и отметка в календаре'}</div>` : ''}
  </div>`;
}

function challengeCard() {
  const c = todayChallenge(), sec = c.sectionId ? sectionById(c.sectionId) : null;
  return `<div class="card glow-b" style="--cg:rgba(200,150,200,.22)">
    <div class="challenge">
      <div class="ico-box">${icon('zap', 20)}</div>
      <div class="grow"><div class="label">Испытание дня${sec ? ' · ' + esc(sec.name) : ''}</div><b style="font-weight:500;font-size:15px;display:block;margin-top:3px">${esc(c.text)}</b></div>
      <button class="btn ${c.done ? '' : 'primary'} sm" data-act="challenge">${c.done ? icon('check', 16) + ' Пройдено' : '+' + c.xp + ' XP'}</button>
    </div>
  </div>`;
}
ACTIONS.challenge = () => toggleChallenge();

function weeklyQuestsCard() {
  const vis = new Set(visibleSections().map(s => s.id));
  const wq = S.quests.filter(x => !x.archived && vis.has(x.sectionId) && (x.kind === 'weekly' || (x.kind === 'goal' && !questStatus(x).done)));
  if (!wq.length) return '';
  return `<div class="card">
    <div class="card-h"><h3>${icon('calendar', 18)} Неделя и большие цели</h3><span class="sub">до ${fmtShort(addDays(weekStart(), 6))}</span></div>
    <div class="quests">${wq.map(qq => questRow(qq, { showSection: true, just: justQuest })).join('')}</div>
  </div>`;
}

function weekCard() {
  const w = weekSummary(), ws = weekStart();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i);
    return { v: xpOn(d), label: WD[i], cur: d === today(), title: fmtDay(d) };
  });
  const rankTxt = w.total < 2 ? 'Твоя первая неделя в игре' : w.rank === 1 ? 'Это твоя лучшая неделя' : `Это твоя ${w.rank}-я лучшая неделя из ${w.total}`;
  return `<div class="card">
    <div class="card-h"><h3>${icon('chart', 18)} Эта неделя</h3>${w.delta != null ? deltaBadge(w.delta) : ''}</div>
    <div class="row between" style="align-items:flex-end">
      <div><div class="num num-m">${fmtNum(w.cur)}<span class="u">XP</span></div><div class="sub" style="margin-top:6px">прошлая: ${fmtNum(w.prev)} XP</div></div>
      <span class="chip">${icon('trophy', 13)} ${w.rank ? '#' + w.rank : '—'}</span>
    </div>
    <div class="mt2">${bars(days, { h: 76 })}</div>
    <div class="hr"></div>
    <div class="kv"><div><small>Активных дней</small><b>${w.daysActive}<span class="dim" style="font-size:14px"> / 7</span></b></div><div><small>Заданий</small><b>${w.tasks}</b> ${w.prevTasks ? deltaBadge(w.tasks - w.prevTasks, { suffix: '' }) : ''}</div></div>
    <div class="sub mt">${rankTxt}</div>
  </div>`;
}

function arenaPreview() {
  const act = S.bosses.filter(b => b.status === 'active').slice(0, 2);
  return `<div class="card">
    <div class="card-h"><h3>${icon('swords', 18)} Арена</h3><button class="btn xs" data-act="nav" data-to="arena">Все боссы</button></div>
    ${act.length ? act.map(b => { const st = bossState(b); return `<div class="li click boss-card" data-boss="${b.id}" data-act="nav" data-to="boss/${b.id}" style="--bc:${b.color}">
        <div class="boss-emb" style="width:44px;height:44px;border-radius:14px">${icon(b.icon, 20)}</div>
        <div class="grow"><div class="row between"><b>${esc(b.name)}</b><span class="sub">${Math.round(st.pct * 100)}%</span></div>
          <div style="margin-top:8px">${bar(st.pct, 'bossp-' + b.id, { cls: 'hp thin' })}</div>
          <small>${st.daysLeft >= 0 ? `${st.daysLeft} ${pDays(st.daysLeft)} до срока` : 'срок прошёл'}</small></div></div>`; }).join('')
      : emptyState('swords', 'Большие цели становятся боссами.<br>Создай первого и бей его каждым действием.', '<button class="btn sm primary" data-act="nav" data-to="arena-new">Создать босса</button>')}
  </div>`;
}

function statsMini() {
  const from = addDays(today(), -83);
  return `<div class="card">
    <div class="card-h"><h3>${icon('calendar', 18)} Активность</h3><button class="btn xs" data-act="nav" data-to="stats">Статистика</button></div>
    ${heatmap(from, today(), d => { const r = S.days[d] || {}; const a = r.acts || 0; return { level: a === 0 ? 0 : a < 3 ? 1 : a < 6 ? 2 : a < 9 ? 3 : 4, perfect: r.perfect, title: a + ' действий' }; })}
  </div>`;
}
