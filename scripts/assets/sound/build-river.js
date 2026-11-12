// The river under the first request's memory (v0.93): 40 s out of a 5 min CC0 recording of the Vistula, looped without
// a seam (its last 3 s fade into what came just before its start, so the end runs on into the beginning), as a small
// Opus WebM in public/sound/river.webm. SoundCraft decodes, the crossfade is done here on the samples (EffectCraft
// played only one of two overlapping sound layers), and EffectCraft encodes. No API calls.
//   node scripts/assets/sound/build-river.js   (needs generated/sound/river-raw.mp3: CREDITS.txt says where from)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GENERATED_DIR, ROOT } = require('../../lib/paths');

const SUITE = path.join(process.env.USERPROFILE ?? '', 'Documents', 'artcraft-suite');
const EFFECTCRAFT = process.env.EFFECTCRAFT_CLI ?? path.join(SUITE, 'effectcraft', 'target', 'release', 'effectcraft-cli.exe');
const SOUNDCRAFT = process.env.SOUNDCRAFT_CLI ?? path.join(SUITE, 'soundcraft', 'target', 'release', 'soundcraft-cli.exe');
const DIR = path.join(GENERATED_DIR, 'sound');
const RAW = path.join(DIR, 'river-raw.mp3');
const OUT = path.join(ROOT, 'public', 'sound', 'river.webm');
const slash = (p) => p.replace(/\\/g, '/');

const FROM = 60; // where in the recording the loop starts
const LENGTH = 40;
const FADE = 3;

function readWav(file) {
  const b = fs.readFileSync(file);
  let p = 12;
  let fmt = null;
  let data = null;
  while (p < b.length) {
    const id = b.toString('ascii', p, p + 4);
    const n = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') data = b.subarray(p + 8, p + 8 + n);
    p += 8 + n + (n % 2);
  }
  if (!fmt || !data || fmt.bits !== 16) throw new Error(`${file}: expected 16-bit PCM`);
  return { ...fmt, data };
}

function writeWav(file, { ch, rate }, samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(ch, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * ch * 2, 28); b.writeUInt16LE(ch * 2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i]))), 44 + i * 2);
  fs.writeFileSync(file, b);
}

if (!fs.existsSync(RAW)) throw new Error(`${RAW} is missing (see public/sound/CREDITS.txt)`);
const decoded = path.join(DIR, 'river-raw.wav');
execFileSync(SOUNDCRAFT, ['convert', RAW, decoded, '--bit-depth', '16'], { stdio: 'ignore' });
const w = readWav(decoded);
const frame = (t) => Math.round(t * w.rate) * w.ch;
const at = (i) => w.data.readInt16LE(i * 2);
const len = frame(LENGTH);
const fade = frame(FADE);
const out = new Float32Array(len);
for (let i = 0; i < len; i++) {
  const a = at(frame(FROM) + i);
  if (i < len - fade) out[i] = a;
  else {
    // equal power: the end of the loop gives way to the moments just before its start
    const k = (i - (len - fade)) / fade;
    const b = at(frame(FROM - FADE) + (i - (len - fade)));
    out[i] = a * Math.cos((k * Math.PI) / 2) + b * Math.sin((k * Math.PI) / 2);
  }
}
const loop = path.join(DIR, 'river-loop.wav');
writeWav(loop, w, out);

fs.writeFileSync(
  path.join(DIR, 'river.jsx'),
  `var f = app.project.importFile(new ImportOptions(new File("${slash(loop)}")));
var c = app.project.items.addComp("river", 16, 16, 1, ${LENGTH}, 2);
c.layers.add(f);
app.project.save(new File("${slash(path.join(DIR, 'river.ecproj'))}"));
writeLn("ok river");`
);
execFileSync(EFFECTCRAFT, ['script', path.join(DIR, 'river.jsx')], { stdio: ['ignore', 'inherit', 'inherit'] });
execFileSync(EFFECTCRAFT, ['render', '--project', path.join(DIR, 'river.ecproj'), '--comp', 'river', '--format', 'webm', '--webm-codec', 'vp9', '--audio', 'on', '--audio-bitrate', '40', '--opus-app', 'audio', '--bitrate', '5', '--out', OUT], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log('river.webm', fs.statSync(OUT).size);
