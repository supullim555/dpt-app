// A snack bag's rustle, made here rather than recorded (no CC0 recording was to be had): about 0.7 s of tiny crackles,
// short bursts of high noise at random, thicker in the middle. Writes generated/sound/rustle.wav (44.1 kHz mono 16-bit).
//   node scripts/assets/sound/make-rustle.js
const fs = require('fs');
const path = require('path');
const { GENERATED_DIR } = require('../../lib/paths');

const RATE = 44100;
const LEN = 0.7;
const n = Math.round(RATE * LEN);
const out = new Float32Array(n);
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// crackles: more of them near the middle of the handful
for (let k = 0; k < 260; k++) {
  const t = Math.min(0.98, Math.max(0, 0.5 + (rand() + rand() + rand() - 1.5) * 0.45));
  const start = Math.floor(t * n);
  const dur = Math.floor(RATE * (0.0015 + rand() * 0.006));
  const amp = 0.15 + rand() * 0.55;
  let prev = 0;
  for (let i = 0; i < dur && start + i < n; i++) {
    const white = rand() * 2 - 1;
    const high = white - prev * 0.85; // a crude high-pass: plastic, not paper
    prev = white;
    out[start + i] += high * amp * Math.exp((-6 * i) / dur);
  }
}
// a soft rise and fall over the whole
for (let i = 0; i < n; i++) out[i] *= Math.sin((Math.PI * i) / n) ** 0.6;
const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const pcm = Buffer.alloc(44 + n * 2);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + n * 2, 4); pcm.write('WAVE', 8);
pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(RATE, 24); pcm.writeUInt32LE(RATE * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
pcm.write('data', 36); pcm.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round((out[i] / peak) * 0.8 * 32767), 44 + i * 2);
const dir = path.join(GENERATED_DIR, 'sound');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'rustle.wav'), pcm);
console.log('rustle.wav', pcm.length);
