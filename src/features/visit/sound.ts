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
// v0.93: a remembered place's own sound in place of the music (Hospital.tsx PLACE_SOUND)
type Ambience = 'river' | 'waves' | 'birds' | 'crickets';
let ambience: Ambience | null = null;
// v0.96: through Web Audio, looped over exactly its own length: an <audio> loop paused for a moment each time round, and
// the encoded file has a little silence padded on its end (the crickets' gap)
let ambienceVoice: { stop: () => void } | null = null;
let ambienceTurn = 0;
const AMBIENCE_LENGTH: Record<Ambience, number> = { river: 40, waves: 24, birds: 26, crickets: 10.2 };
// v0.96: about as loud as the music (the river came in at twice it)
const AMBIENCE_VOLUME: Record<Ambience, number> = { river: 0.16, waves: 0.2, birds: 0.3, crickets: 0.32 };
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
        if (document.hidden) {
          music?.pause();
          stopAmbience();
        } else if (on) playBed();
      });
    }
    if (ctx.state === 'suspended') void ctx.resume();
    if (on) playBed();
  } catch {
    ctx = null;
  }
}

function loop(src: string, volume: number) {
  const el = new Audio(src);
  el.loop = true;
  el.volume = volume;
  return el;
}

function stopAmbience() {
  ambienceTurn++;
  ambienceVoice?.stop();
  ambienceVoice = null;
}

async function startAmbience(a: Ambience) {
  const turn = ++ambienceTurn;
  try {
    if (!ctx) return;
    let buffer = buffers.get(`ambience:${a}`);
    if (!buffer) {
      buffer = await ctx.decodeAudioData(await (await fetch(`/sound/${a}.webm`)).arrayBuffer());
      buffers.set(`ambience:${a}`, buffer);
    }
    if (turn !== ambienceTurn || !ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = Math.min(buffer.duration, AMBIENCE_LENGTH[a]);
    const gain = ctx.createGain();
    gain.gain.value = AMBIENCE_VOLUME[a];
    source.connect(gain).connect(ctx.destination);
    source.start();
    ambienceVoice = {
      stop: () => {
        try {
          source.stop();
        } catch {
          // already stopped
        }
      },
    };
  } catch {
    // a browser that can't decode it here plays it the plain way, gap and all
    if (turn !== ambienceTurn) return;
    const el = loop(`/sound/${a}.webm`, AMBIENCE_VOLUME[a]);
    void el.play().catch(() => {});
    ambienceVoice = { stop: () => el.pause() };
  }
}

// Whatever lies under everything right now: the place's own sound if it has one, else the music.
function playBed() {
  if (!WEB || !ctx) return;
  if (ambience) {
    music?.pause();
    if (!ambienceVoice) void startAmbience(ambience);
  } else {
    stopAmbience();
    if (!music) music = loop('/sound/music.webm', MUSIC_VOLUME);
    void music.play().catch(() => {});
  }
}

/** A place's own sound instead of the music, or null to have the music back. */
export function setAmbience(next: Ambience | null) {
  if (next === ambience) return;
  stopAmbience();
  ambience = next;
  if (on) playBed();
}

export const soundIsOn = () => on;

export function setSoundOn(value: boolean) {
  on = value;
  if (!WEB) return;
  if (!value) {
    music?.pause();
    stopAmbience();
  } else playBed();
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
