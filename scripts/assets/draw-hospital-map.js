// Draws the hospital map images in docs/지도/ from the map below and checks that everything can be reached:
//   node scripts/assets/draw-hospital-map.js
// The maps are the same ones in docs/병원_지도.md. Every floor shares one footprint, so E and S line up.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const FLOORS = {
  4: {
    title: '4층  호스피스·완화 병동',
    map: [
      '###############',
      '#AA#E#S#BB#LLp#',
      '#AA#.#.#BB#LL##',
      '#=##.#.##=##+##',
      '#......@......#',
      '###=#n#+#v#=#.#',
      '#CCC##GGG##DD.#',
      '#CCC##GGG##DD.#',
      '#CCC##GGG##DD.#',
      '#CCC##GGG##DDW#',
      '###############',
    ],
    rooms: { A: ['병실', 'closed'], B: ['병실', 'closed'], C: ['병실', 'closed'], D: ['가족\n면담실', 'closed'], L: ['보호자\n휴게실', 'open', [12.3, 2.45]], G: ['소녀의 병실', 'girl'], W: ['창', 'open'] },
    clue: 'L',
  },
  3: {
    title: '3층  중증 병동',
    map: [
      '###############',
      '#AA#E#S#BB#II##',
      '#AA#.#.#BB#II##',
      '#=##.#.##=##=##',
      '#.............#',
      '#%#NNNNNNNNN#.#',
      '#t###c#######.#',
      '#.............#',
      '###=###+###=###',
      '#DDD#RRRb#QQQ##',
      '###############',
    ],
    rooms: { A: ['병실', 'closed'], B: ['병실', 'closed'], I: ['중환자실', 'closed'], N: ['간호사 스테이션', 'station'], D: ['병실', 'closed'], R: ['휴게실', 'open', [7, 9.5]], Q: ['처치실', 'closed'] },
    clue: 'R',
  },
  2: {
    title: '2층  일반 병동',
    map: [
      '###############',
      '#AA#E#S#DD#Vh##',
      '#AA#.#.#Dd#VV##',
      '#=##.#.##+##+##',
      '#.............#',
      '#.#NNN#%#LLL#.#',
      '#.#NNN#.#LLL#.#',
      '#.............#',
      '###=###+###+###',
      '#FFF#YYYy##kJJ#',
      '###############',
    ],
    rooms: { A: ['병실', 'closed'], D: ['병실', 'closed'], V: ['창가\n쉼터', 'open'], N: ['스테이션', 'station'], L: ['린넨실', 'closed'], F: ['병실', 'closed'], Y: ['재활실', 'open', [7, 9.5]], J: ['병실', 'closed'] },
    clue: 'Y',
  },
  1: {
    title: '1층  로비, 외래, 안뜰',
    map: [
      '###############',
      '#Oo#E#S#MMm#XX#',
      '#OO#.#.#MMM#.%#',
      '#+##.#.##+##.##',
      '@.............#',
      '#.#.#i#.#.#g#.#',
      '#.............#',
      '###+###+###=###',
      '#HHH###.###RRR#',
      '#HHH###.###RRR#',
      '#######+#######',
      '####YYYYYYY####',
      '####YYYTYYY####',
      '####YbYYYYY####',
      '###############',
    ],
    rooms: { O: ['외래\n대기실', 'open'], M: ['매점', 'open'], X: ['구석', 'open', [13.5, 1.5]], H: ['응급실 앞', 'open'], R: ['원무과·약국', 'closed'], Y: ['안뜰', 'yard', [5.5, 11.6]] },
    clue: 'X',
  },
};

const PEOPLE = { 4: 'npv', 3: 'tcb', 2: 'dhky', 1: 'oimgb' };
const TALK_AT_DESK = { 3: 'N' }; // the 3rd-floor nurse is behind the station, so the station is what you talk to
const DOORS_INTO_SCENES = 'G'; // her room is the existing scene: you go through the door, you don't walk it
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const isSolid = (c) => '#=%NT'.includes(c) || /[a-z]/.test(c) || DOORS_INTO_SCENES.includes(c);

