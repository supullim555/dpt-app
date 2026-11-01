import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VISIT_DEV } from './flag';
import { girlOn, PIN_ON } from './girlDays';
import { createHospitalScene, type FocusTarget, type HospitalScene, type HospitalSprite, type SpriteLook } from './hospitalScene';
import { ahead, arrival, arrowFor, BEDSIDE, CLUE_CELLS, ENTRANCE, FLOOR_ORDER, GIRL_FRONT, goalFor, HOSPITAL, LIFT_FRONT, OUTSIDE_ROOM, placeName, ROOM_ENTRY, SHOP_FRONT, STAIRS_FRONT, stepped, thingAt, turn, type FloorNo, type Pose, type Thing } from './hospitalMap';
import PaperButton from './PaperButton';
import { clueOn, CLUES, type ClueId } from './progress';
import { boughtLine, CLUE_SPOT, CLUE_TEXT, FLOORS, FOLLOW_LIGHT, GIFTS, HINT_TITLE, hintLines, PEOPLE, ROOM_SHUT, SOLD_TODAY } from './script';

const AMBER = '#d9a441';
const LIFT_MS = 1100;
const STAIRS_MS = 700;
const ARROWS = ['↑', '→', '↓', '←'];
const PROP_ON_FLOOR: Record<number, SpriteLook> = { 3: 'gurney', 2: 'cart', 1: 'vending' };
const GIRL_CELL = { x: GIRL_FRONT.x, y: GIRL_FRONT.y + 1 };
// However long the camera takes to come in from the door, and how far in she turns to you.
const ENTER_MS = 2200;
const TURN_AFTER_MS = 1150;
const BAR_H = 54;
// On her paper: how far up her neck is, and how far above that her hair.
const NECK = 0.34;
const HAIR = 0.15;
// Further back, so whoever came in to send you out is in the picture too.
const STAFF_FOCUS: FocusTarget = { cell: GIRL_CELL, height: 0.62, away: 1.3 };
const PERSON_FOCUS = { height: 0.72, away: 0.86 };

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
  onTitle: () => void;
  /** Set while the story has you at her bedside: no walking, and the panel below takes the controls' place. */
  bedside?: { below: ReactNode; bubble?: string; more?: boolean; onPress?: () => void; girlHere: boolean; staffIn: boolean; arriving?: string };
};

