/** Thrown by postJson when the request didn't finish within `timeoutMs`. */
export class RequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms.`);
    this.name = 'RequestTimeoutError';
  }
}

export type JsonResponse<T> = {
  ok: boolean;
  status: number;
  /** Parsed body, or null if the body wasn't JSON. */
  data: T | null;
};

/**
 * POSTs `body` as JSON and parses the reply, with a hard timeout (AbortController — works on web
 * and React Native alike). Without one, a stalled upstream left a screen waiting forever: the AI
 * chat's "듣고 있어요…" never cleared and the send button stayed disabled. Never throws for an HTTP
 * error status (inspect `ok`/`status`); throws only for a network failure or RequestTimeoutError.
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  { timeoutMs = 30_000 }: { timeoutMs?: number } = {}
): Promise<JsonResponse<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data: T | null = null;
    try {
      data = (await res.json()) as T;
    } catch {
      // non-JSON body: leave data null, the caller decides what that means
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    if (controller.signal.aborted) throw new RequestTimeoutError(timeoutMs);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
