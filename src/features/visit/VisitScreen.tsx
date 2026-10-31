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
import { VISIT_CARDS, VISIT_GIRL, VISIT_OPENING, VISIT_PANEL, VISIT_ROOM, VISIT_TORN } from '@/assets/visitUi';
import { VISIT_DEV } from './flag';
import { findKeyword } from './keyword';
import Notebook, { type Told } from './Notebook';
import Opening from './Opening';
import { dayNumber, endingFor, girlAppearsIn, TOTAL_DAYS, type EndingId } from './progress';
import { soundsLikeCrisis } from './safety';
import {
  CRISIS_LINES,
  DAY_LINES,
  DAY_TITLES,
  EMOTION_QUESTION,
  emotionLine,
  ENDINGS,
  FAIRY_LINES,
  FIRST_GREETING,
  GAME_TITLE,
  GOODBYE,
  keywordLine,
  RETURN_GREETING,
  STAFF_CALL_GENTLE,
  STAFF_CALLS,
  TELL_QUESTION,
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
  /** Setting. Survives starting over. */
  fontScale: number;
  /** Days added to the real date by the &dev=1 buttons. */
  devOffset: number;
};

const INITIAL: VisitState = { noticeSeen: false, openingSeen: false, run: 1, startDate: '', visited: [], done: [], told: [], ending: '', fontScale: 1, devOffset: 0 };

type Phase = 'notice' | 'title' | 'settings' | 'opening' | 'door' | 'greet' | 'tell' | 'reply' | 'emotion' | 'ack' | 'bye' | 'staff' | 'outside' | 'ending' | 'notebook' | 'fairy';

function currentDay(s: VisitState) {
  if (!s.startDate) return 1;
  const now = new Date();
  now.setDate(now.getDate() + s.devOffset);
  return dayNumber(daysBetween(s.startDate, localDateKey(now)));
}

/** Where the game picks up, given what's saved. A week that ran out resolves its ending here. */
function resume(s: VisitState): { state: VisitState; phase: Phase } {
  if (!s.openingSeen) return { state: s, phase: 'opening' };
  if (s.ending) return { state: s, phase: 'ending' };
  const day = currentDay(s);
  if (day > TOTAL_DAYS) return { state: { ...s, ending: endingFor(s.visited) }, phase: 'ending' };
  return { state: s, phase: s.done.includes(day) ? 'outside' : 'door' };
}

function PaperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.paperButton}>
      <ImageBackground source={VISIT_CARDS[0]} resizeMode="stretch" imageStyle={styles.fillImage} style={styles.paperFill}>
        <Text style={styles.paperText}>{label}</Text>
      </ImageBackground>
    </TouchableOpacity>
  );
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
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');

  useAsyncEffect(async (isCancelled) => {
    const saved = await loadEntryOr<unknown>(STORAGE_KEY, null);
    if (isCancelled()) return;
    const loaded = saved ? mergeWithDefaults(INITIAL, saved) : INITIAL;
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
    setPhase('greet');
  };

  const finishDay = () => {
    const done = state.done.includes(day) ? state.done : [...state.done, day];
    if (day >= TOTAL_DAYS) {
      setState({ ...state, done, ending: endingFor(state.visited) });
      setPhase('ending');
    } else {
      setState({ ...state, done });
      setPhase('bye');
    }
  };

  const tell = (text: string, typed: boolean) => {
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

  const startOver = () => {
    setState({ ...INITIAL, noticeSeen: true, openingSeen: true, fontScale: state.fontScale, run: state.run + 1 });
    setPhase('door');
  };

  const ending = state.ending || null;
  const showGirl = ending ? girlAppearsIn(ending) : true;
  const light = showGirl ? (ending ? AMBER : DAY_LIGHT[Math.min(day, TOTAL_DAYS) - 1]) : NO_ONE_LIGHT;

  const staffCall = replyLines === CRISIS_LINES ? STAFF_CALL_GENTLE : STAFF_CALLS[day];

  const lines: string[] =
    phase === 'greet'
      ? [state.visited.length <= 1 ? FIRST_GREETING : RETURN_GREETING]
      : phase === 'reply'
        ? replyLines
        : phase === 'ack'
          ? [ackLine]
          : phase === 'ending' && ending
            ? ENDINGS[ending].lines
            : phase === 'bye'
              ? [GOODBYE]
              : phase === 'staff' && staffCall
                ? [staffCall.line]
                : [];

  const afterLines = () => {
    if (phase === 'greet') setPhase('tell');
    else if (phase === 'reply') {
      if (askEmotion) setPhase('emotion');
      else finishDay();
    } else if (phase === 'ack') finishDay();
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
      <TouchableOpacity onPress={() => go({ ...state, devOffset: state.devOffset + 1 })}>
        <Text style={styles.devButton}>다음 날</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => go({ ...state, devOffset: state.devOffset + TOTAL_DAYS })}>
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

  // A black title card, the way each day opens. Nothing of the room yet.
  if (phase === 'door') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          {devBar}
          <View style={styles.titleCard}>
            <Text style={styles.titleDay}>{day}일째</Text>
            <Text style={styles.titleText}>{DAY_TITLES[day]}</Text>
            <Text style={styles.titleLine}>병실 문 앞에 서 있다.</Text>
            <PaperButton label="들어가기" onPress={enterRoom} />
          </View>
          <CrisisFooter tone="dark" />
        </RoomColumn>
      </View>
    );
  }

  // Sent out for her treatment. Nothing to do here yet; the other places open from this door later.
  if (phase === 'outside') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          {devBar}
          <View style={styles.titleCard}>
            <Text style={[styles.titleText, { fontSize: 24 * scale }]}>병실 앞 복도</Text>
            <Text style={[styles.titleLine, { fontSize: 14 * scale }]}>문은 닫혀 있다. 치료가 끝날 때까지 들어갈 수 없다.</Text>
            <Text style={[styles.titleLine, { fontSize: 14 * scale }]}>오늘은 이만 돌아가고, 내일 다시 오자.</Text>
            <TouchableOpacity style={styles.settingsLink} onPress={() => setPhase('title')}>
              <Text style={[styles.settingsLinkText, { fontSize: 14 * scale }]}>타이틀로</Text>
            </TouchableOpacity>
          </View>
          <CrisisFooter tone="dark" />
        </RoomColumn>
      </View>
    );
  }

  if (phase === 'notebook') {
    return (
      <View style={styles.screen}>
        <RoomColumn>
          {devBar}
          <Notebook told={state.told} fontScale={scale} onDone={() => setPhase('fairy')} />
          <CrisisFooter tone="dark" />
        </RoomColumn>
      </View>
    );
  }

  // What she's saying now, in a bubble beside her. With no girl in the room the same lines are
  // narration and sit in the box below instead, as does whoever comes in to send you out.
  const spoken = phase === 'tell' ? TELL_QUESTION.text : phase === 'emotion' ? EMOTION_QUESTION : lines[lineIndex];
  const inBubble = showGirl && !!spoken && phase !== 'staff';
  const canTapThrough = lines.length > 0;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <RoomColumn>
        <TouchableOpacity activeOpacity={1} disabled={!canTapThrough} onPress={advance} style={[styles.scene, { backgroundColor: light }]}>
          <Image source={VISIT_ROOM} resizeMode="cover" style={styles.sceneImage} />
          {showGirl && <Image source={VISIT_GIRL} resizeMode="cover" style={styles.sceneImage} />}
          <Image source={VISIT_TORN} resizeMode="stretch" style={[styles.torn, { height: 54 + insets.top }]} />
          {!ending && <Text style={[styles.tornText, { top: insets.top + 10 }]}>{day}일째</Text>}
          {inBubble && (
            <View style={styles.bubbleWrap}>
              <View style={styles.bubble}>
                <Text style={[styles.bubbleText, { fontSize: 15 * scale, lineHeight: 22 * scale }]}>{spoken}</Text>
                {canTapThrough && <Text style={styles.more}>▼</Text>}
              </View>
              <View style={styles.bubbleTail} />
            </View>
          )}
        </TouchableOpacity>
        {devBar}

        <ImageBackground source={VISIT_PANEL} resizeMode="repeat" imageStyle={styles.fillImage} style={styles.panel}>
          {phase === 'emotion' && <EmotionPicker paper question={null} onPick={(word) => pickEmotion(word)} />}

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
                {TELL_QUESTION.choices.map((c) => (
                  <PaperButton key={c} label={c} onPress={() => tell(c, false)} />
                ))}
                <PaperButton label="직접 쓸게요" onPress={() => setWriting(true)} />
              </View>
            ))}

          {/* Narration when she isn't in the room, and the nurse or doctor. */}
          {!inBubble && phase !== 'fairy' && lines.length > 0 && (
            <TouchableOpacity activeOpacity={0.85} onPress={advance} disabled={!canTapThrough} style={styles.textBox}>
              {phase === 'staff' && staffCall && <Text style={styles.speaker}>{staffCall.who}</Text>}
              <Text style={[styles.prompt, { fontSize: 15 * scale, lineHeight: 23 * scale }]}>{lines[lineIndex]}</Text>
              {canTapThrough && <Text style={styles.moreLight}>▼</Text>}
            </TouchableOpacity>
          )}

          {phase === 'fairy' && (
            <View style={styles.textBox}>
              <View style={styles.center}>
                <Text style={[styles.prompt, { fontSize: 15 * scale, lineHeight: 23 * scale }]}>{FAIRY_LINES.join('\n')}</Text>
                <PaperButton label="다시 찾아가기" onPress={startOver} />
              </View>
            </View>
          )}

          {inBubble && canTapThrough && <Text style={styles.hint}>화면을 눌러 넘기기</Text>}
          <CrisisFooter tone="dark" />
        </ImageBackground>
      </RoomColumn>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scene: { flex: 1, minHeight: 200, overflow: 'hidden' },
  sceneImage: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  torn: { position: 'absolute', left: 0, right: 0, top: 0, width: '100%' },
  tornText: { position: 'absolute', left: 16, color: '#111', fontSize: 16, fontWeight: '700', fontFamily: 'serif' },
  // Above the bed, its tail pointing down at her.
  bubbleWrap: { position: 'absolute', left: 22, right: 22, bottom: '44%', alignItems: 'center' },
  bubble: { alignSelf: 'stretch', backgroundColor: '#f7f7f4', borderWidth: 2.5, borderColor: '#111', paddingHorizontal: 18, paddingVertical: 14, borderTopLeftRadius: 22, borderTopRightRadius: 8, borderBottomRightRadius: 26, borderBottomLeftRadius: 12 },
  bubbleText: { color: '#111', textAlign: 'center', fontFamily: 'serif' },
  bubbleTail: { width: 18, height: 18, marginTop: -11, backgroundColor: '#f7f7f4', borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: '#111', transform: [{ rotate: '45deg' }] },
  more: { color: '#555', fontSize: 10, textAlign: 'right', marginTop: 2 },
  moreLight: { color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'right', marginTop: 4 },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', paddingVertical: 6 },
  panel: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, gap: 10 },
  textBox: { borderWidth: 2, borderColor: '#f2f2f2', backgroundColor: '#000', padding: 14, minHeight: 96, justifyContent: 'center' },
  speaker: { color: AMBER, fontSize: 13, fontFamily: 'serif', marginBottom: 6 },
  center: { alignItems: 'center', gap: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  answer: { gap: 10, alignItems: 'center' },
  input: { alignSelf: 'stretch', minHeight: 84, color: '#fff', borderWidth: 2, borderColor: '#f2f2f2', backgroundColor: '#000', padding: 12, lineHeight: 22, textAlignVertical: 'top', fontFamily: 'serif' },
  prompt: { color: '#fff', textAlign: 'center', fontFamily: 'serif' },
  paperButton: { width: 164, height: 50 },
  // ImageBackground's image otherwise keeps the file's own size on web and overflows.
  fillImage: { width: '100%', height: '100%' },
  paperFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  paperText: { color: '#111', fontSize: 15, fontWeight: '700', fontFamily: 'serif' },
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
