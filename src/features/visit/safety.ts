// Checked before anything else looks at what the player wrote. A match means the girl's usual lines
// stop and a fixed response with the crisis numbers shows instead. This list WILL miss phrasings, so
// CrisisFooter stays on every visit screen regardless, and the list needs expert review before this
// goes public (docs/병문안_기획서.md §8). No imports, for check-visit-logic.mjs.
const RISK =
  /(죽고\s*싶|죽어\s*버리|죽을까|자살|자해|목숨|유서|뛰어내리|투신|손목|긋고|살고\s*싶지\s*않|그만\s*살|못\s*살겠|살기\s*싫|사라지고\s*싶|사라졌으면|없어지면|없어졌으면|없어도\s*돼|영원히\s*잠|깨어나지\s*않|수면제|(약|알약).{0,12}(모아|먹을까|몇\s*알)|마지막이었으면|끝내고\s*싶|다\s*끝내|다\s*포기)/;

export function soundsLikeCrisis(text: string): boolean {
  return RISK.test(text);
}
