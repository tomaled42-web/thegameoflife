/* Графики: линии с градиентом, кольца, тепловая карта, столбики */
'use strict';

const CHARTS = {};
const ANIM = {};   // память прошлых значений для плавных анимаций

/* монотонная кубическая интерполяция — без выбросов за данные */
function smoothPath(P) {
  const n = P.length;
  if (n === 0) return '';
  if (n === 1) return `M${P[0][0]},${P[0][1]}`;
  if (n === 2) return `M${P[0][0]},${P[0][1]}L${P[1][0]},${P[1][1]}`;
  const dx = [], dy = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = P[i + 1][0] - P[i][0]; dy[i] = P[i + 1][1] - P[i][1]; m[i] = dx[i] ? dy[i] / dx[i] : 0; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(P[i][0] + h).toFixed(1)},${(P[i][1] + t[i] * h).toFixed(1)} ${(P[i + 1][0] - h).toFixed(1)},${(P[i + 1][1] - t[i + 1] * h).toFixed(1)} ${P[i + 1][0].toFixed(1)},${P[i + 1][1].toFixed(1)}`;
  }
  return d;
}

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min, step0 = span / count, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= step0) || step0;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
}

/**
 * lineChart({ id, series:[{pts:[{x,y,label}], color, fill, dashed, dots, name}], h, yFmt, xFmt, tipFmt, zeroBase })
 * x — числовая ось (обычно индекс дня); подписи X задаются xFmt.
 */
function lineChart(o) {
  const W = 1000, H = o.h || 200, padT = 12, padB = 6;
  const all = o.series.flatMap(s => s.pts);
  if (!all.length) return `<div class="chart-empty">${o.empty || 'Пока нет данных — первая запись появится здесь'}</div>`;
  let xmin = Math.min(...all.map(p => p.x)), xmax = Math.max(...all.map(p => p.x));
  if (xmin === xmax) { xmin -= 1; xmax += 1; }
  let ymin = Math.min(...all.map(p => p.y)), ymax = Math.max(...all.map(p => p.y));
  if (o.zeroBase) ymin = Math.min(0, ymin);
  const pad = (ymax - ymin) * 0.12 || 1; if (!o.zeroBase) ymin -= pad; ymax += pad;
  const nt = niceTicks(ymin, ymax, 4); ymin = nt.lo; ymax = nt.hi;
  const X = x => (x - xmin) / (xmax - xmin) * W;
  const Y = y => padT + (1 - (y - ymin) / (ymax - ymin)) * (H - padT - padB);
  const gid = 'g' + o.id;
  let defs = '', paths = '';
  o.series.forEach((s, i) => {
    if (!s.pts.length) return;
    const P = s.pts.map(p => [X(p.x), Y(p.y)]);
    const d = smoothPath(P);
    const color = s.color || 'var(--text)';
    if (s.fill) {
      defs += `<linearGradient id="${gid}${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".16"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`;
      paths += `<path d="${d}L${P[P.length - 1][0]},${H}L${P[0][0]},${H}Z" fill="url(#${gid}${i})" stroke="none"/>`;
    }
    paths += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${s.width || 1.6}" ${s.dashed ? 'stroke-dasharray="4 5"' : ''} vector-effect="non-scaling-stroke" stroke-linecap="round" class="ln" style="opacity:${s.opacity || 1}"/>`;
  });
  const grid = nt.ticks.map(v => `<div class="cg" style="top:${Y(v) / H * 100}%"><span>${(o.yFmt || fmtNum)(v)}</span></div>`).join('');
  const dots = o.series.flatMap((s, i) => s.dots ? s.pts.map(p => `<i class="cdot" style="left:${X(p.x) / W * 100}%;top:${Y(p.y) / H * 100}%;--c:${s.color || 'var(--text)'}"></i>`) : []).join('');
  let xl = '';
  if (o.xLabels) xl = `<div class="cx">${o.xLabels.map(l => `<span style="left:${X(l.x) / W * 100}%">${l.text}</span>`).join('')}</div>`;
  CHARTS[o.id] = { o, X, Y, W, H, xmin, xmax };
  return `<div class="chart" data-chart="${o.id}" style="--h:${H}px">
    <div class="cgrid">${grid}</div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs>${defs}</defs>${paths}</svg>
    ${dots}
    <div class="ccur"><i class="cline"></i><i class="cpt"></i><div class="ctip"></div></div>
  </div>${xl}`;
}

