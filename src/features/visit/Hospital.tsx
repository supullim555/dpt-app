import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { VISIT_DEV } from './flag';
import { girlOn, PIN_ON } from './girlDays';
import { createHospitalScene, type FocusTarget, type HospitalScene, type HospitalSprite, type SpriteLook } from './hospitalScene';
import { ahead, ALONG_THE_WALLS, ON_THE_WALLS, arrival, arrowFor, BEDSIDE, CLUE_CELLS, HIDDEN_CLUE, DOCTOR_FRONT, ENTRANCE, enterPlace, FLOOR_ORDER, GIRL_FRONT, goalFor, HOSPITAL, LIFT_FRONT, OUTSIDE_ROOM, placeName, ROOM_ENTRY, SHOP_FRONT, STAIRS_FRONT, stepped, thingAt, turn, tutorialAfter, tutorialGoal, type Dir, type FloorNo, type Pose, type Thing, type TutorialStep } from './hospitalMap';
import PaperButton from './PaperButton';
import { clueOn, CLUES, type ClueId } from './progress';
import { boughtLine, CLUE_SPOT, linesOn, CLUE_TEXT, FLOORS, FOLLOW_LIGHT, GIFTS, GUIDE_FIRST_LINES, HINT_TITLE, hintLines, PEOPLE, ROOM_SHUT, SOLD_TODAY, TUTORIAL_OK, TUTORIAL_SKIP, TUTORIAL_TIPS, TUTORIAL_TITLE, nextDayQuestion, untilTomorrow, WRITE_CRISIS, WRITE_FAILED, WRITE_OWN, WRITE_WAITING } from './script';
import { doctorTalk, personTalk, requestGoal, REQUESTS, type Request, type Talk } from './requests';
import BreatheTogether from './BreatheTogether';
import { PLACES, type Place } from './places';
import Minimap from './Minimap';
import { soundsLikeCrisis } from './safety';
import { sendPersonaMessage, type ChatMessage } from '@/features/ai';
import { play, setAmbience } from './sound';
import { makeSubmitOnEnterHandler } from '@/core/hooks/useSubmitOnEnter';

