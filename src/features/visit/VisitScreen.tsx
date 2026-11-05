import { useEffect, useLayoutEffect, useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VisitScreenProps } from '@/app/navigation/types';
import { useAsyncEffect } from '@/core/hooks/useAsyncEffect';
import { makeSubmitOnEnterHandler } from '@/core/hooks/useSubmitOnEnter';
import { confirmDestructive } from '@/core/lib/confirm';
import { daysBetween, localDateKey } from '@/core/lib/date';
import { mergeWithDefaults } from '@/core/lib/mergeWithDefaults';
import { loadEntryOr, saveEntry } from '@/core/storage';
import { EmotionPicker } from '@/features/gate';
import CrisisFooter from '@/ui/CrisisFooter';
import RoomColumn from '@/ui/RoomColumn';
import { VISIT_OPENING, VISIT_PANEL } from '@/assets/visitUi';
import CardScene from './CardScene';
import { VISIT_DEV } from './flag';
import Hospital from './Hospital';
import { findKeyword } from './keyword';
import Notebook, { type Told } from './Notebook';
import type { TutorialStep } from './hospitalMap';
import Opening from './Opening';
import PaperButton from './PaperButton';
import { dayInRun, endingFor, girlAppearsIn, happyUnlocked, TOTAL_DAYS, type ClueId, type EndingId } from './progress';
import { REQUESTS } from './requests';
import { soundsLikeCrisis } from './safety';
import {
  ARRIVAL_LINES,
  CLUE_TEXT,
  CRISIS_LINES,
  DAY_LINES,
  DAY_TITLES,
  EMOTION_QUESTION,
  emotionLine,
  ENDINGS,
  FAIRY_LINES,
  FIRST_GREETING,
  GAME_TITLE,
  giftLine,
  GIVE_NOTHING,
  GIVE_QUESTION,
  GOODBYE,
  HAPPY_BEATS,
  hintLines,
  keywordLine,
  RETURN_GREETING,
  STAFF_CALL_GENTLE,
  DOCTOR_CALL,
  STAFF_CALLS,
  TELL_QUESTION,
  TUTORIAL_GIVE,
  TUTORIAL_TELL,
} from './script';

const STORAGE_KEY = 'visit.state';

// The one colour in the game (docs/병문안_모티브와_아트_구상.md): the light in the window, grey at
// first and full amber by the last day. Without the girl it stays grey.
const AMBER = '#d9a441';
const DAY_LIGHT = ['#7d7d7d', '#8a857a', '#99896a', '#6c6c6c', '#b6914f', '#cf9135', AMBER];
const NO_ONE_LIGHT = '#666666';
const LARGE_TEXT = 1.2;

type VisitState = {
  noticeSeen: boolean;
  openingSeen: boolean;
  run: number;
  /** Local day key of the first visit; '' until then. */
  startDate: string;
  /** Days whose room was entered: what endings count. */
  visited: number[];
  /** Days whose talk was finished. */
  done: number[];
  told: Told[];
  ending: EndingId | '';
  /** The day a gift was last bought: one a day. */
  boughtDay: number;
  /** Gifts bought and not yet given. */
  gifts: string[];
  /** Clues picked up, and the ones already shown to her. */
  clues: ClueId[];
  shown: ClueId[];
  /** Floors you've been on: the map button only takes you to these. */
  floorsSeen: number[];
  /** Where the first walk in has got to. */
  tutorial: TutorialStep;
  /** Setting. Survives starting over. */
  fontScale: number;
  /** Days moved on without waiting: the fairy's light on later runs, the &dev=1 buttons. */
  skippedDays: number;
  /** Days on which you went to the doctor's room after seeing her. */
  doctorDays: number[];
  /** The doctor's requests (requests.ts) by their day: taken on, settled (and on which day), told to her. */
  requestsAsked: number[];
  requestsSolved: { request: number; on: number }[];
  requestsTold: number[];
};

const INITIAL: VisitState = { noticeSeen: false, openingSeen: false, run: 1, startDate: '', visited: [], done: [], told: [], ending: '', boughtDay: 0, gifts: [], clues: [], shown: [], floorsSeen: [1], tutorial: 'walk', fontScale: 1, skippedDays: 0, doctorDays: [], requestsAsked: [], requestsSolved: [], requestsTold: [] };

