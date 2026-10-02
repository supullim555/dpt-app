import { loadEntry, saveEntry } from '../storage/storage';

export type AiOptIn = 'unset' | 'on' | 'off';

const KEY = 'ai.local-opt-in';

export async function loadAiOptIn(): Promise<AiOptIn> {
  return (await loadEntry<AiOptIn>(KEY)) ?? 'unset';
}

export async function setAiOptIn(value: AiOptIn): Promise<void> {
  await saveEntry(KEY, value);
}
