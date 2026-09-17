const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const text = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const API_KEY = loadEnvLocal().GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

const REF_IMAGE = path.join(__dirname, '..', '캐릭터_스포트라이트_시트.png');
const OUT_FILE = path.join(__dirname, '..', 'walk-away-generated.png');

const PROMPT = `This image is a pixel-art character reference sheet for a small chibi mobile-game
character (brown long hair with a white star hair clip, white long-sleeve shirt,
navy blue sleeveless vest, dark grey pleated skirt, white knee-high socks, black
mary-jane shoes). It already has an IDLE-FRONT row and a WALK-SOUTH row.

Generate ONE new image: a horizontal sprite strip of exactly 4 frames showing this
SAME character walking AWAY from the viewer (back view only, like the second frame
of the WALK-SOUTH row in the reference, which shows the back of her head/hair — use
that exact back-view angle and color palette as the starting pose).

Requirements:
- Exactly 4 frames in a single horizontal row, each frame square and the same size
  as one cell of the reference sheet's grid.
- A natural walking cycle from behind: legs alternating mid-stride, slight arm
  swing, hair swaying gently side to side, subtle up-down bob.
- Same pixel-art resolution, line weight, color palette and proportions as the
  reference sheet — this must look like it belongs to the same sheet, not a
  different art style.
- Each frame's background must be plain solid white (#FFFFFF), no card, no
  rounded corners, no drop shadow, no grid lines, no text labels.
- No other content in the output image besides the 4 frames side by side.`;

async function main() {
  const imageB64 = fs.readFileSync(REF_IMAGE).toString('base64');

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: 'image/png', data: imageB64 } },
        ],
      },
    ],
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    console.error('HTTP', res.status, await res.text());
    process.exit(1);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p) => p.inlineData || p.inline_data);
  if (!imgPart) {
    console.error('No image returned. Full response:', JSON.stringify(json, null, 2));
    process.exit(1);
  }
  const data = (imgPart.inlineData || imgPart.inline_data).data;
  fs.writeFileSync(OUT_FILE, Buffer.from(data, 'base64'));
  console.log('wrote', OUT_FILE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
