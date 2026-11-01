import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VISIT_DEV } from './flag';
import { createHospitalScene, type HospitalScene, type HospitalSprite } from './hospitalScene';
import { arrival, arrowFor, CLUE_CELLS, ENTRANCE, FLOOR_ORDER, goalFor, HOSPITAL, LIFT_FRONT, OUTSIDE_ROOM, placeName, ROOM_DOOR, SHOP_FRONT, STAIRS_FRONT, stepped, thingAt, turn, type FloorNo, type Pose } from './hospitalMap';
import PaperButton from './PaperButton';
import { clueOn, CLUES, type ClueId } from './progress';
import { boughtLine, CLUE_SPOT, CLUE_TEXT, FLOORS, FOLLOW_LIGHT, GIFTS, HINT_TITLE, hintLines, PEOPLE, ROOM_SHUT, SOLD_TODAY } from './script';

const AMBER = '#d9a441';
const LIFT_MS = 1100;
const STAIRS_MS = 700;
const ARROWS = ['↑', '→', '↓', '←'];
const PROP_ON_FLOOR: Record<number, HospitalSprite['look']> = { 3: 'gurney', 2: 'cart', 1: 'vending' };

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
  onEnterRoom: () => void;
  onBuy: (gift: string) => void;
  onFind: (clue: ClueId) => void;
  onNextDay: () => void;
  onTitle: () => void;
};

type Panel = 'none' | 'map' | 'lift' | 'stairs' | 'shop';

