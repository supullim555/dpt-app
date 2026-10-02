import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { loadAiOptIn, setAiOptIn, type AiOptIn } from './preference';
import { containsCrisisLanguage } from './safety';
import { hasWebGpu } from './webgpu';

const ENGINE_LOAD_TIMEOUT_MS = 120_000; // first-time model download; generous on purpose
const GENERATION_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

type AiClosing = {
  /** What to show as the character's closing line — the local-AI reply once ready, the fixed
   * line otherwise. Never blank, never a loading state: the fixed line is the starting value. */
  closingText: string;
  /** True while the model is loading for the very first time (a real download) — show a brief
   * "준비하는 중" note, not a spinner over the whole screen; the fixed line is already showing. */
  downloadProgress: number | null;
  /** Ask once, the first time a dialogue completes, if the opt-in choice has never been made
   * (and only where WebGPU exists — otherwise this is always false and nothing is ever asked). */
  showOptIn: boolean;
  /** True from the moment a reply starts generating (including a first-time model download)
   * until it resolves one way or another. The caller should keep its closing panel open while
   * this is true, rather than auto-dismissing on its usual short timer — otherwise a slow first
   * download finishes after the panel (and the reply with it) is already gone. */
  busy: boolean;
  accept: () => void;
  decline: () => void;
};

/**
 * The local-AI closing line for a just-finished dialogue (§22's "ai를 로컬로 받아서 적용" feature).
 * `completedAnswers` should stay null until the moment a dialogue finishes, then be set once to
 * that answer set — this hook reacts to that single transition, not to every render.
 *
 * Deliberately narrow in scope: this only ever produces ONE short reaction line layered on top of
 * the existing scripted question flow, which is untouched. Everything here degrades silently to
 * `fallback` — not opted in, no WebGPU, native app, crisis keywords present, timeout, or any
 * engine error — so a user who never opts in sees exactly the app's original fixed closing line.
 */
export function useAiClosing(fallback: string, completedAnswers: string[] | null): AiClosing {
  const supported = Platform.OS === 'web' && hasWebGpu();
  const [optIn, setOptInState] = useState<AiOptIn>('unset');
  const [optInLoaded, setOptInLoaded] = useState(false);
  const [text, setText] = useState(fallback);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadAiOptIn().then((v) => {
      setOptInState(v);
      setOptInLoaded(true);
    });
  }, []);

  // Keep showing the current fixed line (e.g. the gate's vs. a given exercise's own wording)
  // until a generated reply, if any, actually arrives for THIS completion.
  useEffect(() => {
    setText(fallback);
  }, [fallback]);

  useEffect(() => {
    if (!completedAnswers || optIn !== 'on' || !supported) return;
    if (completedAnswers.some(containsCrisisLanguage)) return; // stays on the fixed line
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const mod = await import('./localEngine');
        await withTimeout(
          mod.getEngine((report) => {
            if (!cancelled) setProgress(report.progress);
          }),
          ENGINE_LOAD_TIMEOUT_MS
        );
        if (cancelled) return;
        setProgress(null);
        const reply = await withTimeout(mod.generateReflection(completedAnswers), GENERATION_TIMEOUT_MS);
        if (!cancelled && reply) setText(reply);
      } catch {
        // Quiet enhancement, not a requirement — the fixed line set above already covers this.
        if (!cancelled) setProgress(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedAnswers, optIn, supported]);

  return {
    closingText: text,
    downloadProgress: progress,
    showOptIn: optInLoaded && optIn === 'unset' && supported,
    busy,
    accept: () => {
      setOptInState('on');
      setAiOptIn('on');
    },
    decline: () => {
      setOptInState('off');
      setAiOptIn('off');
    },
  };
}