type Phase = 'notice' | 'title' | 'settings' | 'opening' | 'door' | 'walk' | 'arrive' | 'greet' | 'tell' | 'reply' | 'emotion' | 'ack' | 'give' | 'gift' | 'memory' | 'descent' | 'bye' | 'staff' | 'outside' | 'ending' | 'notebook' | 'fairy';

function currentDay(s: VisitState) {
  return dayInRun(s.run, s.startDate ? daysBetween(s.startDate, localDateKey()) : 0, s.skippedDays);
}

/** Where the game picks up, given what's saved. A week that ran out resolves its ending here. */
function resume(s: VisitState): { state: VisitState; phase: Phase } {
  if (!s.openingSeen) return { state: s, phase: 'opening' };
  if (s.ending) return { state: s, phase: 'ending' };
  const day = currentDay(s);
  if (day > TOTAL_DAYS) return { state: { ...s, ending: endingFor(s.visited) }, phase: 'ending' };
  return { state: s, phase: s.done.includes(day) ? 'outside' : 'door' };
}

// 병문안 (docs/계획서.md): first person, into the room, tell her about today, hear a little of hers. She
// speaks in a bubble beside her. The player's words only ever come back verbatim: one checked keyword,
// and her notebook at the end. Everything else she says is human-written (script.ts).
export default function VisitScreen(_props: VisitScreenProps) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<VisitState | null>(null);
  const [phase, setPhase] = useState<Phase>('title');
  const [lineIndex, setLineIndex] = useState(0);
  const [replyLines, setReplyLines] = useState<string[]>([]);
  const [askEmotion, setAskEmotion] = useState(false);
  const [ackLine, setAckLine] = useState('');
  const [memory, setMemory] = useState<ClueId>('collar');
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');

  useAsyncEffect(async (isCancelled) => {
    const saved = await loadEntryOr<unknown>(STORAGE_KEY, null);
    if (isCancelled()) return;
    const merged = saved ? mergeWithDefaults(INITIAL, saved) : INITIAL;
    // Saved before there was a tutorial, by someone already on their way.
    const loaded = merged.startDate && !(saved as { tutorial?: string }).tutorial ? { ...merged, tutorial: 'done' as const } : merged;
    setState(loaded);
    setPhase(loaded.noticeSeen ? 'title' : 'notice');
  }, []);

  useEffect(() => {
    if (state) saveEntry(STORAGE_KEY, state);
  }, [state]);

  // Before paint, so a new phase never shows for a frame with the last phase's line number.
  useLayoutEffect(() => setLineIndex(0), [phase]);

  if (!state) return <View style={styles.screen} />;
  const day = currentDay(state);
  const scale = state.fontScale;

  const go = (s: VisitState) => {
    const next = resume(s);
    setState(next.state);
    setPhase(next.phase);
  };

  const enterRoom = () => {
    const startDate = state.startDate || localDateKey();
    setState({ ...state, startDate, visited: state.visited.includes(day) ? state.visited : [...state.visited, day] });
    setPhase('arrive');
  };

  const finishDay = () => {
    const done = state.done.includes(day) ? state.done : [...state.done, day];
    if (day >= TOTAL_DAYS) {
      setState({ ...state, done, ending: happyUnlocked(state.requestsSolved.map((r) => r.request)) ? 'happy' : endingFor(state.visited) });
      setPhase('ending');
    } else {
      setState({ ...state, done });
      setPhase('bye');
    }
  };

  // Someone you helped, on a later day: something to tell her about.
  const toTell = REQUESTS.filter((r) => state.requestsSolved.some((x) => x.request === r.day && x.on < day) && !state.requestsTold.includes(r.day));

  const tell = (text: string, typed: boolean) => {
    const story = typed ? undefined : toTell.find((r) => r.girl.choice === text);
    if (story) {
      setState({ ...state, requestsTold: [...state.requestsTold, story.day], told: [...state.told.filter((t) => t.day !== day), { day, label: null, text: '' }] });
      setReplyLines([...story.girl.lines, ...(DAY_LINES[day] ?? [])]);
      setAskEmotion(day > 1);
      setPhase('reply');
      return;
    }
    const crisis = typed && soundsLikeCrisis(text);
    const keyword = typed && !crisis ? findKeyword(text) : null;
    // What sounded like a crisis stays out of the notebook at the end: it shouldn't come back as a
    // memento among the other days.
    setState({ ...state, told: [...state.told.filter((t) => t.day !== day), { day, label: null, text: typed && !crisis ? text : '' }] });
    setReplyLines(crisis ? CRISIS_LINES : [...(keyword ? [keywordLine(keyword)] : []), ...(DAY_LINES[day] ?? [])]);
    // She asks how the day felt only once she's listened, and not at all the first time you meet.
    setAskEmotion(!crisis && day > 1);
    setWriting(false);
    setDraft('');
    setPhase('reply');
  };

  const submitDraft = () => {
    if (draft.trim()) tell(draft.trim(), true);
  };

  const pickEmotion = (word: string | null) => {
    setState({ ...state, told: state.told.map((t) => (t.day === day ? { ...t, label: word } : t)) });
    setAckLine(emotionLine(word));
    setPhase('ack');
  };

  const toShow = state.clues.filter((c) => !state.shown.includes(c));
  const hasThings = state.gifts.length > 0 || toShow.length > 0;

  // After she's listened: whatever you brought, then goodbye. Not on a day that sounded like a crisis.
  const afterTalk = () => {
    if (hasThings && replyLines !== CRISIS_LINES) setPhase('give');
    else finishDay();
  };

  const giveGift = (name: string) => {
    setState({ ...state, gifts: state.gifts.filter((g) => g !== name) });
    setAckLine(giftLine(name));
    setPhase('gift');
  };

  const showClue = (clue: ClueId) => {
    setState({ ...state, shown: [...state.shown, clue] });
    setMemory(clue);
    setPhase('memory');
  };

  const afterGiving = () => {
    if (hasThings) setPhase('give');
    else finishDay();
  };

  const startOver = () => {
    setState({ ...INITIAL, noticeSeen: true, openingSeen: true, floorsSeen: state.floorsSeen, tutorial: 'done', fontScale: state.fontScale, run: state.run + 1 });
    setPhase('door');
  };

  const ending = state.ending || null;
  const showGirl = ending ? girlAppearsIn(ending) : true;
  const light = showGirl ? (ending ? AMBER : DAY_LIGHT[Math.min(day, TOTAL_DAYS) - 1]) : NO_ONE_LIGHT;

  const staffCall = replyLines === CRISIS_LINES ? STAFF_CALL_GENTLE : STAFF_CALLS[day];

  const lines: string[] =
    phase === 'arrive'
      ? [ARRIVAL_LINES[Math.min(day, TOTAL_DAYS)]]
      : phase === 'greet'
      ? [state.visited.length <= 1 ? FIRST_GREETING : RETURN_GREETING]
      : phase === 'reply'
        ? replyLines
        : phase === 'ack' || phase === 'gift'
          ? [ackLine]
          : phase === 'ending' && ending
            ? ENDINGS[ending].lines
            : phase === 'bye'
              ? [GOODBYE]
              : phase === 'staff' && staffCall
                ? staffCall === STAFF_CALL_GENTLE ? [staffCall.line] : [staffCall.line, DOCTOR_CALL[staffCall.who]]
                : [];

  const afterLines = () => {
    if (phase === 'arrive') setPhase('greet');
    else if (phase === 'greet') setPhase('tell');
    else if (phase === 'reply') {
      if (askEmotion) setPhase('emotion');
      else afterTalk();
    } else if (phase === 'ack') afterTalk();
    else if (phase === 'gift') afterGiving();
    else if (phase === 'bye') setPhase('staff');
    else if (phase === 'staff') setPhase('outside');
    else if (phase === 'ending') setPhase('notebook');
  };

  const advance = () => {
    if (lineIndex + 1 < lines.length) setLineIndex(lineIndex + 1);
    else afterLines();
  };

  const devBar = VISIT_DEV && (
    <View style={[styles.dev, { top: insets.top + 6 }]}>
      <Text style={styles.devText}>
        {state.run}회차 · {day}일째 · 온 날 [{state.visited.join(',')}]
      </Text>
      <TouchableOpacity onPress={() => go({ ...state, skippedDays: state.skippedDays + 1 })}>
        <Text style={styles.devButton}>다음 날</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => go({ ...state, skippedDays: state.skippedDays + TOTAL_DAYS })}>
        <Text style={styles.devButton}>7일 뒤</Text>
      </TouchableOpacity>
    </View>
  );

  if (phase === 'notice') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          <View style={styles.titleCard}>
            <Text style={[styles.prompt, { fontSize: 15 * scale, lineHeight: 23 * scale }]}>
              오래 아픈 아이를 찾아가는 이야기예요. 아픔과 이별을 다뤄요. 가까운 사람을 잃은 지 얼마 안 됐거나 지금 많이
              힘들다면, 나중에 시작해도 괜찮아요.
            </Text>
            <PaperButton
              label="들어가 볼게요"
              onPress={() => {
                setState({ ...state, noticeSeen: true });
                setPhase('title');
              }}
            />
          </View>
          <CrisisFooter tone="dark" />
        </RoomColumn>
      </View>
    );
  }

  if (phase === 'title') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          <Image source={VISIT_OPENING[2]} resizeMode="cover" style={styles.sceneImage} />
          <View style={styles.titleShade} />
          <View style={styles.titleTop}>
            <Text style={styles.gameTitle}>{GAME_TITLE}</Text>
          </View>
          <View style={styles.titleMenu}>
            <PaperButton label={state.startDate ? '이어하기' : '이야기 시작'} onPress={() => go(state)} />
            <PaperButton label="설정" onPress={() => setPhase('settings')} />
          </View>
          <CrisisFooter tone="dark" />
        </RoomColumn>
      </View>
    );
  }

  if (phase === 'settings') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          <View style={styles.titleCard}>
            <Text style={[styles.settingsHeading, { fontSize: 22 * scale }]}>설정</Text>

            <Text style={[styles.settingsLabel, { fontSize: 14 * scale }]}>글자 크기</Text>
            <View style={styles.settingsRow}>
              {[
                { label: '보통', value: 1 },
                { label: '크게', value: LARGE_TEXT },
              ].map((o) => (
                <TouchableOpacity
                  key={o.label}
                  style={[styles.option, state.fontScale === o.value && styles.optionOn]}
                  onPress={() => setState({ ...state, fontScale: o.value })}
                >
                  <Text style={[styles.optionText, state.fontScale === o.value && styles.optionTextOn]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.settingsLink} onPress={() => setPhase('opening')}>
              <Text style={[styles.settingsLinkText, { fontSize: 14 * scale }]}>오프닝 다시 보기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsLink}
              onPress={async () => {
                if (await confirmDestructive('처음부터 다시 시작할까요?', '지금까지 들려준 이야기가 모두 사라지고, 되돌릴 수 없어요.')) {
                  setState({ ...INITIAL, noticeSeen: true, fontScale: state.fontScale });
                  setPhase('title');
                }
              }}
            >
              <Text style={[styles.settingsLinkText, { fontSize: 14 * scale }]}>처음부터 다시 시작</Text>
            </TouchableOpacity>

            <PaperButton label="돌아가기" onPress={() => setPhase('title')} />
          </View>
          <CrisisFooter tone="dark" />
        </RoomColumn>
      </View>
    );
  }

  if (phase === 'opening') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          <Opening
            onDone={() => {
              if (state.openingSeen) setPhase('title'); // replayed from the settings
              else go({ ...state, openingSeen: true });
            }}
          />
        </RoomColumn>
      </View>
    );
  }

  // A black title card, the way each day opens. Then you walk up from the front door.
  if (phase === 'door') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          {devBar}
          <View style={styles.titleCard}>
            <Text style={styles.titleDay}>{day}일째</Text>
            <Text style={styles.titleText}>{DAY_TITLES[day]}</Text>
            <Text style={styles.titleLine}>병원 정문 앞에 서 있다.</Text>
            <PaperButton label="들어가기" onPress={() => setPhase('walk')} />
          </View>
          <CrisisFooter tone="dark" />
        </RoomColumn>
      </View>
    );
  }

  if (phase === 'memory') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          <CardScene title={CLUE_TEXT[memory].memory} beats={CLUE_TEXT[memory].lines.map((text) => ({ text }))} fontScale={scale} onDone={afterGiving} />
        </RoomColumn>
      </View>
    );
  }

  if (phase === 'descent') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          <CardScene
            beats={HAPPY_BEATS}
            fontScale={scale}
            onDone={() => {
              setState({ ...INITIAL, noticeSeen: true, openingSeen: true, tutorial: 'done', fontScale: state.fontScale });
              setPhase('title');
            }}
          />
        </RoomColumn>
      </View>
    );
  }

  if (phase === 'notebook') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          {devBar}
          <Notebook
            told={state.told}
            fontScale={scale}
            doneLabel={ending === 'happy' ? '같이 내려가기' : undefined}
            onDone={() => setPhase(ending === 'happy' ? 'descent' : 'fairy')}
          />
          <CrisisFooter tone="dark" />
        </RoomColumn>
      </View>
    );
  }

  // What she's saying now, in a bubble beside her. With no girl in the room the same lines are
  // narration and sit in the box below instead, as does whoever comes in to send you out.
  const spoken = phase === 'tell' ? TELL_QUESTION.text : phase === 'emotion' ? EMOTION_QUESTION : phase === 'give' ? GIVE_QUESTION : lines[lineIndex];
  const inBubble = showGirl && !!spoken && phase !== 'staff' && phase !== 'arrive';
  const canTapThrough = lines.length > 0;

  const walking = phase === 'walk' || phase === 'outside';

  // Everything from the walk up to the goodbye happens in the one 3D hospital. She's a person in her room
  // like everyone else: at her bedside the view comes in on her, and the panel takes the controls' place.
  const below = walking ? undefined : (
    <ImageBackground source={VISIT_PANEL} resizeMode="repeat" imageStyle={styles.fillImage} style={styles.panel}>
      {state.tutorial === 'inRoom' && (phase === 'tell' || phase === 'give') && <Text style={[styles.tutorialTip, { fontSize: 13 * scale, lineHeight: 19 * scale }]}>{phase === 'tell' ? TUTORIAL_TELL : TUTORIAL_GIVE}</Text>}

      {phase === 'emotion' && <EmotionPicker paper question={null} onPick={(word) => pickEmotion(word)} />}

      {phase === 'give' && (
        <View style={styles.choices}>
          {state.gifts.map((g) => (
            <PaperButton key={g} label={g} onPress={() => giveGift(g)} />
          ))}
          {toShow.map((c) => (
            <PaperButton key={c} label={CLUE_TEXT[c].name} onPress={() => showClue(c)} />
          ))}
          <PaperButton label={GIVE_NOTHING} onPress={finishDay} />
        </View>
      )}

      {phase === 'tell' &&
        (writing ? (
          <View style={styles.answer}>
            <TextInput
              style={[styles.input, { fontSize: 15 * scale }]}
              value={draft}
              onChangeText={setDraft}
              onKeyPress={makeSubmitOnEnterHandler(submitDraft)}
              placeholder="쓰고 싶은 만큼만"
              placeholderTextColor="rgba(255,255,255,0.45)"
              multiline
            />
            <PaperButton label={draft.trim() ? '들려주기' : '돌아가기'} onPress={() => (draft.trim() ? submitDraft() : setWriting(false))} />
          </View>
        ) : (
          <View style={styles.choices}>
            {[...toTell.map((r) => r.girl.choice), ...TELL_QUESTION.choices].map((c) => (
              <PaperButton key={c} label={c} onPress={() => tell(c, false)} />
            ))}
            <PaperButton label="직접 쓸게요" onPress={() => setWriting(true)} />
          </View>
        ))}

      {/* Narration when she isn't in the room, and the nurse or doctor. */}
      {!inBubble && phase !== 'fairy' && phase !== 'arrive' && lines.length > 0 && (
        <TouchableOpacity activeOpacity={0.85} onPress={advance} disabled={!canTapThrough} style={styles.textBox}>
          {phase === 'staff' && staffCall && <Text style={styles.speaker}>{staffCall.who}</Text>}
          <Text style={[styles.prompt, { fontSize: 15 * scale, lineHeight: 23 * scale }]}>{lines[lineIndex]}</Text>
          {canTapThrough && <Text style={styles.moreLight}>▼</Text>}
        </TouchableOpacity>
      )}

      {phase === 'fairy' && (
        <View style={styles.textBox}>
          <View style={styles.center}>
            <Text style={[styles.prompt, { fontSize: 15 * scale, lineHeight: 23 * scale }]}>{[...FAIRY_LINES, ...hintLines()].join('\n')}</Text>
            <PaperButton label="다시 찾아가기" onPress={startOver} />
          </View>
        </View>
      )}

      {(inBubble || phase === 'arrive') && canTapThrough && <Text style={styles.hint}>화면을 눌러 넘기기</Text>}
    </ImageBackground>
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <RoomColumn>
        <Hospital
          day={day}
          run={state.run}
          fontScale={scale}
          light={light}
          doneToday={phase === 'outside'}
          boughtToday={state.boughtDay === day}
          found={state.clues}
          floorsSeen={state.floorsSeen}
          onSeeFloor={(floor) => setState((s) => (s && !s.floorsSeen.includes(floor) ? { ...s, floorsSeen: [...s.floorsSeen, floor] } : s))}
          onEnterRoom={enterRoom}
          onBuy={(gift) => setState({ ...state, boughtDay: day, gifts: [...state.gifts, gift] })}
          onFind={(clue) => setState({ ...state, clues: [...state.clues, clue] })}
          onNextDay={() => go({ ...state, skippedDays: state.skippedDays + 1 })}
          metDoctor={state.doctorDays.includes(day)}
          asked={state.requestsAsked}
          solved={state.requestsSolved.map((r) => r.request)}
          onAccept={(request) => setState((s) => (s && !s.requestsAsked.includes(request) ? { ...s, requestsAsked: [...s.requestsAsked, request] } : s))}
          onSolve={(request) => setState((s) => (s && !s.requestsSolved.some((r) => r.request === request) ? { ...s, requestsSolved: [...s.requestsSolved, { request, on: day }] } : s))}
          onMeetDoctor={() => setState((s) => (s && !s.doctorDays.includes(day) ? { ...s, doctorDays: [...s.doctorDays, day] } : s))}
          onTitle={() => setPhase('title')}
          tutorial={state.tutorial}
          onTutorial={(tutorial) => setState((s) => (s ? { ...s, tutorial } : s))}
          bedside={walking ? undefined : { below, bubble: inBubble ? spoken : undefined, more: canTapThrough, onPress: canTapThrough ? advance : undefined, girlHere: showGirl, staffIn: phase === 'staff', arriving: phase === 'arrive' ? lines[0] : undefined }}
        />
        {devBar}
        <CrisisFooter tone="dark" />
      </RoomColumn>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  sceneImage: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  moreLight: { color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'right', marginTop: 4 },
  tutorialTip: { color: '#fff', textAlign: 'center', fontFamily: 'serif', borderWidth: 1.5, borderColor: AMBER, backgroundColor: 'rgba(0,0,0,0.88)', padding: 8 },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', paddingVertical: 6 },
  panel: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, gap: 10 },
  textBox: { borderWidth: 2, borderColor: '#f2f2f2', backgroundColor: '#000', padding: 14, minHeight: 96, justifyContent: 'center' },
  speaker: { color: AMBER, fontSize: 13, fontFamily: 'serif', marginBottom: 6 },
  center: { alignItems: 'center', gap: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  answer: { gap: 10, alignItems: 'center' },
  input: { alignSelf: 'stretch', minHeight: 84, color: '#fff', borderWidth: 2, borderColor: '#f2f2f2', backgroundColor: '#000', padding: 12, lineHeight: 22, textAlignVertical: 'top', fontFamily: 'serif' },
  prompt: { color: '#fff', textAlign: 'center', fontFamily: 'serif' },
  // ImageBackground's image otherwise keeps the file's own size on web and overflows.
  fillImage: { width: '100%', height: '100%' },
  titleCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  titleShade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  // In the dark sky above the hospital, clear of its one lit window.
  titleTop: { flex: 1, alignItems: 'center', paddingTop: 34 },
  gameTitle: { color: '#fff', fontSize: 44, fontFamily: 'serif', letterSpacing: 8 },
  titleMenu: { alignItems: 'center', gap: 12, paddingBottom: 26 },
  titleDay: { color: AMBER, fontSize: 40, fontFamily: 'serif' },
  titleText: { color: '#fff', fontSize: 24, fontFamily: 'serif' },
  titleLine: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 18, fontFamily: 'serif' },
  settingsHeading: { color: '#fff', fontFamily: 'serif', marginBottom: 10 },
  settingsLabel: { color: 'rgba(255,255,255,0.75)', fontFamily: 'serif' },
  settingsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  option: { paddingHorizontal: 20, paddingVertical: 9, borderWidth: 2, borderColor: '#f2f2f2' },
  optionOn: { backgroundColor: '#f2f2f2' },
  optionText: { color: '#f2f2f2', fontSize: 14, fontFamily: 'serif' },
  optionTextOn: { color: '#111', fontWeight: '700' },
  settingsLink: { paddingVertical: 8 },
  settingsLinkText: { color: '#fff', textDecorationLine: 'underline', fontFamily: 'serif' },
  dev: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.75)', padding: 8, borderRadius: 4 },
  devText: { flex: 1, color: '#fff', fontSize: 11 },
  devButton: { color: '#ffd76a', fontSize: 12, fontWeight: '700' },
});
