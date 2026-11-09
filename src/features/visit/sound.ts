import { Platform } from 'react-native';

// Sound (v0.92), web only: a quiet piano loop under everything, and a few small sounds for steps, doors, the notebook
// and handing something over. All CC0 (public/sound/CREDITS.txt). Browsers let a page make sound only after a tap,
// so nothing plays until unlockSound() is called from one; until then, and anywhere it can't work, every call here
// quietly does nothing.

const WEB = Platform.OS === 'web' && typeof window !== 'undefined';
const EFFECTS = { step: ['step0', 'step1', 'step2', 'step3'], door: ['door'], page: ['page'], give: ['give'] } as const;
export type Effect = keyof typeof EFFECTS;
const VOLUME: Record<Effect, number> = { step: 0.35, door: 0.5, page: 0.6, give: 0.6 };
const MUSIC_VOLUME = 0.28;

let on = true;
let ctx: AudioContext | null = null;
let music: HTMLAudioElement | null = null;
const buffers = new Map<string, AudioBuffer>();
let stepTurn = 0;

async function load(name: string) {
  if (!ctx || buffers.has(name)) return;
  try {
    const data = await (await fetch(`/sound/${name}.wav`)).arrayBuffer();
    buffers.set(name, await ctx.decodeAudioData(data));
  } catch {
    // no sound for this one; the game goes on
  }
}

/** From inside a tap: sound may start from here on. Loads the small sounds and starts the music if it's on. */
export function unlockSound() {
  if (!WEB) return;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      for (const names of Object.values(EFFECTS)) for (const n of names) void load(n);
      document.addEventListener('visibilitychange', () => {
        if (!music) return;
        if (document.hidden) music.pause();
        else if (on) void music.play().catch(() => {});
      });
    }
    if (ctx.state === 'suspended') void ctx.resume();
    if (on) startMusic();
  } catch {
    ctx = null;
  }
}

function startMusic() {
  if (!WEB) return;
  if (!music) {
    music = new Audio('/sound/music.webm');
    music.loop = true;
    music.volume = MUSIC_VOLUME;
  }
  void music.play().catch(() => {});
}

export function setSoundOn(value: boolean) {
  on = value;
  if (!WEB) return;
  if (!value) music?.pause();
  else if (ctx) startMusic();
}

export function play(effect: Effect) {
  if (!on || !ctx) return;
  const names = EFFECTS[effect];
  const name = names.length > 1 ? names[stepTurn++ % names.length] : names[0];
  const buffer = buffers.get(name);
  if (!buffer) return;
  try {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = VOLUME[effect];
    source.buffer = buffer;
    source.connect(gain).connect(ctx.destination);
    source.start();
  } catch {
    // a sound that can't play is no reason to stop
  }
}