function check(f) {
  const { map, clue } = FLOORS[f];
  if (map.some((r) => r.length !== 15)) throw new Error(`${f}층 너비: ${map.map((r) => r.length)}`);
  const find = (ch) => { for (let y = 0; y < map.length; y++) { const x = map[y].indexOf(ch); if (x >= 0) return [x, y]; } throw new Error(`${f}층에 ${ch} 없음`); };
  const start = find('E');
  if (start[0] !== 4 || start[1] !== 1 || find('S')[0] !== 6) throw new Error(`${f}층 E/S 위치`);
  const dist = new Map([[start.join(), 0]]);
  const queue = [start];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of DIRS) {
      const key = `${x + dx},${y + dy}`;
      const c = map[y + dy]?.[x + dx];
      if (!c || isSolid(c) || dist.has(key)) continue;
      dist.set(key, dist.get(`${x},${y}`) + 1);
      queue.push([x + dx, y + dy]);
    }
  }
  const nextTo = (ch) => {
    let best = null;
    map.forEach((r, y) => [...r].forEach((c, x) => {
      if (c !== ch) return;
      for (const [dx, dy] of DIRS) {
        const d = dist.get(`${x + dx},${y + dy}`);
        if (d !== undefined && (best === null || d < best)) best = d;
      }
    }));
    if (best === null) throw new Error(`${f}층 ${ch}에 닿을 수 없음`);
    return best;
  };
  const clueAt = dist.get(find(clue).join());
  if (clueAt === undefined) throw new Error(`${f}층 단서 ${clue}에 닿을 수 없음`);
  const who = [...PEOPLE[f], ...(TALK_AT_DESK[f] ?? '')];
  who.forEach(nextTo);
  return { walk: dist.size, clue: clueAt, people: who.length, door: f === 4 ? nextTo('G') : null, lobby: f === 1 ? dist.get(find('@').join()) : null };
}

const COLOR = { wall: '#23211e', corridor: '#f0ebdf', open: '#e2d6bb', closed: '#b9b4a8', girl: '#d9a441', station: '#8f8a7e', yard: '#c9d0a6', door: '#d9a441', shut: '#6d695f', person: '#a3263f', clue: '#d9a441', lift: '#3f5d78' };
const roomOf = (f, c) => FLOORS[f].rooms[c];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function cellColor(f, c) {
  if (c === '#') return COLOR.wall;
  if (c === '+') return COLOR.door;
  if (c === '=') return COLOR.shut;
  if (c === 'E' || c === 'S') return COLOR.lift;
  if (c === 'T') return COLOR.yard;
  const room = roomOf(f, c);
  return room ? COLOR[room[1]] : COLOR.corridor;
}

function labels(f) {
  const { map } = FLOORS[f];
  const seen = {};
  map.forEach((r, y) => [...r].forEach((c, x) => {
    if (!roomOf(f, c)) return;
    (seen[c] ??= []).push([x, y]);
  }));
  // A room can appear in two parts only if the letter is reused, and it never is: one label per letter.
  return Object.entries(seen).map(([c, cells]) => {
    const at = roomOf(f, c)[2]; // set where the middle of the room is taken by a clue, a person or the tree
    return {
      text: roomOf(f, c)[0],
      x: at ? at[0] : cells.reduce((a, p) => a + p[0], 0) / cells.length + 0.5,
      y: at ? at[1] : cells.reduce((a, p) => a + p[1], 0) / cells.length + 0.5,
    };
  });
}

