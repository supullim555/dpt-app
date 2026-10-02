// A gate on whether to let the local model generate anything at all — never on what it's allowed
// to say. If an answer matches, the caller skips generation entirely and keeps the fixed closing
// line (CrisisFooter is already always on screen wherever this runs). Purely on-device, nothing
// here is stored or transmitted — the same "no one reads the text" posture as §8's score-based
// gate.ts trigger, just applied to this new free-form-generation surface specifically because an
// untuned 1.5B model has no safety training we've verified and shouldn't be the one responding
// to a crisis disclosure.
const CRISIS_PATTERNS = [
  /자살/,
  /자해/,
  /죽고\s*싶/,
  /죽어버리고\s*싶/,
  /끝내고\s*싶/,
  /사라지고\s*싶/,
  /살고\s*싶지\s*않/,
  /살기\s*싫/,
];

export function containsCrisisLanguage(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}
