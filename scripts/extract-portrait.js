const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', '캐릭터_스포트라이트_시트.png');
const OUT = path.join(__dirname, '..', 'src', 'assets', 'character', 'portrait-front.png');

// The big portrait sits on the sheet's plain white page, not on a lavender
// card like the sprite rows, so it can't be keyed by card color. Instead flood
// from the crop's edges through near-white pixels: whatever the fill reaches
// is background, while the white shirt and socks (walled in by the dark
// outline) are never reached and stay opaque.
const CROP = { left: 111, top: 64, width: 394, height: 628 };
const BG_DIST = 34; // distance from pure white still counted as background
const HALO_DIST = 90; // pale pixels touching the background: half-transparent, to soften the cut

async function main() {
  const { data, info } = await sharp(SRC)
    .extract(CROP)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  const distFromWhite = (i) => {
    const o = i * 4;
    return Math.hypot(255 - data[o], 255 - data[o + 1], 255 - data[o + 2]);
  };

  const isBg = new Uint8Array(W * H);
  const queue = [];
  const push = (x, y) => {
    const i = y * W + x;
    if (!isBg[i] && distFromWhite(i) < BG_DIST) {
      isBg[i] = 1;
      queue.push(i);
    }
  };
  for (let x = 0; x < W; x++) {
    push(x, 0);
    push(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    push(0, y);
    push(W - 1, y);
  }
  while (queue.length) {
    const i = queue.pop();
    const x = i % W;
    const y = (i - x) / W;
    if (x > 0) push(x - 1, y);
    if (x < W - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < H - 1) push(x, y + 1);
  }

  const out = Buffer.from(data);
  let removed = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (isBg[i]) {
        out[i * 4 + 3] = 0;
        removed++;
        continue;
      }
      const touchesBg =
        (x > 0 && isBg[i - 1]) || (x < W - 1 && isBg[i + 1]) || (y > 0 && isBg[i - W]) || (y < H - 1 && isBg[i + W]);
      if (touchesBg && distFromWhite(i) < HALO_DIST) out[i * 4 + 3] = 110;
    }
  }

  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);
  console.log(`wrote ${OUT} (${W}x${H}, ${((removed / (W * H)) * 100).toFixed(1)}% made transparent)`);
}

main();