// The hospital on foot (docs/병원_지도.md): a step or a quarter turn at a time, and whatever's in front of
// you can be pressed. There's no time limit and nothing to fail. The view itself is hospitalScene.ts; if it
// can't run, the floor plan takes its place and walking still works.
export default function Hospital({ day, run, fontScale, light, doneToday, boughtToday, found, floorsSeen, onSeeFloor, onEnterRoom, onBuy, onFind, onNextDay, onTitle }: Props) {
  const [pose, setPose] = useState<Pose>(doneToday ? OUTSIDE_ROOM : ENTRANCE);
  const [note, setNote] = useState(doneToday ? FLOORS[4].line : '');
  const [talk, setTalk] = useState<{ name: string; lines: string[]; index: number; thenShop: boolean } | null>(null);
  const [panel, setPanel] = useState<Panel>('none');
  const [hintOpen, setHintOpen] = useState(false);
  const [transit, setTransit] = useState('');
  const [noView, setNoView] = useState(false);

  const host = useRef<View>(null);
  const scene = useRef<HospitalScene | null>(null);
  const busy = useRef(false);
  const poseNow = useRef(pose);
  poseNow.current = pose;

  const clue = clueOn(day, pose.floor);
  const clueHere = clue !== null && !found.includes(clue.id);

  const spritesFor = (floor: FloorNo): HospitalSprite[] => {
    const out: HospitalSprite[] = [];
    HOSPITAL[floor].map.forEach((row, y) =>
      [...row].forEach((c, x) => {
        const person = PEOPLE[`${floor}${c}`];
        if (person && c !== 'N') out.push({ cell: { x, y }, look: person.look });
        if (c === '%') out.push({ cell: { x, y }, look: PROP_ON_FLOOR[floor] });
        if (c === 'T') out.push({ cell: { x, y }, look: 'tree' });
      })
    );
    const lying = clueOn(day, floor);
    if (lying && !found.includes(lying.id)) out.push({ cell: CLUE_CELLS[floor], look: 'clue' });
    return out;
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
          made.showFloor(poseNow.current.floor, spritesFor(poseNow.current.floor), poseNow.current);
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
  }, [found.length]);

  const moveTo = (next: Pose) => {
    busy.current = true;
    setNote('');
    setPose(next);
    if (scene.current) scene.current.moveTo(next, () => (busy.current = false));
    else busy.current = false;
  };

  const blocked = () => busy.current || panel !== 'none' || talk !== null || transit !== '';
  const forward = () => {
    if (blocked()) return;
    const next = stepped(pose);
    if (next) moveTo(next);
  };
  const rotate = (by: number) => {
    if (!blocked()) moveTo({ ...pose, dir: turn(pose.dir, by) });
  };

  const arrive = (next: Pose, label: string, ms: number) => {
    setPanel('none');
    setTransit(label);
    setTimeout(() => {
      setPose(next);
      setNote(next.floor === 4 && doneToday ? '' : FLOORS[next.floor].line);
      scene.current?.showFloor(next.floor, spritesFor(next.floor), next);
      onSeeFloor(next.floor);
      setTransit('');
    }, ms);
  };

  // The front door is only a way home once she's been seen.
  const found0 = thingAt(pose, clueHere);
  const thing = found0?.kind === 'leave' && !doneToday ? null : found0;

  const useThing = () => {
    if (!thing || blocked()) return;
    if (thing.kind === 'lift') setPanel('lift');
    else if (thing.kind === 'stairs') setPanel('stairs');
    else if (thing.kind === 'leave') onTitle();
    else if (thing.kind === 'room') {
      if (doneToday) {
        setNote(ROOM_SHUT);
        return;
      }
      busy.current = true;
      if (scene.current) scene.current.walkIn(onEnterRoom);
      else onEnterRoom();
    } else if (thing.kind === 'clue' && clue) {
      onFind(clue.id);
      setNote(CLUE_TEXT[clue.id].found);
    } else if (thing.kind === 'person') {
      const person = PEOPLE[thing.id];
      const lines = person.clue?.day === day ? [person.clue.line] : person.lines;
      setTalk({ name: person.name, lines, index: 0, thenShop: thing.id === '1m' });
    }
  };

  // Web keyboards: the arrow keys or WASD, and Enter or Space for what's in front of you.
  const keys = useRef((_key: string) => {});
  keys.current = (key: string) => {
    if (key === 'ArrowUp' || key === 'w') forward();
    else if (key === 'ArrowLeft' || key === 'a') rotate(-1);
    else if (key === 'ArrowRight' || key === 'd') rotate(1);
    else if (key === 'ArrowDown' || key === 's') rotate(2);
    else if (key === 'Enter' || key === ' ') useThing();
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
    : thing.kind === 'room' ? (doneToday ? '소녀의 병실' : '병실로 들어가기')
    : thing.kind === 'clue' ? CLUE_SPOT
    : thing.kind === 'person' ? `${PEOPLE[thing.id].name}에게 말 걸기`
    : thing.kind === 'leave' ? '오늘은 돌아가기'
    : ''
    : '';

  const devJump = (next: Pose) => {
    setPanel('none');
    setPose(next);
    setNote('');
    scene.current?.showFloor(next.floor, spritesFor(next.floor), next);
    onSeeFloor(next.floor);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.view}>
        <View ref={host} style={styles.fill} />
        {noView && (
          <View style={styles.noView}>
            <FloorPlan pose={pose} />
          </View>
        )}
        {/* What's ahead fills the middle of the view: pressing it there is the same as the button. */}
        <TouchableOpacity activeOpacity={1} disabled={!thingLabel} onPress={useThing} style={styles.fill} accessibilityLabel={thingLabel || undefined} />

        <View style={[styles.goal, VISIT_DEV && styles.goalBelowDev]}>
          <Text style={[styles.place, { fontSize: 12 * fontScale }]}>{placeName(pose) ?? FLOORS[pose.floor].name}</Text>
          <View style={styles.goalRow}>
            {arrow !== null && <Text style={styles.goalArrow}>{ARROWS[arrow]}</Text>}
            <Text style={[styles.goalText, { fontSize: 14 * fontScale }]}>{goal?.text ?? '병원 둘러보기'}</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.mapButton, VISIT_DEV && styles.goalBelowDev]} onPress={() => panel === 'none' && !transit && setPanel('map')}>
          <Text style={styles.mapButtonText}>지도</Text>
        </TouchableOpacity>

        {(note !== '' || thing?.kind === 'info') && !talk && (
          <View style={styles.noteBox} pointerEvents="none">
            <Text style={[styles.note, textSize]}>{thing?.kind === 'info' ? thing.text : note}</Text>
          </View>
        )}

        {transit !== '' && (
          <View style={styles.transit}>
            <Text style={styles.transitText}>{transit}</Text>
          </View>
        )}

        {talk && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.talk}
            onPress={() => {
              if (talk.index + 1 < talk.lines.length) setTalk({ ...talk, index: talk.index + 1 });
              else {
                setTalk(null);
                if (talk.thenShop) setPanel('shop');
              }
            }}
          >
            <Text style={styles.speaker}>{talk.name}</Text>
            <Text style={[styles.talkLine, textSize]}>{talk.lines[talk.index]}</Text>
            <Text style={styles.more}>▼</Text>
          </TouchableOpacity>
        )}

        {panel === 'shop' && (
          <View style={styles.panel}>
            <Text style={[styles.title, { fontSize: 22 * fontScale }]}>매점</Text>
            {boughtToday ? (
              <Text style={[styles.text, textSize]}>{note || SOLD_TODAY}</Text>
            ) : (
              (GIFTS[day] ?? []).map((g) => (
                <PaperButton
                  key={g.name}
                  label={g.name}
                  onPress={() => {
                    onBuy(g.name);
                    setNote(boughtLine(g.name));
                  }}
                />
              ))
            )}
            <TouchableOpacity
              style={styles.link}
              onPress={() => {
                setPanel('none');
                setNote('');
              }}
            >
              <Text style={[styles.linkText, textSize]}>나가기</Text>
            </TouchableOpacity>
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
                <TouchableOpacity onPress={() => devJump({ floor: 4, ...ROOM_DOOR, dir: 2 })}>
                  <Text style={styles.devLink}>(시험) 병실 문 앞</Text>
                </TouchableOpacity>
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
          <TurnButton glyph="↑" label="앞으로" onPress={forward} wide disabled={stepped(pose) === null} />
          <TurnButton glyph="↻" label="오른쪽" onPress={() => rotate(1)} />
          <TurnButton glyph="↓" label="뒤돌기" onPress={() => rotate(2)} />
        </View>
      </View>
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
const PLAN_COLOR: Record<string, string> = { '#': '#23211e', '=': '#6d695f', '+': AMBER, E: '#3f5d78', S: '#3f5d78', G: AMBER, N: '#8f8a7e' };

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
  view: { flex: 1, overflow: 'hidden', backgroundColor: '#0a0a09' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  noView: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  goal: { position: 'absolute', left: 10, top: 10, right: 72, gap: 2, pointerEvents: 'none' },
  goalBelowDev: { marginTop: 44 },
  place: { color: 'rgba(255,255,255,0.8)', fontFamily: 'serif', textShadowColor: '#000', textShadowRadius: 3 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.72)', borderWidth: 1.5, borderColor: '#f2f2f2', paddingHorizontal: 9, paddingVertical: 5 },
  goalArrow: { color: AMBER, fontSize: 20, fontWeight: '700', lineHeight: 22 },
  goalText: { color: '#fff', fontFamily: 'serif', flexShrink: 1 },
  mapButton: { position: 'absolute', right: 10, top: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.72)', borderWidth: 1.5, borderColor: '#f2f2f2' },
  mapButtonText: { color: '#fff', fontSize: 14, fontFamily: 'serif' },
  noteBox: { position: 'absolute', left: 14, right: 14, bottom: 12, backgroundColor: 'rgba(0,0,0,0.78)', padding: 10 },
  note: { color: '#e8c77d', textAlign: 'center', fontFamily: 'serif' },
  transit: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  transitText: { color: '#fff', fontSize: 30, fontFamily: 'serif', letterSpacing: 4 },
  talk: { position: 'absolute', left: 12, right: 12, bottom: 12, borderWidth: 2, borderColor: '#f2f2f2', backgroundColor: '#000', padding: 14, minHeight: 92 },
  speaker: { color: AMBER, fontSize: 13, fontFamily: 'serif', marginBottom: 6 },
  talkLine: { color: '#fff', fontFamily: 'serif' },
  more: { color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'right', marginTop: 4 },
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
