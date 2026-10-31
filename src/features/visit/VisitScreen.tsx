import { useEffect, useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VisitScreenProps } from '@/app/navigation/types';
import { useAsyncEffect } from '@/core/hooks/useAsyncEffect';
import { daysBetween, localDateKey } from '@/core/lib/date';
import { mergeWithDefaults } from '@/core/lib/mergeWithDefaults';
import { loadEntryOr, saveEntry } from '@/core/storage';
import { DialogueExercise } from '@/features/dialogue';
import { EmotionPicker } from '@/features/gate';
import CrisisFooter from '@/ui/CrisisFooter';
import RoomColumn from '@/ui/RoomColumn';
import { VISIT_DEV } from './flag';
import { VISIT_CARDS, VISIT_GIRL, VISIT_PANEL, VISIT_ROOM, VISIT_TORN } from '@/assets/visitUi';
import { findKeyword } from './keyword';
import { dayNumber, endingFor, girlAppearsIn, TOTAL_DAYS, type EndingId } from './progress';
import { soundsLikeCrisis } from './safety';
import {
  ALREADY_TOLD,
  CRISIS_LINES,
  DAY_LINES,
  DAY_TITLES,
  emotionLine,
  ENDINGS,
  FAIRY_LINES,
  FIRST_GREETING,
  keywordLine,
  RECALL_TITLE,
  RETURN_GREETING,
  TELL_QUESTION,
} from './script';

const STORAGE_KEY = 'visit.state';

// The one colour in the game (docs/병문안_모티브와_아트_구상.md): the light in the window, grey at
// first and full amber by the last day. Without the girl it stays grey.
const AMBER = '#d9a441';
const DAY_LIGHT = ['#7d7d7d', '#8a857a', '#99896a', '#6c6c6c', '#b6914f', '#cf9135', AMBER];
const NO_ONE_LIGHT = '#666666';

function PaperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.paperButton}>
      <ImageBackground source={VISIT_CARDS[0]} resizeMode="stretch" imageStyle={styles.fillImage} style={styles.paperFill}>
        <Text style={styles.paperText}>{label}</Text>
      </ImageBackground>
    </TouchableOpacity>
  );
}

type Told = { day: number; label: string | null; text: string };

type VisitState = {
  noticeSeen: boolean;
  run: number;
  /** Local day key of the first visit; '' until then. */
  startDate: string;
  /** Days whose room was entered: what endings count. */
  visited: number[];
  /** Days whose talk was finished. */
  done: number[];
  told: Told[];
  ending: EndingId | '';
  /** Days added to the real date by the &dev=1 buttons. */
  devOffset: number;
};

const INITIAL: VisitState = { noticeSeen: false, run: 1, startDate: '', visited: [], done: [], told: [], ending: '', devOffset: 0 };

type Phase = 'notice' | 'door' | 'greet' | 'emotion' | 'tell' | 'reply' | 'left' | 'ending' | 'recall' | 'fairy';

function currentDay(s: VisitState) {
  if (!s.startDate) return 1;
  const now = new Date();
  now.setDate(now.getDate() + s.devOffset);
  return dayNumber(daysBetween(s.startDate, localDateKey(now)));
}

/** Where opening the app lands, given what's saved. A week that ran out resolves its ending here. */
function settle(s: VisitState): { state: VisitState; phase: Phase } {
  if (!s.noticeSeen) return { state: s, phase: 'notice' };
  if (s.ending) return { state: s, phase: 'ending' };
  const day = currentDay(s);
  if (day > TOTAL_DAYS) return { state: { ...s, ending: endingFor(s.visited) }, phase: 'ending' };
  return { state: s, phase: s.done.includes(day) ? 'left' : 'door' };
}

