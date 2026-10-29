/* ============================================================
   ANTI-ZERG — данные: Google Sheets, парсер CSV, классы
   ============================================================ */

const PUB_KEY = '2PACX-1vSAdKvnDfusW0YrdnJgV3Wd3swPgFvKJRmSSQ1zc0aN2mxuBPpu2DvqzSwDnJqPeBHvFFV57e_ZJnR8';

const SHEETS = {
  qwe:       { gid: '1505585512', title: 'QWE',       gs: true  },
  dd:        { gid: '643049503',  title: 'DD',        gs: true  },
  dark1:     { gid: '993416369',  title: '1DARKNES',  gs: false },
  dark11:    { gid: '1257870261', title: '11DARKNES', gs: false },
  blacklist: { gid: '0',          title: 'Антиприоритетные таргеты' },
  targets:   { gid: '1730228249', title: 'Приоритетные таргеты' },
  strategy:  { gid: '2058197677', title: 'Стратегия / Пояснение' }
};

const sheetUrl = gid =>
  `https://docs.google.com/spreadsheets/d/e/${PUB_KEY}/pub?output=csv&gid=${gid}&cb=${Date.now()}`;

/* ---------- CSV ---------- */

function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', q = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += c;
      continue;
    }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const clean = v => (v || '').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
const norm  = v => clean(v).toLowerCase().replace(/[\s/\\|.\-]+/g, '');

