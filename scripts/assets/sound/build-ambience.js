// The sounds of the remembered places, in place of the music (v0.93): the river, the yard's birds, the night alley's
// crickets. Each a stretch of a CC0 recording looped without a seam (its last moments fade into what came just before
// its start, so the end runs on into the beginning), as a small Opus WebM in public/sound/<name>.webm. SoundCraft
// decodes, the crossfade is done here on the samples (EffectCraft played only one of two overlapping sound layers), and
// EffectCraft encodes. No API calls.
//   node scripts/assets/sound/build-ambience.js [name…]   (needs generated/sound/<raw>: CREDITS.txt says where from)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GENERATED_DIR, ROOT } = require('../../lib/paths');

const SUITE = path.join(process.env.USERPROFILE ?? '', 'Documents', 'artcraft-suite');
const EFFECTCRAFT = process.env.EFFECTCRAFT_CLI ?? path.join(SUITE, 'effectcraft', 'target', 'release', 'effectcraft-cli.exe');
const SOUNDCRAFT = process.env.SOUNDCRAFT_CLI ?? path.join(SUITE, 'soundcraft', 'target', 'release', 'soundcraft-cli.exe');
const DIR = path.join(GENERATED_DIR, 'sound');
const slash = (p) => p.split(path.sep).join('/');

// where in the recording the loop starts, how long it is, and how long its end takes to fade into its beginning (s)
const LOOPS = {
  river: { raw: 'river-raw.mp3', from: 60, length: 40, fade: 3 },
  birds: { raw: 'birds-raw.ogg', from: 2.5, length: 26, fade: 2.5 },
  crickets: { raw: 'crickets-raw.mp3', from: 0.6, length: 10.2, fade: 0.6 },
};

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

function build(name) {
  const cfg = LOOPS[name];
  const raw = path.join(DIR, cfg.raw);
  if (!fs.existsSync(raw)) throw new Error(`${raw} is missing (see public/sound/CREDITS.txt)`);
  const decoded = path.join(DIR, `${name}-raw.wav`);
  execFileSync(SOUNDCRAFT, ['convert', raw, decoded, '--bit-depth', '16'], { stdio: 'ignore' });
  const w = readWav(decoded);
  const frame = (t) => Math.round(t * w.rate) * w.ch;
  const at = (i) => w.data.readInt16LE(i * 2);
  const len = frame(cfg.length);
  const fade = frame(cfg.fade);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const a = at(frame(cfg.from) + i);
    if (i < len - fade) out[i] = a;
    else {
      // equal power: the end of the loop gives way to the moments just before its start
      const k = (i - (len - fade)) / fade;
      const b = at(frame(cfg.from - cfg.fade) + (i - (len - fade)));
      out[i] = a * Math.cos((k * Math.PI) / 2) + b * Math.sin((k * Math.PI) / 2);
    }
  }
  const loop = path.join(DIR, `${name}-loop.wav`);
  writeWav(loop, w, out);
  const project = path.join(DIR, `${name}.ecproj`);
  const script = path.join(DIR, `${name}.jsx`);
  fs.writeFileSync(
    script,
    `var f = app.project.importFile(new ImportOptions(new File("${slash(loop)}")));
var c = app.project.items.addComp("${name}", 16, 16, 1, ${cfg.length}, 2);
c.layers.add(f);
app.project.save(new File("${slash(project)}"));
writeLn("ok ${name}");`
  );
  execFileSync(EFFECTCRAFT, ['script', script], { stdio: ['ignore', 'inherit', 'inherit'] });
  const target = path.join(ROOT, 'public', 'sound', `${name}.webm`);
  execFileSync(EFFECTCRAFT, ['render', '--project', project, '--comp', name, '--format', 'webm', '--webm-codec', 'vp9', '--audio', 'on', '--audio-bitrate', '40', '--opus-app', 'audio', '--bitrate', '5', '--out', target], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`${name}.webm`, fs.statSync(target).size);
}

for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LOOPS)) build(name);