// 병문안 (docs/병문안_기획서.md): first person, into the room, tell her about today, hear a little of
// her day. The player's words only ever come back verbatim: one checked keyword, and the look-back at
// the end. Everything else she says is human-written (script.ts).
export default function VisitScreen(_props: VisitScreenProps) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<VisitState | null>(null);
  const [phase, setPhase] = useState<Phase>('door');
  const [label, setLabel] = useState<string | null>(null);
  const [replyLines, setReplyLines] = useState<string[]>([]);

  useAsyncEffect(async (isCancelled) => {
    const saved = await loadEntryOr<unknown>(STORAGE_KEY, null);
    if (isCancelled()) return;
    const settled = settle(saved ? mergeWithDefaults(INITIAL, saved) : INITIAL);
    setState(settled.state);
    setPhase(settled.phase);
  }, []);

  useEffect(() => {
    if (state) saveEntry(STORAGE_KEY, state);
  }, [state]);

  if (!state) return <View style={styles.screen} />;
  const day = currentDay(state);

  const enterRoom = () => {
    const startDate = state.startDate || localDateKey();
    setState({ ...state, startDate, visited: state.visited.includes(day) ? state.visited : [...state.visited, day] });
    setPhase('greet');
  };

  const finishTelling = (answers: string[]) => {
    const text = answers[0] ?? '';
    const crisis = soundsLikeCrisis(text);
    const typed = !TELL_QUESTION.choices.includes(text);
    const keyword = !crisis && typed ? findKeyword(text) : null;
    // What sounded like a crisis stays out of the end-of-week look-back: it shouldn't be shown back
    // as a memento among the other days.
    setState({ ...state, told: [...state.told, { day, label, text: typed && !crisis ? text : '' }] });
    setReplyLines(crisis ? CRISIS_LINES : [...(keyword ? [keywordLine(keyword)] : []), ...(DAY_LINES[day] ?? [])]);
    setPhase('reply');
  };

  const finishDay = () => {
    const done = state.done.includes(day) ? state.done : [...state.done, day];
    if (day >= TOTAL_DAYS) {
      setState({ ...state, done, ending: endingFor(state.visited) });
      setPhase('ending');
    } else {
      setState({ ...state, done });
      setPhase('left');
    }
  };

  const startOver = () => {
    setState({ ...INITIAL, noticeSeen: true, run: state.run + 1 });
    setPhase('door');
  };

  const skipDays = (n: number) => {
    const next = { ...state, devOffset: state.devOffset + n };
    const settled = settle(next);
    setState(settled.state);
    setPhase(settled.phase);
  };

  const ending = state.ending || null;
  const showGirl = ending ? girlAppearsIn(ending) : true;
  const light = showGirl ? (ending ? AMBER : DAY_LIGHT[Math.min(day, TOTAL_DAYS) - 1]) : NO_ONE_LIGHT;

  const devBar = VISIT_DEV && (
    <View style={[styles.dev, { top: insets.top + 6 }]}>
      <Text style={styles.devText}>
        {state.run}회차 · {day}일째 · 온 날 [{state.visited.join(',')}]
      </Text>
      <TouchableOpacity onPress={() => skipDays(1)}>
        <Text style={styles.devButton}>다음 날</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => skipDays(TOTAL_DAYS)}>
        <Text style={styles.devButton}>7일 뒤</Text>
      </TouchableOpacity>
    </View>
  );

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

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <RoomColumn>
        <View style={[styles.scene, { backgroundColor: light }]}>
          <Image source={VISIT_ROOM} resizeMode="cover" style={styles.sceneImage} />
          {showGirl && <Image source={VISIT_GIRL} resizeMode="cover" style={styles.sceneImage} />}
          <Image source={VISIT_TORN} resizeMode="stretch" style={[styles.torn, { height: 54 + insets.top }]} />
          {!ending && <Text style={[styles.tornText, { top: insets.top + 10 }]}>{day}일째</Text>}
        </View>
        {devBar}

        <ImageBackground source={VISIT_PANEL} resizeMode="repeat" imageStyle={styles.fillImage} style={styles.panel}>
          {phase === 'emotion' ? (
            <EmotionPicker
              paper
              onPick={(word) => {
                setLabel(word);
                setPhase('tell');
              }}
            />
          ) : (
            <View style={styles.textBox}>
              {phase === 'notice' && (
                <View style={styles.center}>
                  <Text style={styles.prompt}>
                    오래 아픈 아이를 찾아가는 이야기예요. 아픔과 이별을 다뤄요. 가까운 사람을 잃은 지 얼마 안 됐거나 지금
                    많이 힘들다면, 나중에 시작해도 괜찮아요.
                  </Text>
                  <PaperButton
                    label="들어가 볼게요"
                    onPress={() => {
                      const next = settle({ ...state, noticeSeen: true });
                      setState(next.state);
                      setPhase(next.phase);
                    }}
                  />
                </View>
              )}

              {phase === 'greet' && (
                <DialogueExercise
                  key="greet"
                  questions={[]}
                  leadIn={state.visited.length <= 1 ? FIRST_GREETING : RETURN_GREETING}
                  showPortrait={false}
                  onComplete={() => setPhase('emotion')}
                />
              )}

              {phase === 'tell' && (
                <DialogueExercise
                  key="tell"
                  questions={[TELL_QUESTION]}
                  leadIn={emotionLine(label)}
                  showPortrait={false}
                  onComplete={finishTelling}
                />
              )}

              {phase === 'reply' && (
                <DialogueExercise key="reply" questions={[]} leadIn={replyLines} showPortrait={false} onComplete={finishDay} />
              )}

              {phase === 'left' && <Text style={styles.prompt}>{ALREADY_TOLD}</Text>}

              {phase === 'ending' && ending && (
                <DialogueExercise
                  key="ending"
                  questions={[]}
                  leadIn={ENDINGS[ending].lines}
                  showPortrait={false}
                  onComplete={() => setPhase('recall')}
                />
              )}

              {phase === 'recall' && (
                <View style={styles.center}>
                  <Text style={styles.prompt}>{RECALL_TITLE}</Text>
                  <ScrollView style={styles.recall}>
                    {state.told.length === 0 && <Text style={styles.recallLine}>아직 나눈 이야기가 많지 않았다.</Text>}
                    {state.told.map((t, i) => (
                      <Text key={i} style={styles.recallLine}>
                        {t.day}일째{t.label ? ` · ${t.label}` : ''}
                        {t.text ? `\n${t.text}` : ''}
                      </Text>
                    ))}
                  </ScrollView>
                  <PaperButton label="병원을 나서기" onPress={() => setPhase('fairy')} />
                </View>
              )}

              {phase === 'fairy' && (
                <View style={styles.center}>
                  <Text style={styles.prompt}>{FAIRY_LINES.join('\n')}</Text>
                  <PaperButton label="다시 찾아가기" onPress={startOver} />
                </View>
              )}
            </View>
          )}

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
  panel: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, gap: 8 },
  textBox: { borderWidth: 2, borderColor: '#f2f2f2', backgroundColor: '#000', padding: 14, minHeight: 104, justifyContent: 'center' },
  center: { alignItems: 'center', gap: 12 },
  prompt: { color: '#fff', fontSize: 15, lineHeight: 23, textAlign: 'center', fontFamily: 'serif' },
  paperButton: { width: 170, height: 52 },
  // ImageBackground's image otherwise keeps the file's own size on web and overflows.
  fillImage: { width: '100%', height: '100%' },
  paperFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  paperText: { color: '#111', fontSize: 15, fontWeight: '700', fontFamily: 'serif' },
  titleCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  titleDay: { color: AMBER, fontSize: 40, fontFamily: 'serif' },
  titleText: { color: '#fff', fontSize: 24, fontFamily: 'serif' },
  titleLine: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 18, fontFamily: 'serif' },
  recall: { alignSelf: 'stretch', maxHeight: 200 },
  recallLine: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 19, marginBottom: 10, fontFamily: 'serif' },
  dev: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.75)', padding: 8, borderRadius: 4 },
  devText: { flex: 1, color: '#fff', fontSize: 11 },
  devButton: { color: '#ffd76a', fontSize: 12, fontWeight: '700' },
});