const AMBER = '#d9a441';
const LIFT_MS = 1100;
const STAIRS_MS = 700;
const ARROWS = ['↑', '→', '↓', '←'];
/** Hours and minutes left until the date changes here, when the next day opens. */
function timeToMidnight(): [number, number] {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const minutes = Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 60000));
  return [Math.floor(minutes / 60), minutes % 60];
}
// A phone or tablet is told about the buttons on the screen; a computer about its keys as well.
const TOUCH = Platform.OS !== 'web' || (typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
// The letter keys by where they sit, so they still work with the keyboard set to Hangul.
const KEY_AT: Record<string, string> = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd' };
const PROP_ON_FLOOR: Record<number, SpriteLook> = { 3: 'gurney', 2: 'cart', 1: 'vending' };
const MEMORY_MS = 2600;

/** Someone's remembered day, walked through: whose, how far in, and where you were in the hospital before it. */
type Memory = { request: Request; place: Place; stage: 'meet' | 'lost'; back: Pose; step: number };
const GIRL_CELL = { x: GIRL_FRONT.x, y: GIRL_FRONT.y + 1 };
// However long the camera takes to come in from the door, and when she turns to you: after it's there, so you
// get to see her as she was.
const ENTER_MS = 2200;
const TURN_AFTER_MS = 2800;
const BAR_H = 54;
// How far above her waist the drawing of her head and shoulders starts.
const BUST_UP = 0.06;
const LYING_FROM = -0.19;
const BED_HEAD = 0.46;
const BED_FOOT = -0.2;
// Off the middle of the room, toward the wall with the window: her bed and everything on it.
const BED_X = 0.4;
// A chair backs onto the wall it's beside, facing the room.
// Just off the wall, so it's never lost in it; and how high the bottom of each hangs (the ceiling is at 1.25).
const WALL_GAP = 0.485;
const HANG_AT = { noticeBoard: 0.4, hillsPicture: 0.46, wallClock: 0.8, sanitizer: 0.42 } as const;
const awayFromWall = (across: number, along: number): Dir => (along > 0 ? 0 : along < 0 ? 2 : across > 0 ? 3 : 1);
// Against the lobby's south wall, the floor guide on the wall behind (v0.78; it stood out in the middle before).
const GUIDE_CELL = { x: 5, y: 6 };
const SHOPKEEPER_CELL = { x: 10, y: 1 };
const SHOP_DOOR = { x: 9, y: 3 };
// Further back, so whoever came in to send you out is in the picture too.
const STAFF_FOCUS: FocusTarget = { cell: GIRL_CELL, height: 0.62, away: 1.3 };
const PERSON_FOCUS = { height: 0.64, away: 0.86 };

type Props = {
  day: number;
  run: number;
  fontScale: number;
  light: string;
  /** She's been seen today: you've been sent out, and the goal is the rest of the hospital. */
  doneToday: boolean;
  boughtToday: boolean;
  found: readonly ClueId[];
  floorsSeen: readonly number[];
  onSeeFloor: (floor: number) => void;
  /** You came through her door. */
  onEnterRoom: () => void;
  onBuy: (gift: string) => void;
  onFind: (clue: ClueId) => void;
  onNextDay: () => void;
  /** Whether you've been to the doctor's room since she was seen today. */
  metDoctor: boolean;
  onMeetDoctor: () => void;
  /** The doctor's requests by their day: taken on, and settled. */
  asked: readonly number[];
  solved: readonly number[];
  onAccept: (request: number) => void;
  onSolve: (request: number) => void;
  /** Turned AI on: whoever a request is about can also be written to, and Gemini answers as them. */
  aiOn: boolean;
  onTitle: () => void;
  tutorial: TutorialStep;
  onTutorial: (step: TutorialStep) => void;
  /** Something written to someone sounded like a crisis, and their fixed answer is showing: the hotlines stand out meanwhile. */
  onCrisis?: (showing: boolean) => void;
  /** Set while the story has you at her bedside: no walking, and the panel below takes the controls' place. */
  bedside?: { below: ReactNode; bubble?: string; more?: boolean; onPress?: () => void; girlHere: boolean; staffIn: boolean; arriving?: string };
};

type Panel = 'none' | 'map' | 'lift' | 'stairs' | 'leave' | 'tomorrow';
/** Who or what the view has come in close on, until you go back. */
type Focused =
  // `talk`: a conversation with choices (requests.ts), at stretch `node`; `lines` are that stretch's.
  | { kind: 'person'; id: string; name: string; lines: string[]; index: number; shop: boolean; talk?: Talk; node?: string }
  | { kind: 'thing'; text: string };

const Bubble = ({ text, more, fontScale, name }: { text: string; more?: boolean; fontScale: number; name?: string }) => (
  <View style={styles.bubbleWrap} pointerEvents="none">
    <View style={styles.bubble}>
      {name ? <Text style={styles.bubbleName}>{name}</Text> : null}
      <Text style={[styles.bubbleText, { fontSize: 15 * fontScale, lineHeight: 22 * fontScale }]}>{text}</Text>
      {more && <Text style={styles.more}>▼</Text>}
    </View>
    <View style={styles.bubbleTail} />
  </View>
);

// The hospital on foot (docs/병원_지도.md): a step or a quarter turn at a time. Stand in front of someone or
// something and you can press it: the view comes in close, they speak or it's described, and 뒤로가기 lets
// you move again. There's no time limit and nothing to fail. The view itself is hospitalScene.ts; if it
// can't run, the floor plan takes its place and walking still works.
export default function Hospital({ day, run, fontScale, light, doneToday, boughtToday, found, floorsSeen, onSeeFloor, onEnterRoom, onBuy, onFind, onNextDay, metDoctor, onMeetDoctor, asked, solved, onAccept, onSolve, aiOn, onTitle, tutorial, onTutorial, onCrisis, bedside }: Props) {
  const [pose, setPose] = useState<Pose>(bedside ? BEDSIDE : doneToday ? OUTSIDE_ROOM : ENTRANCE);
  const [note, setNote] = useState(doneToday ? FLOORS[4].line : '');
  const [focused, setFocused] = useState<Focused | null>(null);
  const [shopLine, setShopLine] = useState('');
  const [panel, setPanel] = useState<Panel>('none');
  const [hintOpen, setHintOpen] = useState(false);
  const [transit, setTransit] = useState('');
  const [noView, setNoView] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [relaxMode, setRelaxMode] = useState<'breath' | 'muscle' | 'ground'>('breath');
  const [memory, setMemory] = useState<Memory | null>(null);
  // In someone's remembered day, what goes through their head: the newest, and the one before it, fainter.
  const [thoughts, setThoughts] = useState<string[]>([]);
  const thoughtIn = useRef(new Animated.Value(1)).current;
  const think = (line: string, keep = true) => {
    setThoughts((t) => (keep ? [...t.slice(-1), line] : [line]));
    thoughtIn.setValue(0);
    Animated.timing(thoughtIn, { toValue: 1, duration: 600, useNativeDriver: false }).start();
  };
  // Writing to someone yourself: the draft, and their answer (or that it's coming), shown in place of their line.
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');
  const [aside, setAside] = useState<string | null>(null);
  const crisisShowing = aside === WRITE_CRISIS;
  useEffect(() => onCrisis?.(crisisShowing), [crisisShowing, onCrisis]);
  const written = useRef<ChatMessage[]>([]);
  // The step whose explanation has been read in the middle of the screen; after that it waits small at the bottom.
  const [lessonRead, setLessonRead] = useState<TutorialStep | null>(null);

  const host = useRef<View>(null);
  const scene = useRef<HospitalScene | null>(null);
  const busy = useRef(false);
  // Has she turned to you yet? Walking up the corridor she hasn't; come in and she does.
  const turned = useRef(bedside !== undefined);
  const talking = focused?.kind === 'person';
  // v0.93: whether you've fallen on the parallel bars yet, in this remembering of it
  const fell = useRef(false);
  // v0.93: floors where the hidden thing has been turned up today (HIDDEN_CLUE)
  const [uncovered, setUncovered] = useState<number[]>([]);
  const latest = useRef({ pose, bedside, doneToday, found, day, talking, memory, uncovered });
  latest.current = { pose, bedside, doneToday, found, day, talking, memory, uncovered };
  const bars = useRef(new Animated.Value(0)).current;
  // v0.93: the river runs under the first request's memory, in place of the music
  const memoryPlace = memory?.request.memory.place;
  useEffect(() => {
    setAmbience(memoryPlace === 'river' ? 'river' : null);
    return () => setAmbience(null);
  }, [memoryPlace]);

  const clue = clueOn(day, pose.floor);
  const clueLying = clue !== null && !found.includes(clue.id);
  const stillHidden = clueLying && !!HIDDEN_CLUE[pose.floor] && !uncovered.includes(pose.floor);
  const clueHere = clueLying && !stillHidden;
  const atBedside = bedside !== undefined;
  const roomShut = doneToday;

  const spritesFor = (floor: FloorNo): HospitalSprite[] => {
    const now = latest.current;
    const out: HospitalSprite[] = [];
    HOSPITAL[floor].map.forEach((row, y) =>
      [...row].forEach((c, x) => {
        // In a remembered place, whoever you meet first (k), and later the one you reach again (j): each only in their turn.
        const place = floor === 0 ? now.memory?.place : undefined;
        const person = place ? (c === 'k' || c === 'j' ? place.people[c] : undefined) : PEOPLE[`${floor}${c}`];
        const away = !!place && (c === 'k' ? now.memory?.stage !== 'meet' : c === 'j' ? now.memory?.stage !== 'lost' : false);
        if (person && `${floor}${c}` !== '4r' && !away) out.push({ cell: { x, y }, look: person.look as SpriteLook });
        const thing = place?.things[c];
        if (thing?.solid) {
          // v0.93: a stall built in 3D, and what it sells on top of it
          out.push({ cell: { x, y }, look: thing.solid as SpriteLook, face: thing.face ?? 2 });
          if (thing.look) out.push({ cell: { x, y }, look: thing.look as SpriteLook, shift: [0, 0.02, thing.on ?? 0.3] });
        } else if (thing?.look) out.push({ cell: { x, y }, look: thing.look as SpriteLook, ...(thing.face !== undefined ? { fixed: true, face: thing.face } : {}) });
        if (c === '%' && floor > 0) out.push({ cell: { x, y }, look: PROP_ON_FLOOR[floor] });
        // in a remembered place the tree stands back, behind what's under it (the market's rice cakes)
        if (c === 'T') out.push({ cell: { x, y }, look: 'tree', ...(floor === 0 ? { shift: [0.25, -0.48, 0] as [number, number, number] } : {}) });
        if (c === '&') out.push({ cell: { x, y }, look: 'sofaBox', face: floor === 4 ? 1 : 0 });
        if (c === '^') out.push({ cell: { x, y }, look: 'plant' });
      })
    );
    for (const d of ALONG_THE_WALLS[floor]) out.push({ cell: { x: d[0], y: d[1] }, look: d[2], shift: [d[3], d[4], 0], face: awayFromWall(d[3], d[4]) });
    // flat against the wall, at the height each would hang, facing out of it
    for (const [x, y, look, d] of ON_THE_WALLS[floor]) {
      const across = d === 1 ? WALL_GAP : d === 3 ? -WALL_GAP : 0;
      const along = d === 2 ? WALL_GAP : d === 0 ? -WALL_GAP : 0;
      out.push({ cell: { x, y }, look, shift: [across, along, HANG_AT[look]], fixed: true, face: awayFromWall(across, along) });
    }
    if (floor === 1) {
      // The front desk, between you and whoever's at it, and the shop's counter. Each sign sticks out over the
      // lobby, so you can see it coming along the corridor.
      out.push({ cell: GUIDE_CELL, look: 'deskBox', shift: [0, -0.2, 0], face: 0 });
      // Close up, talking to someone, it would hang across the top of the picture.
      if (!now.talking) out.push({ cell: GUIDE_CELL, look: 'signGuide', shift: [0, -0.62, 0.98], fixed: true });
      out.push({ cell: SHOPKEEPER_CELL, look: 'counterBox', shift: [0, 0.26, 0], face: 2 });
      // v0.93: further out over the corridor, so it's seen from down the lobby
      out.push({ cell: SHOP_DOOR, look: 'signShop', shift: [0, 0.85, 0.98], fixed: true });
    }
    // v0.93: the 3F nurse behind her desk at the back of the station's way in, spoken to from in front of it
    if (floor === 3) out.push({ cell: { x: 7, y: 6 }, look: 'deskBox', shift: [0, -0.2, 0], face: 0 });
    if (floor === 4) {
      // The doctor sits behind his desk, drawn from the waist up: you only ever see him from in front of it.
      out.push({ cell: { x: DOCTOR_FRONT.x, y: DOCTOR_FRONT.y + 1 }, look: 'doctor', shift: [0, 0.06, 0.31] });
      out.push({ cell: { x: DOCTOR_FRONT.x, y: DOCTOR_FRONT.y + 1 }, look: 'doctorDeskBox', shift: [0, -0.24, 0], face: 0 });
      // One bed, seen from its foot: the head far enough back that she can tip onto the pillows without going
      // through it, the mattress flat from there to the rail in front.
      out.push({ cell: GIRL_CELL, look: 'bed', shift: [BED_X, BED_HEAD, 0.28], fixed: true });
      out.push({ cell: GIRL_CELL, look: 'mattress', shift: [BED_X, BED_FOOT, 0.27], lean: -1.45, fixed: true });
      out.push({ cell: GIRL_CELL, look: 'cabinetBox', shift: [BED_X - 0.72, BED_HEAD - 0.1, 0], face: 0 });
      out.push({ cell: GIRL_CELL, look: 'chairBox', shift: [-0.9, -0.2, 0], face: 1 });
      out.push({ cell: GIRL_CELL, look: 'bedFront', shift: [BED_X, BED_FOOT, 0], fixed: true });
      const g = girlOn(now.day);
      if (g.leaves) out.push({ cell: GIRL_CELL, look: 'leaves', shift: g.body ? [BED_X + 0.3, 0.36, 0.33] : [BED_X + 0.24, 0.22, 0.5], fixed: true });
      if (now.bedside?.girlHere !== false) {
        const look = turned.current ? g.headTo : g.headFrom;
        // Up the tipped paper, from her waist.
        const along = (from: number, by: number): [number, number] => [from + by * Math.cos(g.lean), -by * Math.sin(g.lean)];
        // A lying drawing starts at the rail at the foot of the bed; a head and shoulders, just in front of her body.
        const [bustUp, bustBack] = g.body ? along(g.up, BUST_UP) : [g.up, 0];
        const y = g.body ? 0.02 + bustBack - 0.012 : LYING_FROM;
        if (g.body) out.push({ cell: GIRL_CELL, look: g.body, shift: [BED_X, 0.02, g.up - 0.04], lean: g.lean, fixed: true });
        out.push({ cell: GIRL_CELL, look, id: 'head', shift: [BED_X, y, bustUp], lean: g.lean, fixed: true });
        const pin = PIN_ON[look];
        if (pin) {
          const [pinUp, pinBack] = along(bustUp, pin[1]);
          out.push({ cell: GIRL_CELL, look: g.body ? 'pin' : 'pinSmall', id: 'pin', shift: [BED_X + pin[0], y + pinBack - 0.012, pinUp], fixed: true });
        }
        // over her lap, or the bottom of the drawing of her would show on the mattress
        if (g.body) out.push({ cell: GIRL_CELL, look: 'blanket', shift: [BED_X, -0.06, 0.12], fixed: true });
        if (g.drip) out.push({ cell: GIRL_CELL, look: 'drip', shift: [BED_X - 0.47, 0.3, 0], fixed: true });
        if (g.notebook) out.push({ cell: GIRL_CELL, look: 'notebook', shift: [BED_X + 0.06, -0.14, 0.33], fixed: true });
      }
      // v0.93: between the bed and the cabinet, in front, so she's in the frame whichever way the view comes in
      if (now.bedside?.staffIn) out.push({ cell: GIRL_CELL, look: 'nurse', shift: [-0.2, -0.05, 0] });
    }
    const lying = clueOn(now.day, floor);
    if (lying && !now.found.includes(lying.id) && (!HIDDEN_CLUE[floor] || now.uncovered.includes(floor))) out.push({ cell: CLUE_CELLS[floor], look: lying.id });
    return out;
  };

  const herFocus = (): FocusTarget => {
    const g = girlOn(latest.current.day);
    return { cell: GIRL_CELL, side: BED_X, height: g.height, away: g.away, eye: g.eye };
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setNoView(true);
      return;
    }
    let gone = false;
    (async () => {
      try {
        const made = await createHospitalScene(host.current as unknown as HTMLElement, light);
        if (gone) made?.dispose();
        else if (made) {
          scene.current = made;
          const now = latest.current;
          made.showFloor(now.pose.floor, spritesFor(now.pose.floor), now.pose, now.doneToday);
          if (now.bedside) made.focus(now.bedside.staffIn ? STAFF_FOCUS : herFocus(), 0);
        } else setNoView(true);
      } catch {
        if (!gone) setNoView(true);
      }
    })();
    return () => {
      gone = true;
      scene.current?.dispose();
      scene.current = null;
    };
    // The view lives as long as the screen; later changes reach it through the calls below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scene.current?.setSprites(spritesFor(pose.floor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found.length, bedside?.girlHere, bedside?.staffIn, talking, uncovered.length]);

  // The black bars of a scene, sliding in over the view while you come in and away once she speaks.
  const inScene = bedside?.arriving !== undefined;
  useEffect(() => {
    Animated.timing(bars, { toValue: inScene ? 1 : 0, duration: 380, useNativeDriver: false }).start();
  }, [inScene, bars]);

  useEffect(() => {
    scene.current?.setLight(light);
  }, [light]);

  // Into the talk, and back out of it: sent out through the door, which shuts behind you.
  const wasAtBedside = useRef(atBedside);
  useEffect(() => {
    if (atBedside && !wasAtBedside.current) {
      setFocused(null);
      setPose(BEDSIDE);
      scene.current?.focus(herFocus(), ENTER_MS);
      // She turns toward the door once you're close enough to see it.
      const g = girlOn(day);
      const timer = setTimeout(() => {
        turned.current = true;
        if (g.headFrom === g.headTo) return;
        // the pin belongs to a head, so it goes while the head turns and comes back with the new one
        scene.current?.setSprites(spritesFor(4).filter((s) => s.id !== 'pin').map((s) => (s.id === 'head' ? { ...s, look: g.headFrom } : s)));
        scene.current?.flip('head', g.headTo);
        setTimeout(() => scene.current?.setSprites(spritesFor(4)), 360);
      }, TURN_AFTER_MS);
      wasAtBedside.current = true;
      return () => clearTimeout(timer);
    } else if (!atBedside && wasAtBedside.current) {
      setPose(OUTSIDE_ROOM);
      setNote(FLOORS[4].line);
      turned.current = false;
      scene.current?.showFloor(4, spritesFor(4), OUTSIDE_ROOM, true);
    }
    wasAtBedside.current = atBedside;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atBedside]);

  useEffect(() => {
    // Her own focus is set by the way in; only someone coming in to send you out moves the view from here.
    if (atBedside && bedside?.staffIn) scene.current?.focus(STAFF_FOCUS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bedside?.staffIn]);

  const moveTo = (next: Pose) => {
    busy.current = true;
    if (memory?.stage !== 'lost') setNote('');
    setPose(next);
    // Through her door: from here on the view comes in on her without being asked.
    const arrived = () => {
      busy.current = false;
      if (next.floor === 4 && next.x === ROOM_ENTRY.x && next.y === ROOM_ENTRY.y && !doneToday) onEnterRoom();
    };
    if (scene.current) scene.current.moveTo(next, arrived);
    else arrived();
  };

  const blocked = () => busy.current || atBedside || focused !== null || panel !== 'none' || transit !== '';
  const facingShutDoor = roomShut && pose.floor === 4 && pose.x === ROOM_ENTRY.x && pose.y === ROOM_ENTRY.y && pose.dir === 2;
  const nextStep = facingShutDoor ? null : stepped(pose);
  const forward = () => {
    if (blocked() || !nextStep) return;
    play('step');
    // v0.93: halfway along the parallel bars, the first time: down, and up again
    const b = memory?.stage === 'lost' ? memory.place.bars : undefined;
    if (b && !fell.current && nextStep.y === b.row && nextStep.x === b.fallAt) {
      fell.current = true;
      busy.current = true;
      setPose(nextStep);
      const s = scene.current;
      if (!s) busy.current = false;
      else
        s.moveTo(nextStep, () => {
          think(b.fallLine);
          s.fall(() => (busy.current = false));
        });
      return;
    }
    moveTo(nextStep);
    if (memory?.stage === 'lost') {
      const step = memory.step + 1;
      setMemory({ ...memory, step });
      const lines = memory.request.memory.thoughts;
      if (step < lines.length) think(lines[step]);
    }
  };
  const rotate = (by: number) => {
    if (!blocked()) moveTo({ ...pose, dir: turn(pose.dir, by) });
  };

  const arrive = (next: Pose, label: string, ms: number) => {
    setPanel('none');
    setTransit(label);
    setTimeout(() => {
      setPose(next);
      setNote(next.floor === 4 && !doneToday ? FLOORS[4].open ?? '' : FLOORS[next.floor].line);
      scene.current?.showFloor(next.floor, spritesFor(next.floor), next, roomShut);
      onSeeFloor(next.floor);
      setTransit('');
    }, ms);
  };

  // The front door is only a way home once she's been seen.
  const near = thingAt(pose, clueHere, stillHidden);
  // She isn't someone you walk up to: her door starts the scene. For one render after you're sent out you
  // still stand at her bed, so she's left out by name rather than by phase.
  // Who someone is: in the hospital by floor and letter; in a remembered place, its own k and j.
  const personOf = (id: string) => (id[0] === '0' ? (memory && (id[1] === 'k' || id[1] === 'j') ? memory.place.people[id[1]] : undefined) : PEOPLE[id]);
  const boyAway = near?.kind === 'person' && pose.floor === 0 && (near.id === '0k' ? memory?.stage !== 'meet' : memory?.stage !== 'lost');
  const thing: Thing | null = (near?.kind === 'person' && !personOf(near.id)) || boyAway ? null : facingShutDoor ? { kind: 'look', text: ROOM_SHUT, wall: true } : near?.kind === 'leave' && !doneToday ? null : near;

  // Into a stretch of a conversation, doing what it does: taking a request on, breathing, settling it.
  function enterNode(from: Extract<Focused, { kind: 'person' }>, node: string) {
    const at = from.talk?.[node];
    if (!at) return;
    const r = REQUESTS.find((q) => q.who === from.id) ?? REQUESTS.find((q) => q.doctor === from.talk) ?? memory?.request;
    const request = r?.day;
    if (at.effect === 'accept' && request !== undefined) onAccept(request);
    if (at.effect === 'solve' && request !== undefined) onSolve(request);
    if (at.effect === 'breathe') {
      setRelaxMode(at.relax ?? 'breath');
      setBreathing(true);
    }
    setAside(null);
    if (at.effect === 'memory' && r) return remember(r);
    if (at.effect === 'lose' && memory) return loseHim(memory);
    if (at.effect === 'return' && memory) return comeBack(memory);
    setFocused({ ...from, node, lines: at.lines, index: 0 });
  }

  // What you wrote, to them: never sent if it sounds like a crisis; their answer replaces their line until you tap on.
  const canWrite = aiOn && !memory && focused?.kind === 'person' && !!focused.talk && REQUESTS.some((r) => r.who === focused.id) && !breathing && aside !== WRITE_WAITING;
  async function sendWritten() {
    const text = draft.trim();
    // One at a time: a second tap while the first is on its way would be a second call for the same words.
    if (!text || focused?.kind !== 'person' || aside === WRITE_WAITING) return;
    setDraft('');
    setWriting(false);
    if (soundsLikeCrisis(text)) {
      setAside(WRITE_CRISIS);
      return;
    }
    setAside(WRITE_WAITING);
    try {
      const reply = await sendPersonaMessage(focused.id, written.current, text);
      written.current = [...written.current, { role: 'user' as const, text }, { role: 'assistant' as const, text: reply }].slice(-12);
      setAside(reply.trim());
    } catch {
      setAside(WRITE_FAILED);
    }
  }

  // Into their remembered day, as them: from just out of the car.
  function remember(r: Request) {
    const place = PLACES[r.memory.place];
    enterPlace(place);
    const start: Pose = { floor: 0, ...place.start };
    const m: Memory = { request: r, place, stage: 'meet', back: pose, step: 0 };
    busy.current = true;
    setTransit(r.memory.title);
    setTimeout(() => {
      setFocused(null);
      setMemory(m);
      latest.current.memory = m;
      setPose(start);
      setNote('');
      think(r.memory.opening, false);
      scene.current?.showFloor(0, spritesFor(0), start, false);
      setTransit('');
      busy.current = false;
    }, MEMORY_MS);
  }

  // The tent goes up; when you turn round, he's gone.
  function loseHim(m: Memory) {
    const lost: Memory = { ...m, stage: 'lost' };
    fell.current = false;
    busy.current = true;
    setTransit(m.request.memory.lostTitle);
    setTimeout(() => {
      setFocused(null);
      setMemory(lost);
      latest.current.memory = lost;
      const at: Pose = m.place.lostAt ? { floor: 0, ...m.place.lostAt } : pose;
      setPose(at);
      // behind the black card: straight to where it happens, facing the way on
      scene.current?.setSprites(spritesFor(0));
      scene.current?.jump(at);
      busy.current = false;
      think(m.request.memory.thoughts[0], false);
      setTransit('');
    }, MEMORY_MS);
  }

  // Back in the hospital, in front of whoever was telling it, and the conversation goes on.
  function comeBack(m: Memory) {
    busy.current = true;
    setTransit(m.request.memory.returnTitle);
    setTimeout(() => {
      setMemory(null);
      setThoughts([]);
      latest.current.memory = null;
      setPose(m.back);
      setNote('');
      scene.current?.showFloor(m.back.floor, spritesFor(m.back.floor), m.back, roomShut);
      setTransit('');
      busy.current = false;
      const person = PEOPLE[m.request.who];
      const again = m.request.person.again;
      scene.current?.focus({ cell: ahead(m.back), ...PERSON_FOCUS });
      setFocused({ kind: 'person', id: m.request.who, name: person.name, index: 0, shop: false, talk: m.request.person, node: 'again', lines: again.lines });
    }, MEMORY_MS);
  }

  const goBack = () => {
    if (!focused || breathing) return;
    setWriting(false);
    setAside(null);
    written.current = [];
    busy.current = true;
    setFocused(null);
    setShopLine('');
    if (scene.current) scene.current.unfocus(pose, () => (busy.current = false));
    else busy.current = false;
  };

  const useThing = () => {
    if (!thing || blocked()) return;
    if (thing.kind === 'lift') setPanel('lift');
    else if (thing.kind === 'stairs') setPanel('stairs');
    else if (thing.kind === 'leave') setPanel('leave');
    else if (thing.kind === 'hide') {
      setNote(thing.text);
      setUncovered((u) => (u.includes(pose.floor) ? u : [...u, pose.floor]));
    } else if (thing.kind === 'clue' && clue) {
      setNote('');
      setFocused({ kind: 'thing', text: CLUE_TEXT[clue.id].found });
      scene.current?.hold(clue.id, CLUE_CELLS[pose.floor]);
      onFind(clue.id);
    } else if (thing.kind === 'look') {
      setNote('');
      setFocused({ kind: 'thing', text: thing.text });
      scene.current?.focus({ cell: ahead(pose), height: thing.up ? 2.4 : 0.56, away: thing.wall ? 1.05 : 0.95 });
    } else if (thing.kind === 'person') {
      const person = personOf(thing.id)!;
      setNote('');
      const firstVisit = thing.id === '1i' && (tutorial === 'goal' || tutorial === 'talk');
      const doctor = thing.id === '4r' && doneToday;
      if (doctor) onMeetDoctor();
      const talk = memory ? (thing.id === '0k' ? memory.request.memory.meet : memory.request.memory.found) : doctor ? doctorTalk(day, asked, solved) : personTalk(thing.id, asked, solved);
      const base = { kind: 'person' as const, id: thing.id, name: person.name, index: 0, shop: thing.id === '1m' };
      if (talk) enterNode({ ...base, lines: [], talk }, 'start');
      else {
        // in the hospital, everyone has lines of their own (a remembered place always has a talk)
        const own = PEOPLE[thing.id];
        setFocused({ ...base, lines: firstVisit ? GUIDE_FIRST_LINES : own?.clue?.day === day ? [own.clue.line] : own ? linesOn(own, day) : [] });
      }
      scene.current?.focus({ cell: ahead(pose), ...PERSON_FOCUS });
    }
  };

  // Web keyboards: the arrow keys or WASD, Enter or Space for what's in front of you, Escape to go back.
  const keys = useRef((_key: string) => {});
  keys.current = (key: string) => {
    if (lessonOpen) {
      if (key === 'enter' || key === ' ' || key === 'escape') readLesson();
      return;
    }
    // v0.93: at her bedside Enter and Space go on with the talk, as a tap on the view does
    if (bedside) {
      if (key === 'enter' || key === ' ') bedside.onPress?.();
      return;
    }
    if ((key === 'enter' || key === ' ') && focused?.kind === 'person') onViewPress();
    else if (key === 'arrowup' || key === 'w') forward();
    else if (key === 'arrowleft' || key === 'a') rotate(-1);
    else if (key === 'arrowright' || key === 'd') rotate(1);
    else if (key === 'arrowdown' || key === 's') rotate(2);
    else if (key === 'enter' || key === ' ') useThing();
    else if (key === 'escape' || key === 'backspace') goBack();
  };
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      // typing into a box isn't walking
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      keys.current(KEY_AT[e.code] ?? e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Only the fairy's note makes a clue a goal, so a first run still stumbles on them.
  // the first of her things that's out and not yet found
  const todaysClue = CLUES.find((c) => c.day <= day && !found.includes(c.id)) ?? null;
  const goal = memory
    ? memory.stage === 'meet'
      ? { text: memory.place.meetGoal, floor: 0 as FloorNo, cell: { x: memory.place.meet.x, y: memory.place.meet.y }, face: memory.place.meet.dir }
      : { text: memory.place.lostGoal, floor: 0 as FloorNo, cell: memory.place.lostArrow ? { x: memory.place.found.x, y: memory.place.found.y } : null, face: memory.place.found.dir }
    : tutorialGoal(tutorial) ?? goalFor({
    doneToday,
    metDoctor: day < 7 ? metDoctor : undefined,
    request: requestGoal(asked, solved),
    somethingOfHers: run < 2 && todaysClue ? (todaysClue.floor as FloorNo) : null,
    boughtToday,
    clueToFind: run >= 2 && todaysClue ? { floor: todaysClue.floor as FloorNo, name: CLUE_TEXT[todaysClue.id].name } : null,
  });
  const arrow = arrowFor(pose, goal);
  // On the minimap: the goal if it's on this floor, otherwise the lift that gets you there.
  const goalCell = !goal ? null : goal.floor === pose.floor ? goal.cell : pose.floor === 0 ? null : LIFT_FRONT;
  const textSize = { fontSize: 14 * fontScale, lineHeight: 21 * fontScale };

  const nextLesson = tutorialAfter(tutorial, {
    moved: pose.floor !== ENTRANCE.floor || pose.x !== ENTRANCE.x || pose.y !== ENTRANCE.y,
    facing: thing?.kind === 'person' ? thing.id : null,
    talkingTo: focused?.kind === 'person' ? focused.id : null,
    floor: pose.floor,
    bought: boughtToday,
    atBedside,
    doneToday,
    metDoctor,
  });
  useEffect(() => {
    if (nextLesson !== tutorial) onTutorial(nextLesson);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextLesson, tutorial]);
  const tip = !bedside && focused?.kind !== 'thing' ? TUTORIAL_TIPS[tutorial] : undefined;
  const lesson = typeof tip === 'string' ? tip : tip?.[TOUCH ? 0 : 1];
  // Each new step is explained once in the middle of a darkened screen, like any game's tutorial.
  const lessonOpen = lesson !== undefined && lessonRead !== tutorial && !transit && panel === 'none';
  const readLesson = () => (tutorial === 'nextDay' ? onTutorial('done') : setLessonRead(tutorial));

  const thingLabel = thing
    ? thing.kind === 'lift' ? '엘리베이터 타기'
    : thing.kind === 'stairs' ? '계단으로 가기'
    : thing.kind === 'clue' ? CLUE_SPOT
    : thing.kind === 'hide' ? thing.action
    : thing.kind === 'look' ? '살펴보기'
    : thing.kind === 'person' ? `${personOf(thing.id)?.name}에게 말 걸기`
    : '병원 나가기'
    : '';

  // where to stand for a floor's thing: facing what hides it, if anything does, else on it
  const clueSpot = (floor: FloorNo): Pose => {
    const hide = HIDDEN_CLUE[floor];
    if (!hide || uncovered.includes(floor)) return { floor, ...CLUE_CELLS[floor], dir: 0 };
    return floor === 1 ? { floor, x: 12, y: 2, dir: 1 } : { floor, x: hide.behind.x + 1, y: hide.behind.y, dir: 3 };
  };
  const devJump = (next: Pose) => {
    setPanel('none');
    setPose(next);
    setNote('');
    scene.current?.showFloor(next.floor, spritesFor(next.floor), next, roomShut);
    onSeeFloor(next.floor);
  };
  // ?dev=1 only: scripts can stand you anywhere (window.__visitJump({ floor, x, y, dir })) to look at a spot
  if (VISIT_DEV && Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window as unknown as { __visitJump?: (p: Pose) => void; __visitRemember?: (day: number) => void };
    w.__visitJump = devJump;
    // and straight into a request's remembered day, by the request's day
    w.__visitRemember = (d: number) => {
      const r = REQUESTS.find((q) => q.day === d);
      if (r) remember(r);
    };
  }

  const onViewPress = () => {
    if (bedside) return bedside.onPress?.();
    if (focused?.kind === 'person' && aside !== null) {
      if (aside !== WRITE_WAITING) setAside(null);
      return;
    }
    if (focused?.kind === 'person') {
      if (focused.index + 1 < focused.lines.length) setFocused({ ...focused, index: focused.index + 1 });
      else if (focused.talk && focused.node && !breathing) {
        const at = focused.talk[focused.node];
        if (!at.choices && at.then && at.effect !== 'breathe') enterNode(focused, at.then);
      }
      return;
    }
    if (!focused) useThing();
  };
  const atNode = focused?.kind === 'person' && focused.talk && focused.node ? focused.talk[focused.node] : null;
  const moreLines = focused?.kind === 'person' && (focused.index + 1 < focused.lines.length || (!!atNode?.then && !atNode.choices && atNode.effect !== 'breathe'));
  // A choice once the stretch has been heard out.
  const choices = focused?.kind === 'person' && atNode?.choices && focused.index + 1 >= focused.lines.length ? atNode.choices : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.view}>
        <View ref={host} style={styles.fill} />
        {noView && (
          <View style={styles.noView}>
            <FloorPlan pose={pose} />
          </View>
        )}
        <TouchableOpacity activeOpacity={1} onPress={onViewPress} style={styles.fill} accessibilityLabel={!bedside && !focused ? thingLabel || undefined : undefined} />

        {bedside ? (
          <Text style={[styles.dayLabel, VISIT_DEV && styles.belowDev]} pointerEvents="none">
            {day <= 7 ? `${day}일째` : ''}
          </Text>
        ) : (
          !focused && (
            <>
              <View style={[styles.goal, VISIT_DEV && styles.belowDev]}>
                <Text style={[styles.place, { fontSize: 12 * fontScale }]}>{memory ? memory.request.memory.title : placeName(pose) ?? FLOORS[pose.floor].name}</Text>
                <View style={styles.goalRow}>
                  {arrow !== null && <Text style={styles.goalArrow}>{ARROWS[arrow]}</Text>}
                  <Text style={[styles.goalText, { fontSize: 14 * fontScale }]}>{goal?.text ?? '병원 둘러보기'}</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.mapButton, VISIT_DEV && styles.belowDev, memory && styles.hidden]} disabled={!!memory} onPress={() => panel === 'none' && !transit && setPanel('map')}>
                <Text style={styles.mapButtonText}>지도</Text>
              </TouchableOpacity>
              {!memory && (
                <View style={[styles.minimap, VISIT_DEV && styles.belowDev]} pointerEvents="none">
                  <Minimap pose={pose} goal={goalCell} />
                </View>
              )}
            </>
          )
        )}

        {memory && !focused && thoughts.length > 0 && (
          <View style={styles.thoughts} pointerEvents="none" accessibilityLiveRegion="polite">
            {thoughts.length > 1 && <Text style={[styles.thoughtBefore, { fontSize: 13 * fontScale, lineHeight: 20 * fontScale }]}>{thoughts[0]}</Text>}
            <Animated.Text style={[styles.thought, { fontSize: 17 * fontScale, lineHeight: 26 * fontScale, opacity: thoughtIn }]}>{thoughts[thoughts.length - 1]}</Animated.Text>
          </View>
        )}

        <View style={styles.bottomStack} pointerEvents="box-none">
          {/* v0.91: with a tutorial tip up, the note goes in the same box as its first line, not a second box */}
          {note !== '' && !focused && !bedside && (lesson === undefined || lessonOpen) && (
            <View style={styles.noteBox} pointerEvents="none">
              <Text style={[styles.note, textSize]}>{note}</Text>
            </View>
          )}
          {lesson !== undefined && !lessonOpen && (
            <View style={styles.lesson}>
              {note !== '' && !focused && !bedside && <Text style={[styles.note, styles.noteInLesson, textSize]}>{note}</Text>}
              <Text style={[styles.lessonText, textSize]}>{lesson}</Text>
              <TouchableOpacity onPress={() => onTutorial('done')} style={styles.lessonLink}>
                <Text style={[styles.lessonLinkText, { fontSize: 12 * fontScale }]}>{tutorial === 'nextDay' ? TUTORIAL_OK : TUTORIAL_SKIP}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {bedside && (
          <>
            <Animated.View pointerEvents="none" style={[styles.barTop, { height: bars.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_H] }) }]} />
            <Animated.View pointerEvents="none" style={[styles.barBottom, { height: bars.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_H * 1.5] }) }]}>
              {inScene && <Text style={[styles.sceneLine, { fontSize: 14 * fontScale, lineHeight: 21 * fontScale }]}>{bedside.arriving}</Text>}
            </Animated.View>
          </>
        )}

        {bedside?.bubble ? <View style={[styles.fill, VISIT_DEV && styles.belowDev]} pointerEvents="none"><Bubble text={bedside.bubble} more={bedside.more} fontScale={fontScale} /></View> : null}
        {focused?.kind === 'person' && (
          <View style={[styles.fill, VISIT_DEV && styles.belowDev]} pointerEvents="none">
            <Bubble name={focused.name} text={aside ?? (shopLine || focused.lines[focused.index])} more={aside === null && moreLines} fontScale={fontScale} />
          </View>
        )}
        {focused?.kind === 'thing' && (
          <View style={styles.caption} pointerEvents="none">
            <Text style={[styles.note, textSize]}>{focused.text}</Text>
          </View>
        )}

        {transit !== '' && (
          <View style={styles.transit}>
            <Text style={styles.transitText}>{transit}</Text>
          </View>
        )}

        {panel === 'lift' && (
          <View style={styles.panel}>
            <Text style={[styles.title, { fontSize: 22 * fontScale }]}>몇 층으로 갈까</Text>
            <View style={styles.floors}>
              {FLOOR_ORDER.map((f) => (
                <TouchableOpacity key={f} disabled={f === pose.floor} style={[styles.floor, f === pose.floor && styles.floorHere]} onPress={() => arrive(arrival(f, LIFT_FRONT), `${f}층`, LIFT_MS)}>
                  <Text style={[styles.floorText, f === pose.floor && styles.floorTextHere]}>{f}층</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.link} onPress={() => setPanel('none')}>
              <Text style={[styles.linkText, textSize]}>그만두기</Text>
            </TouchableOpacity>
          </View>
        )}

        {panel === 'leave' && (
          <View style={styles.panel}>
            <Text style={[styles.title, { fontSize: 20 * fontScale }]}>{nextDayQuestion(day + 1)}</Text>
            <PaperButton label="예" onPress={() => { setPanel('none'); onNextDay(); }} />
            <PaperButton label="아니오" onPress={() => setPanel('tomorrow')} />
          </View>
        )}

        {panel === 'tomorrow' && (
          <View style={styles.panel}>
            <Text style={[styles.text, textSize]}>{untilTomorrow(...timeToMidnight())}</Text>
            <PaperButton label="타이틀로" onPress={onTitle} />
            <TouchableOpacity style={styles.link} onPress={() => setPanel('none')}>
              <Text style={[styles.linkText, textSize]}>병원에 더 있기</Text>
            </TouchableOpacity>
          </View>
        )}

        {panel === 'stairs' && (
          <View style={styles.panel}>
            {pose.floor < 4 && <PaperButton label="위층으로" onPress={() => arrive(arrival((pose.floor + 1) as FloorNo, STAIRS_FRONT), '계단을 올라간다', STAIRS_MS)} />}
            {pose.floor > 1 && <PaperButton label="아래층으로" onPress={() => arrive(arrival((pose.floor - 1) as FloorNo, STAIRS_FRONT), '계단을 내려간다', STAIRS_MS)} />}
            <TouchableOpacity style={styles.link} onPress={() => setPanel('none')}>
              <Text style={[styles.linkText, textSize]}>그만두기</Text>
            </TouchableOpacity>
          </View>
        )}

        {panel === 'map' && (
          <View style={styles.panel}>
            <FloorPlan pose={pose} />
            <View style={styles.floors}>
              {FLOOR_ORDER.map((f) => {
                const here = f === pose.floor;
                const seen = floorsSeen.includes(f);
                return (
                  <TouchableOpacity
                    key={f}
                    disabled={here || !seen}
                    style={[styles.floor, here && styles.floorHere, !seen && styles.floorUnseen]}
                    onPress={() => arrive(arrival(f, LIFT_FRONT), `${f}층`, LIFT_MS)}
                  >
                    <Text style={[styles.floorText, here && styles.floorTextHere]}>{f}층</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.text, { fontSize: 12 * fontScale }]}>한 번 걸어서 가 본 층으로 바로 갈 수 있다.</Text>

            {run >= 2 && (
              <TouchableOpacity style={styles.link} onPress={() => setHintOpen(!hintOpen)}>
                <Text style={[styles.linkText, textSize]}>{HINT_TITLE}</Text>
              </TouchableOpacity>
            )}
            {run >= 2 && hintOpen && hintLines().map((l) => (
              <Text key={l} style={[styles.text, textSize]}>
                {l}
              </Text>
            ))}
            {run >= 2 && doneToday && <PaperButton label={FOLLOW_LIGHT} onPress={onNextDay} />}

            {VISIT_DEV && (
              <View style={styles.floors}>
                {!doneToday && (
                  <TouchableOpacity onPress={() => devJump({ floor: 4, x: ROOM_ENTRY.x, y: ROOM_ENTRY.y - 1, dir: 2 })}>
                    <Text style={styles.devLink}>(시험) 병실 문 앞</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => devJump({ floor: 4, ...DOCTOR_FRONT, dir: 2 })}>
                  <Text style={styles.devLink}>(시험) 의사 앞</Text>
                </TouchableOpacity>
                {requestGoal(asked, solved) && (
                  <TouchableOpacity onPress={() => { const g = requestGoal(asked, solved)!; devJump({ floor: g.floor, ...g.cell, dir: g.face }); }}>
                    <Text style={styles.devLink}>(시험) 부탁 상대 앞</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => devJump({ floor: 1, ...SHOP_FRONT, dir: 0 })}>
                  <Text style={styles.devLink}>(시험) 매점 앞</Text>
                </TouchableOpacity>
                {todaysClue && (
                  <TouchableOpacity onPress={() => devJump(clueSpot(todaysClue.floor as FloorNo))}>
                    <Text style={styles.devLink}>(시험) 단서 앞</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.link} onPress={onTitle}>
              <Text style={[styles.linkText, textSize]}>타이틀로</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={() => setPanel('none')}>
              <Text style={[styles.linkText, textSize]}>닫기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {bedside ? (
        bedside.below
      ) : focused ? (
        <View style={styles.controls}>
          {focused.kind === 'person' && focused.shop && (
            <View style={styles.shop}>
              {boughtToday ? (
                !shopLine && <Text style={[styles.text, textSize]}>{SOLD_TODAY}</Text>
              ) : (
                (GIFTS[day] ?? []).map((g) => (
                  <PaperButton
                    key={g.name}
                    label={g.name}
                    onPress={() => {
                      onBuy(g.name);
                      setShopLine(boughtLine(g.name));
                    }}
                  />
                ))
              )}
            </View>
          )}
          {writing && canWrite ? (
            <View style={styles.talkChoices}>
              <TextInput
                style={[styles.writeInput, { fontSize: 15 * fontScale }]}
                value={draft}
                onChangeText={setDraft}
                onKeyPress={makeSubmitOnEnterHandler(() => void sendWritten())}
                placeholder="하고 싶은 말"
                placeholderTextColor="rgba(255,255,255,0.45)"
                multiline
                autoFocus
              />
              <PaperButton wide label={draft.trim() ? '말하기' : '돌아가기'} onPress={() => (draft.trim() ? void sendWritten() : setWriting(false))} />
            </View>
          ) : null}
          {!writing && canWrite && aside !== WRITE_WAITING && (
            <View style={styles.talkChoices}>
              <PaperButton wide label={WRITE_OWN} onPress={() => setWriting(true)} />
            </View>
          )}
          {choices && !writing && (
            <View style={styles.talkChoices}>
              {choices.map((c) => (
                <PaperButton key={c.label} wide label={c.label} onPress={() => focused?.kind === 'person' && enterNode(focused, c.to)} />
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={[styles.backText, { fontSize: 15 * fontScale }]}>뒤로가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.controls}>
          {thingLabel !== '' ? (
            <TouchableOpacity style={styles.thingButton} onPress={useThing}>
              <Text style={[styles.thingText, { fontSize: 14 * fontScale }]}>{thingLabel}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.thingSpace} />
          )}
          <View style={styles.pad}>
            <TurnButton glyph="↺" label="왼쪽" onPress={() => rotate(-1)} />
            <TurnButton glyph="↑" label="앞으로" onPress={forward} wide disabled={nextStep === null} />
            <TurnButton glyph="↻" label="오른쪽" onPress={() => rotate(1)} />
            <TurnButton glyph="↓" label="뒤돌기" onPress={() => rotate(2)} />
          </View>
        </View>
      )}

      {breathing && (
        <BreatheTogether
          fontScale={fontScale}
          mode={relaxMode}
          onDone={() => {
            setBreathing(false);
            const then = atNode?.then;
            if (focused?.kind === 'person' && then) enterNode(focused, then);
          }}
        />
      )}

      {lessonOpen && (
        <View style={styles.lessonShade} accessibilityViewIsModal>
          <View style={styles.lessonCard}>
            <Text style={[styles.lessonTitle, { fontSize: 13 * fontScale }]}>{TUTORIAL_TITLE}</Text>
            <Text style={[styles.lessonCenterText, { fontSize: 16 * fontScale, lineHeight: 26 * fontScale }]}>{lesson}</Text>
            <TouchableOpacity style={styles.lessonOk} onPress={readLesson}>
              <Text style={[styles.lessonOkText, { fontSize: 15 * fontScale }]}>{TUTORIAL_OK}</Text>
            </TouchableOpacity>
            {tutorial !== 'nextDay' && (
              <TouchableOpacity onPress={() => onTutorial('done')} style={styles.lessonSkip}>
                <Text style={[styles.lessonLinkText, { fontSize: 12 * fontScale }]}>{TUTORIAL_SKIP}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function TurnButton({ glyph, label, onPress, wide, disabled }: { glyph: string; label: string; onPress: () => void; wide?: boolean; disabled?: boolean }) {
  return (
    <TouchableOpacity accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.turn, wide && styles.turnWide, disabled && styles.turnOff]}>
      <Text style={styles.turnGlyph}>{glyph}</Text>
      <Text style={styles.turnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const PLAN_CELL = 13;
const PLAN_COLOR: Record<string, string> = { '&': '#8f8a7e', '^': '#8f8a7e', '#': '#23211e', '=': '#6d695f', '+': AMBER, E: '#3f5d78', S: '#3f5d78', N: '#8f8a7e' };

/** The floor seen from above. The map button's picture, and the whole view where 3D can't run. */
function FloorPlan({ pose }: { pose: Pose }) {
  const { map } = HOSPITAL[pose.floor];
  return (
    <View>
      {map.map((row, y) => (
        <View key={y} style={styles.planRow}>
          {[...row].map((c, x) => (
            <View key={x} style={[styles.planCell, { backgroundColor: PLAN_COLOR[c] ?? '#f0ebdf' }]}>
              {c >= 'a' && c <= 'z' && <View style={styles.planPerson} />}
              {x === pose.x && y === pose.y && <Text style={styles.planMe}>{ARROWS[pose.dir]}</Text>}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  view: { flex: 1, minHeight: 200, overflow: 'hidden', backgroundColor: '#0a0a09' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  noView: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  goal: { position: 'absolute', left: 10, top: 10, right: 72, gap: 2, pointerEvents: 'none' },
  belowDev: { marginTop: 44 },
  dayLabel: { position: 'absolute', left: 12, top: 10, color: '#fff', fontSize: 15, fontFamily: 'serif', textShadowColor: '#000', textShadowRadius: 4 },
  place: { color: 'rgba(255,255,255,0.8)', fontFamily: 'serif', textShadowColor: '#000', textShadowRadius: 3 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.72)', borderWidth: 1.5, borderColor: '#f2f2f2', paddingHorizontal: 9, paddingVertical: 5 },
  goalArrow: { color: AMBER, fontSize: 20, fontWeight: '700', lineHeight: 22 },
  goalText: { color: '#fff', fontFamily: 'serif', flexShrink: 1 },
  minimap: { position: 'absolute', right: 10, top: 52 },
  mapButton: { position: 'absolute', right: 10, top: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.72)', borderWidth: 1.5, borderColor: '#f2f2f2' },
  mapButtonText: { color: '#fff', fontSize: 14, fontFamily: 'serif' },
  bottomStack: { position: 'absolute', left: 14, right: 14, bottom: 12, gap: 8 },
  // the remembered day's thoughts: across the middle of the view, on a soft dark band
  thoughts: { position: 'absolute', left: 0, right: 0, top: '30%', paddingHorizontal: 22, paddingVertical: 14, gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center' },
  thought: { color: '#fff', fontFamily: 'serif', fontStyle: 'italic', textAlign: 'center', ...(Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as object) : {}) },
  thoughtBefore: { color: 'rgba(255,255,255,0.5)', fontFamily: 'serif', fontStyle: 'italic', textAlign: 'center', ...(Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as object) : {}) },
  noteBox: { backgroundColor: 'rgba(0,0,0,0.78)', padding: 10 },
  lesson: { backgroundColor: 'rgba(0,0,0,0.88)', borderWidth: 1.5, borderColor: AMBER, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 2 },
  lessonText: { color: '#fff', fontFamily: 'serif' },
  lessonLink: { alignSelf: 'flex-end', paddingVertical: 4, paddingLeft: 12 },
  // Dark and blurred behind; it takes every touch, so nothing moves until it's read.
  lessonShade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', padding: 24, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' } as object) : {}) },
  lessonCard: { maxWidth: 420, width: '100%', alignItems: 'center', gap: 14 },
  lessonTitle: { color: AMBER, fontFamily: 'serif', letterSpacing: 2 },
  lessonCenterText: { color: '#fff', fontFamily: 'serif', textAlign: 'center', ...(Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as object) : {}) },
  lessonOk: { borderWidth: 1.5, borderColor: AMBER, paddingHorizontal: 28, paddingVertical: 9, marginTop: 6 },
  lessonOkText: { color: AMBER, fontFamily: 'serif' },
  lessonSkip: { paddingVertical: 4 },
  lessonLinkText: { color: AMBER, textDecorationLine: 'underline', fontFamily: 'serif' },
  caption: { position: 'absolute', left: 14, right: 14, bottom: 14, backgroundColor: 'rgba(0,0,0,0.85)', borderWidth: 1.5, borderColor: '#f2f2f2', padding: 12 },
  note: { color: '#e8c77d', textAlign: 'center', fontFamily: 'serif' },
  noteInLesson: { paddingBottom: 8, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.18)' },
  // Above whoever the view has come in on, its tail pointing down at them.
  bubbleWrap: { position: 'absolute', left: 20, right: 20, top: 40, alignItems: 'center' },
  bubble: { alignSelf: 'stretch', backgroundColor: '#f7f7f4', borderWidth: 2.5, borderColor: '#111', paddingHorizontal: 18, paddingVertical: 12, borderTopLeftRadius: 22, borderTopRightRadius: 8, borderBottomRightRadius: 26, borderBottomLeftRadius: 12 },
  bubbleName: { color: '#7a5a18', fontSize: 12, textAlign: 'center', marginBottom: 3, fontFamily: 'serif' },
  bubbleText: { color: '#111', textAlign: 'center', fontFamily: 'serif' },
  bubbleTail: { width: 18, height: 18, marginTop: -11, backgroundColor: '#f7f7f4', borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: '#111', transform: [{ rotate: '45deg' }] },
  more: { color: '#555', fontSize: 10, textAlign: 'right', marginTop: 2 },
  barTop: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: '#000' },
  barBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#000', justifyContent: 'center', paddingHorizontal: 18, overflow: 'hidden' },
  sceneLine: { color: '#e8c77d', textAlign: 'center', fontFamily: 'serif' },
  transit: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  transitText: { color: '#fff', fontSize: 30, fontFamily: 'serif', letterSpacing: 4 },
  panel: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18 },
  title: { color: '#fff', fontFamily: 'serif', marginBottom: 4 },
  text: { color: 'rgba(255,255,255,0.75)', textAlign: 'center', fontFamily: 'serif' },
  link: { paddingVertical: 4 },
  linkText: { color: '#fff', textDecorationLine: 'underline', fontFamily: 'serif' },
  devLink: { color: '#ffd76a', fontSize: 12 },
  floors: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  floor: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 2, borderColor: '#f2f2f2' },
  floorHere: { backgroundColor: '#f2f2f2' },
  floorUnseen: { opacity: 0.35 },
  floorText: { color: '#f2f2f2', fontSize: 14, fontFamily: 'serif' },
  floorTextHere: { color: '#111', fontWeight: '700' },
  controls: { paddingHorizontal: 12, paddingTop: 8, gap: 8, backgroundColor: '#000' },
  hidden: { opacity: 0 },
  shop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  talkChoices: { alignSelf: 'stretch', gap: 6 },
  writeInput: { alignSelf: 'stretch', minHeight: 64, color: '#fff', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', padding: 10, fontFamily: 'serif', textAlignVertical: 'top' },
  backButton: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', height: 58, borderWidth: 2, borderColor: '#f2f2f2' },
  backText: { color: '#fff', fontFamily: 'serif' },
  thingButton: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', height: 42, backgroundColor: '#f2f2f2' },
  thingText: { color: '#111', fontWeight: '700', fontFamily: 'serif' },
  thingSpace: { height: 42 },
  pad: { flexDirection: 'row', gap: 6 },
  turn: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#f2f2f2' },
  turnWide: { flex: 1.4 },
  turnOff: { opacity: 0.3 },
  turnGlyph: { color: '#fff', fontSize: 20, lineHeight: 24 },
  turnLabel: { color: '#fff', fontSize: 11, fontFamily: 'serif' },
  planRow: { flexDirection: 'row' },
  planCell: { width: PLAN_CELL, height: PLAN_CELL, alignItems: 'center', justifyContent: 'center' },
  planPerson: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#a3263f' },
  planMe: { position: 'absolute', color: '#a3263f', fontSize: 13, lineHeight: 13, fontWeight: '900' },
});