function plan(f, ox, oy, s) {
  const { map, title, clue } = FLOORS[f];
  let out = `<text x="${ox}" y="${oy - 12}" font-size="22" font-weight="700" fill="#23211e">${esc(title)}</text>`;
  map.forEach((r, y) => [...r].forEach((c, x) => {
    out += `<rect x="${ox + x * s}" y="${oy + y * s}" width="${s}" height="${s}" fill="${/[a-z]/.test(c) ? COLOR.corridor : cellColor(f, c)}"/>`;
  }));
  map.forEach((r, y) => [...r].forEach((c, x) => {
    const cx = ox + (x + 0.5) * s;
    const cy = oy + (y + 0.5) * s;
    if (/[a-z]/.test(c)) out += `<circle cx="${cx}" cy="${cy}" r="${s * 0.3}" fill="${COLOR.person}"/>`;
    if (c === '%') out += `<rect x="${cx - s * 0.32}" y="${cy - s * 0.32}" width="${s * 0.64}" height="${s * 0.64}" fill="#5b5448"/>`;
    if (c === 'E' || c === 'S') out += `<text x="${cx}" y="${cy + 5}" font-size="11" fill="#fff" text-anchor="middle">${c === 'E' ? '승강기' : '계단'}</text>`;
    if (c === 'T') out += `<circle cx="${cx}" cy="${cy}" r="${s * 0.46}" fill="${COLOR.girl}" stroke="#7a5a18" stroke-width="2"/>`;
    if (c === '@') out += `<polygon points="${cx - s * 0.3},${cy - s * 0.3} ${cx + s * 0.35},${cy} ${cx - s * 0.3},${cy + s * 0.3}" fill="${COLOR.person}"/>`;
  }));
  for (const l of labels(f)) {
    const lines = l.text.split('\n');
    lines.forEach((t, i) => {
      out += `<text x="${ox + l.x * s}" y="${oy + l.y * s + 4 + (i - (lines.length - 1) / 2) * 14}" font-size="12" fill="#23211e" text-anchor="middle">${esc(t)}</text>`;
    });
  }
  const at = (() => { for (let y = 0; y < map.length; y++) { const i = map[y].indexOf(clue); if (i >= 0) return [i, y]; } })();
  const ccx = ox + (at[0] + 0.5) * s;
  const ccy = oy + (at[1] + 0.5) * s;
  out += `<polygon points="${ccx},${ccy - 10} ${ccx + 10},${ccy} ${ccx},${ccy + 10} ${ccx - 10},${ccy}" fill="${COLOR.clue}" stroke="#23211e" stroke-width="2"/>`;
  return out;
}

function legend(x, y) {
  const items = [[COLOR.person, '사람'], [COLOR.clue, '단서'], [COLOR.door, '열리는 문, 소녀의 병실'], [COLOR.shut, '잠긴 문'], [COLOR.lift, '엘리베이터, 계단'], [COLOR.open, '들어갈 수 있는 곳'], [COLOR.closed, '닫힌 곳'], ['#5b5448', '길을 막는 물건']];
  return items.map(([c, t], i) => `<rect x="${x + (i % 4) * 190}" y="${y + Math.floor(i / 4) * 28}" width="18" height="18" fill="${c}"/><text x="${x + (i % 4) * 190 + 26}" y="${y + Math.floor(i / 4) * 28 + 14}" font-size="14" fill="#23211e">${esc(t)}</text>`).join('');
}

function plansSvg() {
  const s = 36;
  const w = 15 * s;
  const gap = 60;
  const body = plan(4, 40, 60, s) + plan(3, 40 + w + gap, 60, s) + plan(2, 40, 60 + 11 * s + 70, s) + plan(1, 40 + w + gap, 60 + 11 * s + 70, s) + legend(40, 60 + 26 * s + 80);
  return { width: 2 * w + gap + 80, height: 60 + 26 * s + 170, body };
}

