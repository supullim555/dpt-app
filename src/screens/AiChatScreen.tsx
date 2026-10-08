import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AiChatScreenProps } from '../navigation/types';
import CharacterPortrait from '../components/CharacterPortrait';
import CrisisFooter from '../components/CrisisFooter';
import { sendChatMessage, summarizeChat } from '../ai/chatClient';
import { loadAiOptIn } from '../ai/preference';
import { recordAiSummary } from '../game/memory';
import type { ChatMessage } from '../ai/types';
import { BORDER, INK, MUTED, SCREEN_BG } from '../theme';

const OPENING_LINE = '요즘 어떻게 지내요? 편하게 이야기해도 돼요.';

type DisplayMessage = ChatMessage | { role: 'system'; text: string };

// §25's "진짜 상담하듯이" free-chat screen — a real back-and-forth with Gemini, unlike the
// scripted exercises and the daily check-in (both untouched, still fixed questions only).
// Reached from a card at the top of the "이야기" tab (ExerciseListScreen), which only renders
// that card when the AI choice (IntroGate, §24) is 'on' — but this screen re-checks the choice
// itself on mount too, since a stale nav state or a direct deep-link shouldn't be able to bypass
// a user who's already said no.
export default function AiChatScreen({ navigation }: AiChatScreenProps) {
  const insets = useSafeAreaInsets();
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([{ role: 'assistant', text: OPENING_LINE }]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const listRef = useRef<FlatList>(null);
  const hasUserTurn = messages.some((m) => m.role === 'user');

  useEffect(() => {
    let cancelled = false;
    loadAiOptIn().then((v) => !cancelled && setAiOn(v === 'on'));
    return () => {
      cancelled = true;
    };
  }, []);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    // History sent to Gemini is prior real turns only — OPENING_LINE is local UI framing, not
    // something the character actually "said" via the API, so it's excluded from what's replayed
    // back as context (sending it as a fake model turn would just be redundant priming).
    const history: ChatMessage[] = messages.filter((m): m is ChatMessage => m.role !== 'system');
    const next: DisplayMessage[] = [...messages, { role: 'user', text }];
    setMessages(next);
    setSending(true);
    try {
      const reply = await sendChatMessage(history, text);
      setMessages((cur) => [...cur, { role: 'assistant', text: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const notice =
        msg === 'blocked'
          ? '그 이야기는 여기서 다루기 조금 어려워요. 힘들 땐 아래 상담 전화로 연결해도 돼요.'
          : '지금은 답을 받을 수 없어요. 잠시 후 다시 시도해 주세요.';
      setMessages((cur) => [...cur, { role: 'system', text: notice }]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (messages.length > 1) listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  // §25's "반영·재진술로 이야기를 꺼내고, 그 이야기를 정리해서 저장" — asks Gemini to recap the
  // conversation so far (summarizeChat, a different prompt from the chat persona's — see
  // systemPrompt.ts's SUMMARY_SYSTEM_PROMPT) and saves the result to the 메모 tab
  // (recordAiSummary). Doesn't clear or end the conversation — saving is just a checkpoint, not
  // a "finish" the user is being steered toward (§4: nothing here should feel like a completion
  // to perform).
  const handleSave = async () => {
    if (!hasUserTurn || sending || saving) return;
    setSaving(true);
    try {
      const history: ChatMessage[] = messages.filter((m): m is ChatMessage => m.role !== 'system');
      const summary = await summarizeChat(history);
      await recordAiSummary(summary);
      setMessages((cur) => [...cur, { role: 'system', text: '이 대화를 메모에 저장했어요.' }]);
    } catch {
      setMessages((cur) => [...cur, { role: 'system', text: '지금은 저장할 수 없어요. 잠시 후 다시 시도해 주세요.' }]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI와 이야기</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasUserTurn || sending || saving}
          hitSlop={8}
          style={styles.saveButton}
        >
          <Text style={[styles.saveButtonText, (!hasUserTurn || sending || saving) && styles.saveButtonTextDim]}>
            {saving ? '정리 중…' : '정리 저장'}
          </Text>
        </TouchableOpacity>
      </View>

      {aiOn === false && (
        <View style={styles.offNotice}>
          <Text style={styles.offNoticeText}>AI 기능이 꺼져 있어요. "이야기" 탭에서 다시 켤 수 있어요.</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View>
            {index === 0 && (
              <View style={styles.portraitRow}>
                <CharacterPortrait size={72} />
              </View>
            )}
            <Bubble message={item} />
          </View>
        )}
      />

      {sending && <Text style={styles.typing}>듣고 있어요…</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="편하게 적어보세요"
          placeholderTextColor="#999"
          multiline
          editable={aiOn !== false}
        />
        <TouchableOpacity style={styles.sendButton} onPress={send} disabled={sending || aiOn === false}>
          <Text style={styles.sendButtonText}>보내기</Text>
        </TouchableOpacity>
      </View>
      <CrisisFooter tone="light" />
    </KeyboardAvoidingView>
  );
}

function Bubble({ message }: { message: DisplayMessage }) {
  if (message.role === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SCREEN_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 30, color: INK, marginTop: -2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: INK },
  saveButton: { minWidth: 36, paddingHorizontal: 8, paddingVertical: 8 },
  saveButtonText: { fontSize: 13, fontWeight: '600', color: INK, textAlign: 'right' },
  saveButtonTextDim: { color: '#bbb' },
  offNotice: { paddingHorizontal: 20, paddingBottom: 8 },
  offNoticeText: { fontSize: 13, color: MUTED, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 12, flexGrow: 1 },
  portraitRow: { alignItems: 'center', marginBottom: 8 },
  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAssistant: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: INK, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderBottomLeftRadius: 4 },
  bubbleTextUser: { color: '#fff', fontSize: 15, lineHeight: 21 },
  bubbleTextAssistant: { color: INK, fontSize: 15, lineHeight: 21 },
  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemText: { fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: '85%' },
  typing: { fontSize: 12, color: MUTED, textAlign: 'center', marginBottom: 4 },
  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-end' },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: INK,
    maxHeight: 100,
  },
  sendButton: { backgroundColor: INK, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14 },
  sendButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