type Panel = 'none' | 'map' | 'lift' | 'stairs';
/** Who or what the view has come in close on, until you go back. */
type Focused =
  | { kind: 'person'; name: string; lines: string[]; index: number; shop: boolean }
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
export default function Hospital({ day, run, fontScale, light, doneToday, boughtToday, found, floorsSeen, onSeeFloor, onEnterRoom, onBuy, onFind, onNextDay, onTitle, bedside }: Props) {
  const [pose, setPose] = useState<Pose>(bedside ? BEDSIDE : doneToday ? OUTSIDE_ROOM : ENTRANCE);
  const [note, setNote] = useState(doneToday ? FLOORS[4].line : '');
  const [focused, setFocused] = useState<Focused | null>(null);
  const [shopLine, setShopLine] = useState('');
  const [panel, setPanel] = useState<Panel>('none');
  const [hintOpen, setHintOpen] = useState(false);
  const [transit, setTransit] = useState('');
  const [noView, setNoView] = useState(false);

  const host = useRef<View>(null);
  const scene = useRef<HospitalScene | null>(null);
  const busy = useRef(false);
  // Has she turned to you yet? Walking up the corridor she hasn't; come in and she does.
  const turned = useRef(bedside !== undefined);
  const latest = useRef({ pose, bedside, doneToday, found, day });
  latest.current = { pose, bedside, doneToday, found, day };
  const bars = useRef(new Animated.Value(0)).current;

  const clue = clueOn(day, pose.floor);
  const clueHere = clue !== null && !found.includes(clue.id);
  const atBedside = bedside !== undefined;
  const roomShut = doneToday;

  const spritesFor = (floor: FloorNo): HospitalSprite[] => {
    const now = latest.current;
    const out: HospitalSprite[] = [];
    HOSPITAL[floor].map.forEach((row, y) =>
      [...row].forEach((c, x) => {
        const person = PEOPLE[`${floor}${c}`];
        if (person && c !== 'N') out.push({ cell: { x, y }, look: person.look });
        if (c === '%') out.push({ cell: { x, y }, look: PROP_ON_FLOOR[floor] });
        if (c === 'T') out.push({ cell: { x, y }, look: 'tree' });
      })
    );
    if (floor === 4) {
      // far enough back that she can tip onto the pillows without going through it
      out.push({ cell: GIRL_CELL, look: 'bed', shift: [0, 0.46, 0], fixed: true });
      out.push({ cell: GIRL_CELL, look: 'bedFront', shift: [0, -0.2, 0], fixed: true });
      const g = girlOn(now.day);
      if (g.leaves) out.push({ cell: GIRL_CELL, look: 'leaves', shift: [0.3, 0.42, 0.42], fixed: true });
      if (now.bedside?.girlHere !== false) {
        const look = turned.current ? g.headTo : g.headFrom;
        // Up the tipped paper: from her waist to her neck, and from there to her hair.
        const along = (from: number, by: number): [number, number] => [from + by * Math.cos(g.lean), -by * Math.sin(g.lean)];
        const [neckUp, neckBack] = along(g.up, NECK);
        out.push({ cell: GIRL_CELL, look: g.body, shift: [0, 0.02, g.up], lean: g.lean, fixed: true });
        out.push({ cell: GIRL_CELL, look, id: 'head', shift: [0, 0.02 + neckBack - 0.012, neckUp], lean: g.lean, fixed: true });
        const pin = PIN_ON[look];
        if (pin) {
          const [pinUp, pinBack] = along(neckUp, HAIR + pin[1]);
          out.push({ cell: GIRL_CELL, look: 'pin', id: 'pin', shift: [pin[0], 0.02 + neckBack + pinBack - 0.024, pinUp], fixed: true });
        }
        if (g.cover !== undefined) out.push({ cell: GIRL_CELL, look: 'blanket', shift: [0, -0.04, g.cover], fixed: true });
        if (g.drip) out.push({ cell: GIRL_CELL, look: 'drip', shift: [-0.3, 0.3, 0], fixed: true });
        if (g.notebook) out.push({ cell: GIRL_CELL, look: 'notebook', shift: [0.06, -0.3, 0.14], fixed: true });
        if (g.hand) out.push({ cell: GIRL_CELL, look: 'hand', shift: [0.13, -0.07, (g.cover ?? 0) + 0.27], fixed: true });
      }
      if (now.bedside?.staffIn) out.push({ cell: GIRL_CELL, look: 'nurse', shift: [-0.5, -0.32, 0] });
    }
    const lying = clueOn(now.day, floor);
    if (lying && !now.found.includes(lying.id)) out.push({ cell: CLUE_CELLS[floor], look: lying.id });
    return out;
  };

  const herFocus = (): FocusTarget => {
    const g = girlOn(latest.current.day);
    return { cell: GIRL_CELL, height: g.height, away: g.away, eye: g.eye };
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
  }, [found.length, bedside?.girlHere, bedside?.staffIn]);

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
      // She turns toward the door partway through, once you're close enough to see it.
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
    setNote('');
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
    if (!blocked() && nextStep) moveTo(nextStep);
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
  const near = thingAt(pose, clueHere);
  // She isn't someone you walk up to: her door starts the scene. For one render after you're sent out you
  // still stand at her bed, so she's left out by name rather than by phase.
  const thing: Thing | null = near?.kind === 'person' && !PEOPLE[near.id] ? null : facingShutDoor ? { kind: 'look', text: ROOM_SHUT, wall: true } : near?.kind === 'leave' && !doneToday ? null : near;

  const goBack = () => {
    if (!focused) return;
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
    else if (thing.kind === 'leave') onTitle();
    else if (thing.kind === 'clue' && clue) {
      setNote('');
      setFocused({ kind: 'thing', text: CLUE_TEXT[clue.id].found });
      scene.current?.hold(clue.id, CLUE_CELLS[pose.floor]);
      onFind(clue.id);
    } else if (thing.kind === 'look') {
      setNote('');
      setFocused({ kind: 'thing', text: thing.text });
      scene.current?.focus({ cell: ahead(pose), height: thing.up ? 2.4 : 0.56, away: thing.wall ? 1.05 : 0.95 });
    } else if (thing.kind === 'person') {
      const person = PEOPLE[thing.id];
      setNote('');
      setFocused({ kind: 'person', name: person.name, lines: person.clue?.day === day ? [person.clue.line] : person.lines, index: 0, shop: thing.id === '1m' });
      if (thing.id === '3N') scene.current?.focus({ cell: ahead(pose), height: 0.56, away: 1.05 });
      else scene.current?.focus({ cell: ahead(pose), ...PERSON_FOCUS });
    }
  };

  // Web keyboards: the arrow keys or WASD, Enter or Space for what's in front of you, Escape to go back.
  const keys = useRef((_key: string) => {});
  keys.current = (key: string) => {
    if (key === 'ArrowUp' || key === 'w') forward();
    else if (key === 'ArrowLeft' || key === 'a') rotate(-1);
    else if (key === 'ArrowRight' || key === 'd') rotate(1);
    else if (key === 'ArrowDown' || key === 's') rotate(2);
    else if (key === 'Enter' || key === ' ') useThing();
    else if (key === 'Escape' || key === 'Backspace') goBack();
  };
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => keys.current(e.key);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Only the fairy's note makes a clue a goal, so a first run still stumbles on them.
  const todaysClue = CLUES.find((c) => c.day === day && !found.includes(c.id)) ?? null;
  const goal = goalFor({
    doneToday,
    boughtToday,
    clueToFind: run >= 2 && todaysClue ? { floor: todaysClue.floor as FloorNo, name: CLUE_TEXT[todaysClue.id].name } : null,
  });
  const arrow = arrowFor(pose, goal);
  const textSize = { fontSize: 14 * fontScale, lineHeight: 21 * fontScale };

  const thingLabel = thing
    ? thing.kind === 'lift' ? '엘리베이터 타기'
    : thing.kind === 'stairs' ? '계단으로 가기'
    : thing.kind === 'clue' ? CLUE_SPOT
    : thing.kind === 'look' ? '살펴보기'
    : thing.kind === 'person' ? `${PEOPLE[thing.id].name}에게 말 걸기`
    : '오늘은 돌아가기'
    : '';

  const devJump = (next: Pose) => {
    setPanel('none');
    setPose(next);
    setNote('');
    scene.current?.showFloor(next.floor, spritesFor(next.floor), next, roomShut);
    onSeeFloor(next.floor);
  };

  const onViewPress = () => {
    if (bedside) return bedside.onPress?.();
    if (focused?.kind === 'person') {
      if (focused.index + 1 < focused.lines.length) setFocused({ ...focused, index: focused.index + 1 });
      return;
    }
    if (!focused) useThing();
  };
  const moreLines = focused?.kind === 'person' && focused.index + 1 < focused.lines.length;

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
                <Text style={[styles.place, { fontSize: 12 * fontScale }]}>{placeName(pose) ?? FLOORS[pose.floor].name}</Text>
                <View style={styles.goalRow}>
                  {arrow !== null && <Text style={styles.goalArrow}>{ARROWS[arrow]}</Text>}
                  <Text style={[styles.goalText, { fontSize: 14 * fontScale }]}>{goal?.text ?? '병원 둘러보기'}</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.mapButton, VISIT_DEV && styles.belowDev]} onPress={() => panel === 'none' && !transit && setPanel('map')}>
                <Text style={styles.mapButtonText}>지도</Text>
              </TouchableOpacity>
            </>
          )
        )}

        {note !== '' && !focused && !bedside && (
          <View style={styles.noteBox} pointerEvents="none">
            <Text style={[styles.note, textSize]}>{note}</Text>
          </View>
        )}

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
            <Bubble name={focused.name} text={shopLine || focused.lines[focused.index]} more={moreLines} fontScale={fontScale} />
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
                <TouchableOpacity onPress={() => devJump({ floor: 1, ...SHOP_FRONT, dir: 0 })}>
                  <Text style={styles.devLink}>(시험) 매점 앞</Text>
                </TouchableOpacity>
                {todaysClue && (
                  <TouchableOpacity onPress={() => devJump({ floor: todaysClue.floor as FloorNo, ...CLUE_CELLS[todaysClue.floor as FloorNo], dir: 0 })}>
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
const PLAN_COLOR: Record<string, string> = { '#': '#23211e', '=': '#6d695f', '+': AMBER, E: '#3f5d78', S: '#3f5d78', N: '#8f8a7e' };

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
  mapButton: { position: 'absolute', right: 10, top: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.72)', borderWidth: 1.5, borderColor: '#f2f2f2' },
  mapButtonText: { color: '#fff', fontSize: 14, fontFamily: 'serif' },
  noteBox: { position: 'absolute', left: 14, right: 14, bottom: 12, backgroundColor: 'rgba(0,0,0,0.78)', padding: 10 },
  caption: { position: 'absolute', left: 14, right: 14, bottom: 14, backgroundColor: 'rgba(0,0,0,0.85)', borderWidth: 1.5, borderColor: '#f2f2f2', padding: 12 },
  note: { color: '#e8c77d', textAlign: 'center', fontFamily: 'serif' },
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
  shop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
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
