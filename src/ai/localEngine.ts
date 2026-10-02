// Web-only. Loaded exclusively via dynamic `import('./localEngine')` from useAiClosing.ts after
// confirming Platform.OS === 'web' and hasWebGpu() (see webgpu.ts) — never imported statically,
// so this (and the ~6MB web-llm library it pulls in) never ships in a native bundle and is never
// fetched at all for a visitor who hasn't opted in or whose browser can't run it anyway.
import { CreateMLCEngine, hasModelInCache, type MLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';

// 1.5B, 4-bit quantized (~1.6GB VRAM per the model's own config) — the "light" tier: fast enough
// to run on a phone-class GPU, and Qwen2.5's multilingual training gives noticeably better Korean
// than similarly-sized Llama/Phi variants, which matters more here than raw parameter count.
export const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

export function isModelCached(): Promise<boolean> {
  return hasModelInCache(MODEL_ID);
}

// Module-level singleton: Home and the exercise-detail screen each call getEngine() on their own
// completion, but both should share one download/load rather than racing two separate ones.
let enginePromise: Promise<MLCEngine> | null = null;

export function getEngine(onProgress?: (report: InitProgressReport) => void): Promise<MLCEngine> {
  if (!enginePromise) {
    enginePromise = CreateMLCEngine(MODEL_ID, { initProgressCallback: onProgress }).catch((err) => {
      enginePromise = null; // let the next attempt retry instead of staying stuck on a rejected promise
      throw err;
    });
  }
  return enginePromise;
}

// Deliberately narrow: a closing *reaction* to what the user just wrote, not an open-ended chat
// partner. Keeps the app's "structure and questions only, never interprets" principle (§1) intact
// for the dialogue itself — only this one closing line is generated, and only after the user has
// opted in and the keyword safety gate (safety.ts) has passed.
const SYSTEM_PROMPT = `너는 "마음 연습" 앱 속 캐릭터야. 사용자가 방금 적은 답을 읽고 1~2문장으로 짧게 반응해.
규칙:
- 원인을 분석하거나 "그건 ~ 때문이에요" 같은 해석을 하지 않는다.
- "~해보세요", "~하는 게 좋겠어요" 같은 조언이나 지시를 하지 않는다.
- 상담사나 전문가처럼 말하지 않는다. 진단하지 않는다.
- 사용자가 쓴 내용을 들었다는 걸 보여주는 짧고 담담한 공감만 한다.
- 한국어로, 1~2문장. 이모지와 느낌표 남발 금지.`;

export async function generateReflection(answers: string[]): Promise<string> {
  const engine = await getEngine();
  const userText = answers.filter(Boolean).join('\n');
  const completion = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userText },
    ],
    temperature: 0.7,
    max_tokens: 80,
  });
  return completion.choices[0]?.message?.content?.trim() ?? '';
}
