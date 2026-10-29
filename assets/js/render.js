/* ============================================================
   ANTI-ZERG — рендер страниц
   ============================================================ */

const $ = id => document.getElementById(id);

/* ---------- составы ---------- */

function renderSquads(host, squads, withGs) {
  if (!squads.length) {
    host.innerHTML = '<div class="state">В таблице пока нет заполненных пачек.</div>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'squad-grid';

  squads.forEach((sq, idx) => {
    const card = document.createElement('section');
    card.className = 'squad fade-up';
    card.style.animationDelay = `${Math.min(idx * 40, 320)}ms`;

    const hue = sq.num ? (parseInt(sq.num, 10) * 43) % 360 : 215;
    card.style.setProperty('--h', hue);

    const head = document.createElement('div');
    head.className = 'squad__head';
    head.innerHTML = `
      <span class="squad__num">${esc(sq.num || '—')}</span>
      <span class="squad__name">${esc(sq.name)}</span>
      <span class="squad__count">${sq.members.filter(m => m.nick).length} чел.</span>`;
    card.appendChild(head);

    const rows = document.createElement('div');
    rows.className = 'squad__rows';

    sq.members.forEach((m, i) => {
      const row = document.createElement('div');
      row.className = 'row' + (withGs ? ' is-gs' : '') + (m.nick ? '' : ' row--empty');
      const gsCell = withGs
        ? `<span class="row__gs">${m.gs ? esc(m.gs) : '—'}</span>`
        : '';
      row.innerHTML = `
        <span class="row__i">${i + 1}</span>
        <span class="row__nick${m.nick ? '' : ' is-empty'}">${m.nick ? esc(m.nick) : 'свободно'}</span>
        ${classBadge(m.cls)}
        ${gsCell}`;
      rows.appendChild(row);
    });

    card.appendChild(rows);
    grid.appendChild(card);
  });

  host.innerHTML = '';
  host.appendChild(grid);
}

/* ---------- таблица записей ---------- */

function renderRecords(host, records, opts = {}) {
  if (!records.length) {
    host.innerHTML = '<div class="state">В таблице пока нет данных.</div>';
    return;
  }

  const mark = opts.targetMark
    ? '<span class="mark mark--t">◎</span>'
    : '<span class="mark mark--x">✕</span>';

  const rows = records.map(r => `
    <tr>
      <td class="num"></td>
      <td class="nick">${mark}${esc(r.nick)}</td>
      <td>${classBadge(r.cls, true)}</td>
      <td class="reason">${r.reason ? esc(r.reason) : '—'}</td>
    </tr>`).join('');

  host.innerHTML = `
    <div class="panel">
      <div class="table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th></th>
              <th>Никнейм</th>
              <th>${opts.setupLabel || 'Класс'}</th>
              <th>${opts.reasonLabel || 'Комментарий'}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

/* ---------- стратегия ---------- */

function renderStrategy(host, records) {
  if (!records.length) {
    host.innerHTML = '<div class="state">В таблице пока нет данных.</div>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'strategy-list';

  records.forEach((r, idx) => {
    const card = document.createElement('article');
    card.className = 'scard fade-up';
    card.style.animationDelay = `${Math.min(idx * 50, 400)}ms`;

    const t1 = r.t1
      ? `<span class="target target--1"><span class="target__lbl">цель 1</span>${esc(r.t1)}</span>`
      : '';
    const t2 = r.t2
      ? `<span class="target target--2"><span class="target__lbl">цель 2</span>${esc(r.t2)}</span>`
      : '';
    const sep = t1 && t2 ? '<span class="target-sep">→</span>' : '';
    const targets = (t1 || t2)
      ? t1 + sep + t2
      : '<span class="target-sep">свободная охота</span>';

    card.innerHTML = `
      <div class="scard__top">
        <span class="scard__group">${esc(r.group)}</span>
        ${r.comp ? `<span class="scard__comp">${esc(r.comp)}</span>` : ''}
        ${r.squads ? `<span class="scard__squads">${esc(r.squads)}</span>` : ''}
      </div>
      <div class="scard__body">
        <div class="targets">${targets}</div>
        <div class="scard__notes${r.notes ? '' : ' is-empty'}">${r.notes ? esc(r.notes) : 'без пояснения'}</div>
      </div>`;

    list.appendChild(card);
  });

  host.innerHTML = '';
  host.appendChild(list);
}

/* ---------- диаграмма связей ---------- */

const NODE_W = 216;
const NODE_H = 62;
const COL_X = [24, 388, 752];
const BAND = 128;
const PAD_T = 16;

function wrapText(str, max) {
  const words = String(str).split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach(w => {
    if (!line.length) line = w;
    else if ((line + ' ' + w).length <= max) line += ' ' + w;
    else { lines.push(line); line = w; }
  });
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function nodeMarkup(col, row, lines, cls, shared) {
  const x = COL_X[col];
  const y = PAD_T + row * BAND;
  const badge = cls
    ? `<span class="dg-badge dg-${classKind(cls)}">${esc(cls)}</span>`
    : '';
  const count = shared > 1
    ? `<span class="dg-count">×${shared}</span>`
    : '';

  const inner = lines
    .map(l => `<div class="dg-line">${esc(l)}</div>`)
    .join('');

  return `
    <foreignObject x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}">
      <div xmlns="http://www.w3.org/1999/xhtml" class="dg-node${shared > 1 ? ' dg-node--shared' : ''}">
        <div class="dg-title">${inner}</div>
        ${badge}
        ${count}
      </div>
    </foreignObject>`;
}

function arrowMarkup(x1, y1, x2, y2) {
  const bend = Math.max(38, Math.abs(x2 - x1) * 0.45);
  const d = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
  return `<path d="${d}" class="dg-arrow" marker-end="url(#dg-arrowhead)"/>`;
}

function renderDiagram(host, records, nameMap) {
  if (!records.length) {
    host.innerHTML = '<div class="state">Нечего строить: лист стратегии пуст.</div>';
    return;
  }

  const counts = new Map();
  records.forEach(r => [r.t1, r.t2].forEach(t => {
    if (!t) return;
    const k = t.toLowerCase();
    counts.set(k, (counts.get(k) || 0) + 1);
  }));

  let svg = '';
  let band = 0;

  records.forEach(r => {
    const row = band++;

    const squadLines = wrapText(r.squads || r.group, 22);
    svg += nodeMarkup(0, row, squadLines, '', 1);

    if (r.t1) {
      const cls = nameMap.get(r.t1.toLowerCase());
      const shared = counts.get(r.t1.toLowerCase()) || 1;
      svg += nodeMarkup(1, row, wrapText(r.t1, 20), cls, shared);
      svg += arrowMarkup(COL_X[0] + NODE_W + 8, PAD_T + row * BAND + NODE_H / 2,
                         COL_X[1] - 8,       PAD_T + row * BAND + NODE_H / 2);
    }
    if (r.t2) {
      const cls = nameMap.get(r.t2.toLowerCase());
      const shared = counts.get(r.t2.toLowerCase()) || 1;
      svg += nodeMarkup(2, row, wrapText(r.t2, 20), cls, shared);
      const fromCol = r.t1 ? 1 : 0;
      const fromX = COL_X[fromCol] + NODE_W + 8;
      svg += arrowMarkup(fromX, PAD_T + row * BAND + NODE_H / 2,
                         COL_X[2] - 8, PAD_T + row * BAND + NODE_H / 2);
    }
  });

  const height = PAD_T * 2 + band * BAND + 8;
  const width = COL_X[2] + NODE_W + 24;

  host.innerHTML = `
    <div class="diagram">
      <div class="diagram__head">
        <h2>Связи целей</h2>
        <span class="diagram__hint">двойка → цель 1 → цель 2</span>
      </div>
      <div class="diagram__canvas">
        <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Схема связей целей">
          <defs>
            <marker id="dg-arrowhead" viewBox="0 0 10 10" refX="8" refY="5"
                    markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" class="dg-head"/>
            </marker>
          </defs>
          ${svg}
        </svg>
      </div>
    </div>`;
}

/* ---------- общий запуск страницы ---------- */

async function initPage(key) {
  const host = $('content');
  const countEl = $('count');

  try {
    if (key === 'strategy') {
      const [rows] = await Promise.all([fetchSheet('strategy')]);
      const records = parseStrategy(rows);
      renderStrategy(host, records);
      if (countEl) countEl.textContent = `${records.length} двоек`;

      const { map } = await buildNameMap();
      const holder = document.createElement('div');
      renderDiagram(holder, records, map);
      host.appendChild(holder.firstElementChild || holder);
      return;
    }

    if (key === 'blacklist' || key === 'targets') {
      const rows = await fetchSheet(key);
      const records = parseRecords(rows);
      renderRecords(host, records, {
        targetMark: key === 'targets',
        setupLabel: 'Сетап',
        reasonLabel: key === 'targets' ? 'Причина' : 'Комментарий'
      });
      if (countEl) countEl.textContent = `${records.length} чел.`;
      return;
    }

    const meta = SHEETS[key];
    const squads = parseGrid(await fetchSheet(key));
    renderSquads(host, squads, meta.gs);
    if (countEl) {
      const people = squads.reduce((n, s) => n + s.members.filter(m => m.nick).length, 0);
      countEl.textContent = `${squads.length} пачек · ${people} чел.`;
    }
  } catch (err) {
    host.innerHTML = `<div class="state state--error">
      Не удалось загрузить данные: ${esc(err.message)}<br>
      Проверь, что таблица опубликована в интернете.</div>`;
  }
}