// One stacked view of the whole building: the same cells, tilted. Walls are raised blocks.
function stackSvg() {
  const a = 21;
  const b = 10.5;
  const wallH = 9;
  const gap = 290;
  const originX = 540;
  const top = 80;
  const project = (x, y, z) => [originX + (x - y) * a, top + (x + y) * b - z];
  const poly = (pts, fill, extra = '') => `<polygon points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
  let out = '';
  const floorBase = (f) => (4 - f) * -gap;

  for (const f of [1, 2, 3, 4]) {
    const { map } = FLOORS[f];
    const z = floorBase(f);
    const cells = [];
    map.forEach((r, y) => [...r].forEach((c, x) => cells.push({ c, x, y })));
    cells.sort((p, q) => p.x + p.y - (q.x + q.y));
    for (const { c, x, y } of cells) {
      const raised = c === '#' || c === 'N';
      const h = raised ? wallH : 0;
      const fill = /[a-z]/.test(c) ? COLOR.corridor : cellColor(f, c);
      const t = (px, py) => project(px, py, z + h);
      if (raised) {
        out += poly([project(x, y + 1, z), project(x + 1, y + 1, z), t(x + 1, y + 1), t(x, y + 1)], '#3a3733');
        out += poly([project(x + 1, y, z), project(x + 1, y + 1, z), t(x + 1, y + 1), t(x + 1, y)], '#14130f');
      }
      out += poly([t(x, y), t(x + 1, y), t(x + 1, y + 1), t(x, y + 1)], fill, 'stroke="#00000022" stroke-width="0.5"');
      const [cx, cy] = project(x + 0.5, y + 0.5, z);
      if (/[a-z]/.test(c)) out += `<ellipse cx="${cx}" cy="${cy - 7}" rx="6" ry="9" fill="${COLOR.person}"/>`;
      if (c === '%') out += poly([project(x + 0.2, y + 0.2, z + 8), project(x + 0.8, y + 0.2, z + 8), project(x + 0.8, y + 0.8, z + 8), project(x + 0.2, y + 0.8, z + 8)], '#5b5448');
      if (c === 'T') out += `<rect x="${cx - 3}" y="${cy - 34}" width="6" height="34" fill="#4a3a22"/><circle cx="${cx}" cy="${cy - 50}" r="28" fill="${COLOR.girl}" stroke="#7a5a18" stroke-width="2"/>`;
    }
    const [, ly] = project(0, 7, z);
    const lx = 0;
    out += `<text x="${lx}" y="${ly}" font-size="24" font-weight="700" fill="#23211e">${esc(FLOORS[f].title.split('  ')[0])}</text><text x="${lx}" y="${ly + 24}" font-size="15" fill="#23211e">${esc(FLOORS[f].title.split('  ')[1])}</text>`;
  }
  // The shafts that tie the floors together, and the line of sight from her window down to the tree.
  for (const [x, label, y0] of [[4.5, '엘리베이터', 1.5], [6.5, '계단', 1.5]]) {
    const [tx, ty] = project(x, y0, floorBase(4));
    const [bx, by] = project(x, y0, floorBase(1));
    out += `<line x1="${tx}" y1="${ty - 76}" x2="${bx}" y2="${by}" stroke="${COLOR.lift}" stroke-width="5" stroke-opacity="0.75"/>`;
    out += `<text x="${tx + (label === '계단' ? 10 : -10)}" y="${ty - 82}" font-size="14" fill="${COLOR.lift}" text-anchor="${label === '계단' ? 'start' : 'end'}">${label}</text>`;
  }
  const [wx, wy] = project(7.5, 10, floorBase(4));
  const [rx, ry] = project(7.5, 12.5, floorBase(1) + 40);
  out += `<line x1="${wx}" y1="${wy}" x2="${rx}" y2="${ry}" stroke="${COLOR.person}" stroke-width="3" stroke-dasharray="7 6"/>`;
  return { width: 960, height: 3 * gap + 500, body: `<g transform="translate(40 40)">${out}</g><text x="40" y="${3 * gap + 480}" font-size="15" fill="#23211e">점선: 4층 소녀의 병실 창에서 내려다보는 1층 안뜰의 은행나무</text>` };
}

function findChrome() {
  const candidates = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('브라우저를 찾지 못함');
  return found;
}

function render({ width, height, body }, out) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#faf7ef}svg{display:block;font-family:'Malgun Gothic',sans-serif}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg></body></html>`;
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'map-')), 'map.html');
  fs.writeFileSync(tmp, html);
  execFileSync(findChrome(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${width},${height}`, `--screenshot=${out}`, `file:///${tmp.replace(/\\/g, '/')}`], { stdio: 'ignore' });
}

let total = 0;
for (const f of [4, 3, 2, 1]) {
  const r = check(f);
  total += r.walk;
  console.log(`${f}층 걷는 칸 ${r.walk}, 사람 ${r.people}, 엘리베이터→단서 ${r.clue}${r.door !== null ? `, 엘리베이터→병실 문 ${r.door}` : ''}${r.lobby !== null ? `, 엘리베이터→정문 ${r.lobby}` : ''}`);
}
console.log(`합계 ${total}칸`);

const dir = path.join(__dirname, '..', '..', 'docs', '지도');
fs.mkdirSync(dir, { recursive: true });
render(plansSvg(), path.join(dir, '층별_지도.png'));
render(stackSvg(), path.join(dir, '전체_입체지도.png'));
console.log('그림 저장:', dir);
