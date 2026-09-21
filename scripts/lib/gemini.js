const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const MODEL = 'gemini-2.5-flash-image';
const REF_SHEET = path.join(__dirname, '..', '..', '캐릭터_스포트라이트_시트.png');

function loadApiKey() {
  const text = fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^GEMINI_API_KEY="?([^"\r\n]*)"?\s*$/);
    if (m) return m[1];
  }
  throw new Error('GEMINI_API_KEY not found in .env.local');
}

// One image-generation call. Sends the prompt plus a reference image (default:
// the whole character sheet, shrunk to keep the upload small) as the style guide.
// NOT retried on failure: every call is billed.
async function generateImage(prompt, refPath = REF_SHEET) {
  const ref = await sharp(refPath).resize({ width: 1280, withoutEnlargement: true }).png().toBuffer();
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/png', data: ref.toString('base64') } },
        ],
      },
    ],
  };
  // Key goes in a header, not the URL, so it can't leak into error output.
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': loadApiKey() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData || p.inline_data);
  if (!img) {
    const why = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason || 'unknown';
    throw new Error(`No image returned (${why})`);
  }
  return Buffer.from((img.inlineData || img.inline_data).data, 'base64');
}

module.exports = { generateImage };
