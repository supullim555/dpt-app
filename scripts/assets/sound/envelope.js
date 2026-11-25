// How loud a 16-bit WAV is, every 100 ms (RMS, 0-100): a way to see a sound without hearing it.
//   node scripts/assets/sound/envelope.js file.wav
const fs = require('fs');

const b = fs.readFileSync(process.argv[2]);
let p = 12;
let fmt = null;
let data = null;
while (p < b.length) {
  const id = b.toString('ascii', p, p + 4);
  const n = b.readUInt32LE(p + 4);
  if (id === 'fmt ') fmt = { ch: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12) };
  if (id === 'data') data = b.subarray(p + 8, p + 8 + n);
  p += 8 + n + (n % 2);
}
const step = Math.round(fmt.rate / 10) * fmt.ch * 2;
const out = [];
for (let i = 0; i + step <= data.length; i += step) {
  let s = 0;
  for (let j = i; j < i + step; j += 2) s += (data.readInt16LE(j) / 32768) ** 2;
  out.push(Math.round(Math.sqrt(s / (step / 2)) * 100));
}
console.log(out.join(' '));
