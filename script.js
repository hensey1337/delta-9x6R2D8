const PUB_KEY = '2PACX-1vSAdKvnDfusW0YrdnJgV3Wd3swPgFvKJRmSSQ1zc0aN2mxuBPpu2DvqzSwDnJqPeBHvFFV57e_ZJnR8';
const URLS = {
    qwe: `https://docs.google.com/spreadsheets/d/e/${PUB_KEY}/pub?output=csv&gid=1505585512`,
    dd: `https://docs.google.com/spreadsheets/d/e/${PUB_KEY}/pub?output=csv&gid=643049503`,
    dark1: `https://docs.google.com/spreadsheets/d/e/${PUB_KEY}/pub?output=csv&gid=993416369`,
    dark11: `https://docs.google.com/spreadsheets/d/e/${PUB_KEY}/pub?output=csv&gid=1257870261`,
    blacklist: `https://docs.google.com/spreadsheets/d/e/${PUB_KEY}/pub?output=csv&gid=0`,
    targets: `https://docs.google.com/spreadsheets/d/e/${PUB_KEY}/pub?output=csv&gid=1730228249`,
    strategy: `https://docs.google.com/spreadsheets/d/e/${PUB_KEY}/pub?output=csv&gid=2058197677`
};

window.switchTab = (id, btn) => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${id}`).classList.add('active');
};

const getClassBadge = (name) => {
    if (!name) return '—';
    const u = name.toUpperCase();
    let c = 'badge';
    if (u.includes('SNS')) c += ' class-sns';
    else if (u.includes('SPEAR')) c += ' class-spear';
    else if (u.includes('BOW')) c += ' class-bow';
    else if (u.includes('DAGGER') || u.includes('КОРД')) c += ' class-dagger';
    return `<span class="${c}">${name}</span>`;
};

const normalizeFlatData = (data) => data.map(row => {
    const n = {};
    for (let k in row) n[k.trim().toLowerCase()] = (row[k] || '').trim();
    return n;
});

function parseGridData(rows) {
    const squads = [];
    let currentSquadLeft = null;
    let currentSquadRight = null;

    rows.forEach(row => {
        if (!row || !row.length) return;

        const leftCell = (row[0] || '').trim();
        const leftUpper = leftCell.toUpperCase();

        if (leftCell.includes('КП') || leftCell.toLowerCase().includes('group')) {
            currentSquadLeft = { title: leftCell, members: [] };
            squads.push(currentSquadLeft);
        } 
        else if (leftCell && currentSquadLeft && !leftUpper.includes('NICKNAME') && !leftUpper.includes('НИКНЕЙМ') && !leftUpper.includes('CLASS')) {
            currentSquadLeft.members.push({ 
                nickname: leftCell, 
                class: (row[1] || '').trim(), 
                gs: (row[2] || '').trim()
            });
        }

        const rightGroupCell = (row[4] || '').trim();
        const rightUpper = rightGroupCell.toUpperCase();

        if (rightGroupCell.includes('КП') || rightGroupCell.toLowerCase().includes('group')) {
            currentSquadRight = { title: rightGroupCell, members: [] };
            squads.push(currentSquadRight);
        } 
        else {
            if (rightGroupCell && currentSquadRight && !rightUpper.includes('NICKNAME') && !rightUpper.includes('НИКНЕЙМ') && !rightUpper.includes('CLASS')) {
                currentSquadRight.members.push({ 
                    nickname: rightGroupCell, 
                    class: (row[5] || '').trim(), 
                    gs: (row[6] || '').trim()
                });
            }
        }
    });

    return squads.filter(s => s.members.length > 0);
}

function renderSquadList(containerId, squads) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (!squads || squads.length === 0) {
        container.innerHTML = '<div class="loading-msg">Данные не найдены или лист пуст</div>';
        return;
    }
    squads.forEach(sq => {
        const card = document.createElement('div');
        card.className = 'squad-card';
        let html = `<div class="squad-header"><div class="squad-title">${sq.title}</div><div class="squad-num">${sq.members.length} чел.</div></div>`;
        sq.members.slice(0, 6).forEach((m, i) => {
            html += `
            <div class="squad-member ${m.gs ? '' : 'no-gs'}">
                <span class="mem-num">${i + 1}</span>
                <span class="mem-name" title="${m.nickname}">${m.nickname}</span>
                <span>${getClassBadge(m.class)}</span>
                ${m.gs ? `<span class="mem-gs">${m.gs}</span>` : ''}
            </div>`;
        });
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function renderTable(tbodyId, rows, isTarget = false) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    rows.forEach(row => {
        const nick = row.nickname || row.comment;
        if (!nick) return;
        const tr = document.createElement('tr');
        if (isTarget) {
            tr.innerHTML = `<td class="nickname" style="color:#f87171">🎯 ${nick}</td><td>${getClassBadge(row.class || '')}</td><td>${row.reason || '—'}</td>`;
        } else {
            tr.innerHTML = `<td class="nickname">❌ ${nick}</td><td><span class="badge">${row.setup || '—'}</span></td><td style="color:var(--text-muted)">${row.reason || '—'}</td>`;
        }
        tbody.appendChild(tr);
    });
}

function renderStrategy(rows) {
    const container = document.getElementById('container-strategy');
    container.innerHTML = '';
    rows.forEach(row => {
        if (!row.group) return;
        const card = document.createElement('div');
        card.className = 'strategy-card';
        let targets = '';
        if (row.target1 && row.target1 !== '—') targets += `<div class="target-block"><span class="target-label">🎯 ЦЕЛЬ №1:</span> <span class="target-name target-primary">${row.target1}</span></div>`;
        if (row.target2 && row.target2 !== '—') targets += `<div class="target-block"><span class="target-label">🔄 ЦЕЛЬ №2:</span> <span class="target-name target-secondary">${row.target2}</span></div>`;
        
        card.innerHTML = `
            <div class="card-header-row">
                <div class="group-info">
                    <div class="group-title">${row.group}</div>
                    ${row['group composition'] ? `<div class="group-comp">[ ${row['group composition']} ]</div>` : ''}
                </div>
                <div class="squads-list">${row.squads || '—'}</div>
            </div>
            <div class="card-body-content">
                <div class="targets-zone">${targets || '<span style="color:var(--text-muted);font-style:italic">Свободная охота</span>'}</div>
                <div class="notes-zone">${row.notes || '—'}</div>
            </div>`;
        container.appendChild(card);
    });
}

const loadSquad = (url, containerId) => {
    Papa.parse(url, {
        download: true, header: false, skipEmptyLines: true,
        complete: res => renderSquadList(containerId, parseGridData(res.data))
    });
};

// Запуск
loadSquad(URLS.qwe, 'container-qwe');
loadSquad(URLS.dd, 'container-dd');
loadSquad(URLS.dark1, 'container-dark1');
loadSquad(URLS.dark11, 'container-dark11');

Papa.parse(URLS.blacklist, { download: true, header: true, skipEmptyLines: true, complete: res => renderTable('tbody-blacklist', normalizeFlatData(res.data)) });
Papa.parse(URLS.targets, { download: true, header: true, skipEmptyLines: true, complete: res => renderTable('tbody-targets', normalizeFlatData(res.data), true) });
Papa.parse(URLS.strategy, { download: true, header: true, skipEmptyLines: true, complete: res => renderStrategy(normalizeFlatData(res.data)) });
