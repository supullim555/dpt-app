// Standalone and dependency-free on purpose: useAiClosing.ts imports this statically (every
// screen using the AI closing line needs to check it before deciding whether to even offer
// the feature), while localEngine.ts — which pulls in the ~6MB web-llm library — is only ever
// loaded dynamically, after this check passes. Importing anything from localEngine.ts here
// would defeat that split.
//
// Checks the actual value, not just key presence (`'gpu' in navigator` is true even when the
// property exists but is undefined/null — confirmed as a real gap via a headless-browser test
// that stubbed `navigator.gpu` as a getter returning undefined and found the app still offered
// the AI opt-in). `!!navigator.gpu` is the correct "can this actually be used" check.
export function hasWebGpu(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as Navigator & { gpu?: unknown }).gpu;
}
