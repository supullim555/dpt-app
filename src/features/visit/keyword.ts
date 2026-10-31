// Finds the one word the girl mentions back ("보고서 얘기구나."). This is the no-AI rule version; an
// on-device model can later suggest the word instead (docs/병문안_기획서.md §7), through the same
// validateKeyword gate. Nothing here ever writes a sentence. No imports, for check-visit-logic.mjs.

const JOSA = /(에서는|에서|에게|한테|으로|이랑|랑|하고|까지|부터|보다|처럼|마다|은|는|이|가|을|를|에|의|도|만|와|과|로)$/;
const NOT_A_TOPIC = new Set([
  '오늘', '어제', '내일', '하루', '그냥', '요즘', '사실', '진짜', '너무', '기분', '생각', '마음', '별일',
  '아무', '아무도', '오랜만', '내가', '나는', '내', '나', '너', '네가', '약', '피', '칼', '술',
]);
const UNSAYABLE = /(죽|자살|자해|유서|목숨|시체)/;

/** A word may only be said back if it's verbatim in what the player wrote and is safe to repeat. */
export function validateKeyword(word: string, text: string): string | null {
  const w = word.trim();
  if (!w || !text.includes(w) || NOT_A_TOPIC.has(w) || UNSAYABLE.test(w)) return null;
  return w;
}

export function findKeyword(text: string): string | null {
  for (const raw of text.replace(/[^가-힣\s]/g, ' ').split(/\s+/).filter(Boolean)) {
    const stem = raw.replace(JOSA, '');
    if (stem === raw) continue; // only a word visibly carrying a josa is confidently a noun
    if (stem.length < 2 || stem.endsWith('다')) continue; // "산책시키다가" is a verb, not a topic
    const ok = validateKeyword(stem, text);
    if (ok) return ok;
  }
  return null;
}
