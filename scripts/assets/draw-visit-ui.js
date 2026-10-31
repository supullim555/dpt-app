// Draws the 병문안 UI textures and placeholder room with code (SVG through sharp) — no Gemini, no
// source images, no cost. Fixed seeds, so re-running gives the same files.
//   node scripts/assets/draw-visit-ui.js
// The look follows docs/병문안_모티브와_아트_구상.md: monochrome ink and paper, with the amber of the
// window and her hairpin as the only colours. room.png has a transparent window; the screen puts the day's light behind it.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { ASSETS_DIR } = require('../lib/paths');

const OUT = path.join(ASSETS_DIR, 'visit');

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const INK = `<filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7"/>
  <feDisplacementMap in="SourceGraphic" scale="7"/>
</filter>`;

function line(x1, y1, x2, y2, w = 5, color = '#f2f2f2') {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}

// One-point perspective view from the door. Everything is filled grey or black except the window,
// which is cut out of the wall.
function roomSvg() {
  const W = 720;
  const H = 900;
  const back = { l: 190, r: 530, t: 170, b: 520 };
  const win = { l: 265, r: 455, t: 215, b: 385 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${INK}
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a3a"/><stop offset="1" stop-color="#0c0c0c"/></linearGradient>
  <linearGradient id="left" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#060606"/><stop offset="1" stop-color="#2c2c2c"/></linearGradient>
  <linearGradient id="right" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#060606"/><stop offset="1" stop-color="#2c2c2c"/></linearGradient>
  </defs>
  <path fill="#111" d="M0 0H${W}L${back.r} ${back.t}H${back.l}Z"/>
  <path fill="url(#left)" d="M0 0L${back.l} ${back.t}V${back.b}L0 ${H}Z"/>
  <path fill="url(#right)" d="M${W} 0L${back.r} ${back.t}V${back.b}L${W} ${H}Z"/>
  <path fill="url(#floor)" d="M0 ${H}L${back.l} ${back.b}H${back.r}L${W} ${H}Z"/>
  <path fill="#4a4a4a" fill-rule="evenodd" d="M${back.l} ${back.t}H${back.r}V${back.b}H${back.l}Z M${win.l} ${win.t}V${win.b}H${win.r}V${win.t}Z"/>
  <g filter="url(#ink)">
    ${line(0, 0, back.l, back.t)}${line(W, 0, back.r, back.t)}${line(0, H, back.l, back.b)}${line(W, H, back.r, back.b)}
    ${line(back.l, back.t, back.r, back.t)}${line(back.l, back.b, back.r, back.b)}${line(back.l, back.t, back.l, back.b)}${line(back.r, back.t, back.r, back.b)}
    <rect x="${win.l}" y="${win.t}" width="${win.r - win.l}" height="${win.b - win.t}" fill="none" stroke="#f2f2f2" stroke-width="7"/>
    ${line((win.l + win.r) / 2, win.t, (win.l + win.r) / 2, win.b, 5)}
    ${line(win.l, (win.t + win.b) / 2, win.r, (win.t + win.b) / 2, 4)}
    <path d="M${win.l - 34} ${win.t - 12} C${win.l - 8} 270 ${win.l - 28} 340 ${win.l - 12} ${win.b + 34} L${win.l - 56} ${win.b + 34} C${win.l - 48} 330 ${win.l - 60} 260 ${win.l - 34} ${win.t - 12}Z" fill="#8d8d8d" stroke="#f2f2f2" stroke-width="4"/>
    ${line(win.l - 70, win.t - 14, win.r + 56, win.t - 14, 5)}
    <path d="M150 700 L205 455 H515 L570 700 Z" fill="#cfcfcf" stroke="#f7f7f7" stroke-width="6"/>
    <path d="M140 700 V800 M580 700 V800" stroke="#f2f2f2" stroke-width="9" fill="none"/>
    <path d="M140 700 H580 V745 H140 Z" fill="#6b6b6b" stroke="#f2f2f2" stroke-width="5"/>
    <path d="M250 470 H470 Q485 470 480 505 L475 530 H245 L240 505 Q235 470 250 470Z" fill="#f4f4f4" stroke="#222" stroke-width="4"/>
    <path d="M168 610 Q360 575 552 610 L570 700 H150 Z" fill="#9a9a9a" stroke="#f2f2f2" stroke-width="5"/>
    ${line(620, 560, 620, 830, 6, '#dcdcdc')}
    <rect x="580" y="540" width="84" height="60" fill="#3a3a3a" stroke="#f2f2f2" stroke-width="5"/>
    <path d="M596 540 L606 524 H652 L644 540 Z" fill="#efefef" stroke="#222" stroke-width="3"/>
  </g></svg>`;
}

// The girl lying with her back to the player: dark hair on the pillow, her cranberry hairpin (the only
// colour besides the window), a shape under the blanket.
function girlSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="900"><defs>${INK}</defs><g filter="url(#ink)">
    <path d="M262 545 C295 500 345 462 395 472 C455 485 470 545 452 590 C470 640 455 665 430 690 C400 640 370 620 345 612 C305 600 270 590 262 545Z" fill="#101010" stroke="#f2f2f2" stroke-width="4"/>
    <path d="M300 540 C330 505 365 490 400 498 M330 570 C360 530 400 520 435 535 M360 600 C385 565 415 560 440 575" stroke="#5a5a5a" stroke-width="4" fill="none"/>
    <rect x="372" y="500" width="30" height="11" rx="3" fill="#b9505a" stroke="#f2f2f2" stroke-width="2" transform="rotate(-18 387 505)"/>
    <path d="M225 690 C240 625 310 595 380 600 C460 605 515 635 530 690 L545 700 H190 Z" fill="#b5b5b5" stroke="#f2f2f2" stroke-width="5"/>
    <path d="M280 640 C330 620 410 620 470 650" stroke="#6a6a6a" stroke-width="4" fill="none"/>
  </g></svg>`;
}

// A strip of torn paper for the top of the screen; the jagged edge is along the bottom.
function tornSvg() {
  const r = seeded(4242);
  const W = 720;
  let d = `M0 0H${W}V${50 + r() * 30}`;
  for (let x = W; x > 0; x -= 14 + r() * 26) d += `L${x} ${52 + r() * 46}`;
  d += 'L0 70Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="110"><defs>
    <filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="3"/><feDiffuseLighting surfaceScale="2.2" lighting-color="#ffffff"><feDistantLight azimuth="45" elevation="62"/></feDiffuseLighting><feComposite in2="SourceAlpha" operator="in"/></filter>
    <filter id="s"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.8"/></filter></defs>
    <g filter="url(#s)"><path d="${d}" fill="#000" filter="url(#p)"/></g></svg>`;
}

// Crumpled paper for word cards, stretched to each card's size.
function cardSvg(seed) {
  const r = seeded(seed);
  const W = 300;
  const H = 150;
  const j = () => r() * 8;
  const d = `M${j()} ${j()}L${W / 2} ${j()}L${W - j()} ${j()}L${W - j()} ${H / 2}L${W - j()} ${H - j()}L${W / 2} ${H - j()}L${j()} ${H - j()}L${j()} ${H / 2}Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    <filter id="c"><feTurbulence type="turbulence" baseFrequency="0.018" numOctaves="4" seed="${seed}"/><feDiffuseLighting surfaceScale="3" lighting-color="#ffffff"><feDistantLight azimuth="60" elevation="66"/></feDiffuseLighting><feComposite in2="SourceAlpha" operator="in"/></filter></defs>
    <path d="${d}" fill="#000" filter="url(#c)"/></svg>`;
}

// Opening cutscene placeholders. The cranberry seal echoes her hairpin; one amber window is hers.
const OP_W = 720;
const OP_H = 1000;
const opSvg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${OP_W}" height="${OP_H}"><defs>${INK}</defs><rect width="${OP_W}" height="${OP_H}" fill="#050505"/><g filter="url(#ink)">${body}</g></svg>`;

function opHandSvg() {
  return opSvg(`
    <path d="M150 300 L560 250 L600 600 L190 650 Z" fill="#ececec" stroke="#fff" stroke-width="6"/>
    <path d="M150 300 L375 470 L560 250" fill="none" stroke="#555" stroke-width="5"/>
    <circle cx="375" cy="472" r="36" fill="#b9505a" stroke="#f2f2f2" stroke-width="4"/>
    <path d="M300 1000 L320 760 C322 690 360 640 420 625 L560 590 C600 580 625 610 600 640 L560 668 L625 660 C662 656 672 695 640 712 L590 738 L620 740 C650 744 650 782 622 792 L500 840 L500 1000 Z" fill="#1c1c1c" stroke="#f2f2f2" stroke-width="6"/>
    <path d="M430 690 C470 680 520 672 556 668 M470 760 C510 750 560 742 590 738" fill="none" stroke="#7a7a7a" stroke-width="4"/>
    <path d="M250 1000 L290 830 L530 900 L520 1000 Z" fill="#0d0d0d" stroke="#f2f2f2" stroke-width="5"/>`);
}

function opDeskSvg() {
  const r = seeded(77);
  let lines = '';
  for (let y = 410; y < 690; y += 38) {
    const w = 280 + r() * 90;
    lines += `<path d="M215 ${y} q${w / 3} ${-6 + r() * 12} ${w} ${-4 + r() * 8}" fill="none" stroke="#2a2a2a" stroke-width="4"/>`;
  }
  return opSvg(`
    <path d="M0 240 H720 V1000 H0 Z" fill="#242424"/>
    <path d="M0 340 H720 M0 520 H720 M0 720 H720 M0 900 H720" stroke="#3b3b3b" stroke-width="4"/>
    <path d="M170 340 L560 325 L590 760 L190 775 Z" fill="#f0f0f0" stroke="#fff" stroke-width="6"/>
    <path d="M178 545 L580 530" stroke="#b5b5b5" stroke-width="4"/>
    ${lines}
    <path d="M90 880 L300 760 L470 860 L250 980 Z" fill="#c8c8c8" stroke="#f2f2f2" stroke-width="5"/>
    <circle cx="270" cy="862" r="24" fill="#b9505a" stroke="#f2f2f2" stroke-width="3"/>
    <path d="M610 240 C610 150 690 130 720 130 V300 Z" fill="#0f0f0f" stroke="#f2f2f2" stroke-width="5"/>`);
}

function opHospitalSvg() {
  let win = '';
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 6; col++) {
      const x = 130 + col * 80;
      const y = 200 + row * 86;
      const hers = row === 2 && col === 4;
      win += `<rect x="${x}" y="${y}" width="50" height="58" fill="${hers ? '#d9a441' : '#1b1b1b'}" stroke="#d8d8d8" stroke-width="3"/>`;
    }
  }
  return opSvg(`
    <path d="M90 150 H630 V860 H90 Z" fill="#3a3a3a" stroke="#f2f2f2" stroke-width="6"/>
    <path d="M60 150 H660" stroke="#f2f2f2" stroke-width="7"/>
    ${win}
    <path d="M300 860 V780 H420 V860" fill="#101010" stroke="#f2f2f2" stroke-width="5"/>
    <path d="M0 860 H720 V1000 H0 Z" fill="#141414"/>
    <path d="M0 860 H720" stroke="#f2f2f2" stroke-width="5"/>
    <path d="M70 860 V560" stroke="#f2f2f2" stroke-width="12"/>
    <path d="M70 620 C10 590 -10 500 40 460 C30 400 100 380 130 430 C190 420 200 510 150 550 C150 600 110 625 70 620Z" fill="#0c0c0c" stroke="#f2f2f2" stroke-width="5"/>
    <path d="M260 1000 L330 860 H390 L460 1000 Z" fill="#2c2c2c" stroke="#d8d8d8" stroke-width="4"/>`);
}

// Dark, faintly textured panel behind the text.
function panelSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360"><defs>
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="9" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.16  0 0 0 0 0.16  0 0 0 0 0.16  0 0 0 0.5 0"/></filter></defs>
    <rect width="360" height="360" fill="#141414"/><rect width="360" height="360" filter="url(#n)"/></svg>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const files = { room: roomSvg(), girl: girlSvg(), torn: tornSvg(), 'card-a': cardSvg(11), 'card-b': cardSvg(29), panel: panelSvg(), 'op-hand': opHandSvg(), 'op-desk': opDeskSvg(), 'op-hospital': opHospitalSvg() };
  for (const [name, svg] of Object.entries(files)) {
    const f = path.join(OUT, `${name}.png`);
    await sharp(Buffer.from(svg)).png({ palette: name !== 'room' && name !== 'girl' ? false : false }).toFile(f);
    console.log(name, `${Math.round(fs.statSync(f).size / 1024)}KB`);
  }
})();