async function fetchSheet(key) {
  const res = await fetch(sheetUrl(SHEETS[key].gid), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Google Sheets ответил ${res.status}`);
  return parseCSV(await res.text());
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- классы ---------- */

const NICK_KEYS = ['nickname', 'nick', 'никнейм', 'ник', 'имя'];
const CLS_KEYS  = ['class', 'класс', 'специализация', 'роль'];
const GS_KEYS   = ['gs', 'гирскор', 'гс'];
const TXT_KEYS  = ['comment', 'комментарий', 'коммент', 'заметка', 'notes',
                   'setup', 'сетап', 'причина', 'reason', 'сетап/причина'];

const isNickKey = v => NICK_KEYS.includes(norm(v));
const isClsKey  = v => CLS_KEYS.includes(norm(v));
const isGsKey   = v => GS_KEYS.includes(norm(v));
const isTxtKey  = v => TXT_KEYS.includes(norm(v));
const isHeaderKey = v => isNickKey(v) || isClsKey(v) || isGsKey(v) || isTxtKey(v)
  || ['group', 'группа', 'двойка', 'пачка', 'squads', 'target1', 'target2'].includes(norm(v));

/* все связки оружия */
const WEAPONS = [
  'SNS', 'GS', 'SPEAR', 'DAGGER', 'BOW', 'WAND', 'STAFF', 'XBOW', 'CROSSBOW',
  'HALBERD', 'SHIELD', 'HOLY', 'NATURE', 'ARCANE', 'FIRE', 'FROST', 'CURSE', 'GLAIVE',
  'КОРД', 'ЛУК', 'ЖЕЗЛ', 'КОПЬЁ', 'КОПЬЕ', 'ЩИТ', 'КИНЖАЛ', 'МЕЧ', 'АРБАЛЕТ', 'ПОСОХ'
];

function looksLikeClass(cls) {
  const t = clean(cls).toUpperCase();
  if (!t || t.length > 28) return false;
  return WEAPONS.some(w => t.includes(w));
}

/* dd — оранжевый · tank — синий · heal — зелёный */
function classKind(cls) {
  const raw = clean(cls);
  if (!raw) return 'none';
  if (!looksLikeClass(raw)) return 'none';

  const t = raw.toUpperCase().replace(/[\s\-_]+/g, '');
  const has = s => t.includes(s);

  if (has('BOW') && has('WAND')) return 'heal';                 // лук + жезл — хил
  if (has('SNS') && (has('WAND') || has('GS'))) return 'tank';  // паладин / танк
  if (has('HOLY') || has('NATURE')) return 'heal';
  if (has('WAND') && !has('SNS')) return 'heal';

  return 'dd';                                                  // остальное оружие — урон
}

function classBadge(cls, allowLong) {
  const raw = clean(cls);
  if (!raw) return '<span class="cls cls--none">—</span>';
  const k = classKind(raw);
  const extra = (k === 'none' && allowLong) ? ' cls--text' : '';
  return `<span class="cls cls--${k}${extra}">${esc(raw)}</span>`;
}

/* ---------- пачки ---------- */

const TITLE_RE  = /(кп|group|пачка|squad|отряд|состав)/i;
const IMPORTANT = /(важно|important|приоритет|\bваж\b)/i;

function squadMeta(title) {
  const t = clean(title).replace(/\s+/g, ' ');
  const m = t.match(/(\d{1,2})/);
  const num = m ? m[1] : '';

  let name = t;
  if (num) name = t.replace(new RegExp(`^\\D{0,12}?${num}\\s*`, 'i'), '');
  name = name.replace(/^[\s\-–—:.,]+|[\s\-–—:.,]+$/g, '');
  if (!name || name.length < 2) name = num ? `Пачка ${num}` : 'Пачка';

  return { num, name, important: IMPORTANT.test(t) };
}

/*
   Лист состава = две (или больше) пачки в одной строке.
   Заголовок пачки — ячейка с «КП» / «Group» / «Пачка».
   Колонки внутри пачки определяются по строке-шапке
   (Nickname / Class / GS или Comment), поэтому подходит и
   3-колоночный, и 4-колоночный формат с номером.
*/
function parseGrid(rows) {
  const blocks = [];              // { base, squad, cols }
  const out = [];

  const findTitles = cells =>
    cells.reduce((acc, c, i) => {
      if (clean(c) && TITLE_RE.test(clean(c)) && !isHeaderKey(c)) acc.push(i);
      return acc;
    }, []);

  rows.forEach(cells => {
    if (!cells || !cells.length) return;
    const titles = findTitles(cells);

    if (titles.length) {
      // новая пачка (или сразу несколько в одной строке)
      titles.forEach(base => {
        const meta = squadMeta(cells[base]);
        const squad = { ...meta, members: [] };
        out.push(squad);
        blocks.push({ base, squad, cols: { nick: 0, cls: 1, gs: 2 }, shift: 0 });
      });
      return;
    }

    // строка-шапка внутри пачек — уточняем номера колонок
    let headerSeen = false;
    blocks.forEach(b => {
      const cellsOfBlock = [];
      for (let k = b.base; k < b.base + 5 && k < cells.length; k++) cellsOfBlock.push({ k, v: cells[k] });
      if (!cellsOfBlock.some(c => isNickKey(c.v) || isClsKey(c.v))) return;
      headerSeen = true;

      const off = key => {
        const hit = cellsOfBlock.find(c => key(c.v));
        return hit ? hit.k - b.base : null;
      };
      const nick = off(isNickKey);
      const cls  = off(isClsKey);
      const gs   = off(isGsKey) ?? off(isTxtKey);

      if (nick !== null) b.cols.nick = nick;
      if (cls  !== null) b.cols.cls  = cls;
      if (gs   !== null) b.cols.gs   = gs;
      b.shift = Math.min(...cellsOfBlock.map(c => c.k)) - b.base; // учли доп. колонку номера
    });
    if (headerSeen) return;

    // обычная строка с бойцами
    blocks.forEach(b => {
      const get = name => {
        const idx = b.base + (b.cols[name] ?? 0);
        return idx < cells.length ? clean(cells[idx]) : '';
      };
      const nick = get('nick');
      const cls  = get('cls');
      const gs   = get('gs');

      if (!nick && !cls) return;
      if (isHeaderKey(nick)) return;
      if (TITLE_RE.test(nick) && !cls) return;
      b.squad.members.push({ nick, cls, gs });
    });
  });

  out.forEach(s => {
    while (s.members.length < 6) s.members.push({ nick: '', cls: '', gs: '' });
    s.members = s.members.slice(0, 6);
  });

  return out.filter(s => s.members.some(m => m.nick || m.cls));
}

/* ---------- блэклист / приоритетные ---------- */

function parseRecords(rows) {
  if (!rows.length) return [];

  let start = 0;
  const first = rows[0] || [];
  if (first.some(c => isHeaderKey(c))) start = 1;

  const out = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i] || [];
    const nick = clean(r[0]);
    if (!nick || isHeaderKey(nick) || TITLE_RE.test(nick)) continue;
    out.push({ nick, cls: clean(r[1]), reason: clean(r[2]) });
  }
  return out;
}

/* ---------- стратегия ---------- */

function parseStrategy(rows) {
  if (!rows.length) return [];

  let start = 0;
  if (/group|группа|двойка|пачка/i.test(clean((rows[0] || [])[0]))) start = 1;

  const out = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i] || [];
    const group = clean(r[0]);
    if (!group) continue;

    const rec = {
      group,
      comp:   clean(r[1]),
      squads: clean(r[2]),
      t1:     clean(r[3]),
      t2:     clean(r[4]),
      notes:  clean(r[5])
    };
    if (!/[\p{L}\p{N}]/u.test(rec.t1 + rec.t2 + rec.notes)) continue;
    out.push(rec);
  }
  return out;
}

/* ---------- карта ник → класс (для диаграммы) ---------- */

async function buildNameMap() {
  const map = new Map();
  const black = new Set();

  await Promise.all(['qwe', 'dd', 'dark1', 'dark11'].map(async k => {
    try {
      parseGrid(await fetchSheet(k)).forEach(s => s.members.forEach(m => {
        if (m.nick && m.cls) map.set(m.nick.toLowerCase(), m.cls);
      }));
    } catch (e) { /* лист недоступен — не критично */ }
  }));

  try {
    parseRecords(await fetchSheet('blacklist'))
      .forEach(r => black.add(r.nick.toLowerCase()));
  } catch (e) { /* не критично */ }

  return { map, black };
}