function chartPointer(el, clientX) {
  const c = CHARTS[el.dataset.chart]; if (!c) return;
  const r = el.getBoundingClientRect();
  const fx = clamp((clientX - r.left) / r.width, 0, 1);
  const x = c.xmin + fx * (c.xmax - c.xmin);
  const s = c.o.series.find(s => s.tip !== false && s.pts.length) || c.o.series[0];
  let best = s.pts[0];
  for (const p of s.pts) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
  const cur = el.querySelector('.ccur');
  cur.style.display = 'block';
  const left = c.X(best.x) / c.W * 100, top = c.Y(best.y) / c.H * 100;
  cur.querySelector('.cline').style.left = left + '%';
  const pt = cur.querySelector('.cpt'); pt.style.left = left + '%'; pt.style.top = top + '%';
  pt.style.setProperty('--c', s.color || 'var(--text)');
  const tip = cur.querySelector('.ctip');
  tip.innerHTML = c.o.tipFmt ? c.o.tipFmt(best, c.o.series) : `<b>${fmtNum(best.y, 1)}</b>`;
  tip.style.left = clamp(left, 14, 86) + '%';
  tip.style.top = Math.max(0, top - 4) + '%';
}

/* кольцевой индикатор */
function ring(pct, o = {}) {
  const size = o.size || 120, sw = o.stroke || 8, r = (size - sw) / 2 - 1, C = 2 * Math.PI * r;
  const p = clamp(pct || 0, 0, 1), key = o.key;
  const from = key && ANIM[key] != null ? ANIM[key] : (key ? 0 : p);
  if (key) ANIM[key] = p;
  const seg = o.segments ? Array.from({ length: o.segments }, (_, i) => {
    const a = (i / o.segments) * 360 - 90;
    return `<line x1="${size / 2}" y1="${sw / 2 - 1}" x2="${size / 2}" y2="${sw * 1.6}" transform="rotate(${a + 90} ${size / 2} ${size / 2})" stroke="var(--bg)" stroke-width="2"/>`;
  }).join('') : '';
  return `<div class="ring ${o.cls || ''}" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${o.glow ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${o.color || 'var(--text)'}" stroke-width="${sw + 8}" opacity=".08" stroke-dasharray="${C * p} ${C}" transform="rotate(-90 ${size / 2} ${size / 2})" style="filter:blur(6px)"/>` : ''}
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${o.track || 'rgba(255,255,255,.07)'}" stroke-width="${sw}"/>
      <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${o.color || 'var(--text)'}" stroke-width="${sw}" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - from)}" data-to="${C * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      ${seg}
    </svg>
    <div class="ring-c">${o.center || ''}</div>
  </div>`;
}

/* горизонтальная шкала с анимацией */
function bar(pct, key, o = {}) {
  const p = clamp(pct || 0, 0, 1) * 100;
  const from = key && ANIM[key] != null ? ANIM[key] : (o.instant ? p : 0);
  if (key) ANIM[key] = p;
  return `<div class="bar ${o.cls || ''}" ${o.style ? `style="${o.style}"` : ''}><i style="width:${from}%;${o.color ? `background:${o.color};` : ''}" data-w="${p}"></i></div>`;
}

/* тепловая карта активности */
function heatmap(from, to, valueOf, o = {}) {
  const start = weekStart(from), cells = [];
  let monthMarks = '', lastM = -1, col = 0;
  for (let w = start; w <= to; w = addDays(w, 7), col++) {
    const m = parseDay(w).getMonth();
    if (m !== lastM) { monthMarks += `<span style="grid-column:${col + 1}">${MONTHS_SHORT[m]}</span>`; lastM = m; }
    for (let i = 0; i < 7; i++) {
      const d = addDays(w, i);
      if (d < from || d > to) { cells.push('<i class="hm-x"></i>'); continue; }
      const v = valueOf(d);
      cells.push(`<i class="hm-${v.level}${v.perfect ? ' hm-p' : ''}${d === today() ? ' hm-t' : ''}" title="${fmtDay(d)}${v.title ? ' · ' + v.title : ''}"></i>`);
    }
  }
  return `<div class="hm-wrap"><div class="hm-months" style="grid-template-columns:repeat(${col},var(--hm))">${monthMarks}</div>
    <div class="hm" style="grid-template-columns:repeat(${col},var(--hm))">${cells.join('')}</div></div>`;
}

/* столбики (недели, дни) */
function bars(items, o = {}) {
  const max = Math.max(1, ...items.map(i => i.v));
  return `<div class="bars" style="--bh:${o.h || 90}px">${items.map((i, k) => `<div class="bars-c ${i.cur ? 'cur' : ''}" title="${esc(i.title || '')}">
    <div class="bars-v"><i style="height:${Math.max(2, i.v / max * 100)}%;${i.color ? `background:${i.color}` : ''}"></i></div>
    <span>${i.label}</span></div>`).join('')}</div>`;
}

/* мини-график без осей */
function sparkline(vals, o = {}) {
  if (vals.length < 2) return '';
  const W = 120, H = o.h || 36, mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1;
  const P = vals.map((v, i) => [i / (vals.length - 1) * W, 3 + (1 - (v - mn) / sp) * (H - 6)]);
  const d = smoothPath(P), c = o.color || 'var(--text)', id = 'sp' + uid();
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
    <path d="${d}L${W},${H}L0,${H}Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${c}" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}
