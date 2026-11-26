import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import PaperButton from './PaperButton';

// v0.96: the dictionary in the settings: what the game leans on, from cognitive therapy, in plain words, each with a
// picture (generate-hospital-art.js dict-*). The six thinking habits are the hospital's six people. Not a course, and
// not therapy: it says so at the end.
type Entry = { id: string; title: string; body: string; example?: string; ask?: string; image: ImageSourcePropType };

const ENTRIES: Entry[] = [
  {
    id: 'cbt',
    title: '인지치료란',
    body: '같은 일을 겪어도 그 일을 어떻게 해석하느냐에 따라 감정과 행동이 달라져요. 인지치료(인지행동치료)는 그 사이의 생각을 알아차리고, 사실에 맞게 다시 살펴보는 방법이에요.',
    image: require('@/assets/visit/dictionary/cbt.jpg'),
  },
  {
    id: 'auto',
    title: '자동적 사고',
    body: '어떤 일이 생기면 저절로 스쳐 가는 생각이에요. 너무 빨라서 사실처럼 느껴지지만, 늘 사실은 아니에요. 알아차리는 것만으로도 한 걸음이에요.',
    image: require('@/assets/visit/dictionary/auto.jpg'),
  },
  {
    id: 'catastrophe',
    title: '파국화',
    body: '작은 신호에서 가장 나쁜 결과로 단숨에 달려가는 생각이에요.',
    example: '3층 지친 보호자: "열이 나요. 이제 다 끝난 거예요."',
    ask: '가장 나쁜 경우, 가장 좋은 경우, 가장 그럴 법한 경우는 각각 뭘까?',
    image: require('@/assets/visit/dictionary/catastrophe.jpg'),
  },
  {
    id: 'fortune',
    title: '점쟁이 오류',
    body: '앞일을 이미 아는 것처럼 나쁘게 단정하는 생각이에요.',
    example: '2층 곧 퇴원하는 청년: "나가 봤자 또 넘어질 거예요. 뻔해요."',
    ask: '그렇게 될 거라는 걸, 지금 무엇으로 알 수 있지?',
    image: require('@/assets/visit/dictionary/fortune.jpg'),
  },
  {
    id: 'personal',
    title: '개인화',
    body: '여러 이유로 생긴 일을 모두 내 탓으로 가져오는 생각이에요.',
    example: '4층 옆 병실 보호자: "엄마가 이렇게 된 건 제 탓이에요."',
    ask: '이 일에 영향을 준 다른 것들은 무엇이 있을까?',
    image: require('@/assets/visit/dictionary/personal.jpg'),
  },
  {
    id: 'overgeneral',
    title: '과잉일반화',
    body: '몇 번의 일을 늘 그런 일로 넓혀 버리는 생각이에요.',
    example: '1층 외래 어르신: "나는 원래 차례가 안 와. 평생 그랬어."',
    ask: '그렇지 않았던 때, 와 준 사람은 없었을까?',
    image: require('@/assets/visit/dictionary/overgeneral.jpg'),
  },
  {
    id: 'mindread',
    title: '독심술',
    body: '묻지 않고도 남의 속을 안다고 믿는 생각이에요.',
    example: '2층 창가의 할아버지: "애들이 안 오는 건 내가 귀찮아서지. 다 알아."',
    ask: '직접 들어 본 적이 있을까? 물어보면 뭐라고 할까?',
    image: require('@/assets/visit/dictionary/mindread.jpg'),
  },
  {
    id: 'should',
    title: '당위적 사고',
    body: '"~해야 한다", "~했어야 했다"는 기준으로 자신을 재는 생각이에요.',
    example: '4층 자원봉사자: "더 해 줬어야 했어요. 그게 도리였는데."',
    ask: '그 기준은 누가 정했을까? 해 준 것은 무엇이었을까?',
    image: require('@/assets/visit/dictionary/should.jpg'),
  },
  {
    id: 'socratic',
    title: '질문으로 함께 찾기',
    body: '답을 주는 대신 질문을 건네요. 근거는 무엇인지, 다른 설명은 없는지, 전에는 어땠는지. 스스로 찾은 답이 더 오래 남아요. 무조건 괜찮다고 하거나 충고하면 오히려 마음이 닫히기 쉬워요.',
    image: require('@/assets/visit/dictionary/socratic.jpg'),
  },
  {
    id: 'labeling',
    title: '감정에 이름 붙이기',
    body: '지금 느끼는 감정에 "서운함", "불안" 같은 이름을 붙이면 그 감정이 조금 가라앉는다고 해요. 소녀가 "오늘 어떤 감정으로 지냈어?"라고 묻는 이유예요.',
    image: require('@/assets/visit/dictionary/labeling.jpg'),
  },
  {
    id: 'accept',
    title: '받아들이기와 자기자비',
    body: '힘든 마음을 없애려 애쓰기보다, 그런 마음이 있다는 걸 그대로 인정하는 것. 그리고 친구에게 하듯 나에게도 다정하게 말해 주는 것이에요.',
    image: require('@/assets/visit/dictionary/accept.jpg'),
  },
  {
    id: 'relax',
    title: '몸으로 마음 다독이기',
    body: '천천히 숨쉬기, 힘을 줬다가 빼는 근육 이완, 지금 보이고 들리는 것을 하나씩 세는 그라운딩. 몸이 풀리면 생각도 조금 느슨해져요.',
    image: require('@/assets/visit/dictionary/relax.jpg'),
  },
];

export default function Dictionary({ fontScale, onClose }: { fontScale: number; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const entry = ENTRIES.find((e) => e.id === open);
  const text = { fontSize: 14 * fontScale, lineHeight: 22 * fontScale };
  return (
    <View style={styles.shade} accessibilityViewIsModal>
      {entry ? (
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={[styles.heading, { fontSize: 19 * fontScale }]}>{entry.title}</Text>
          <Image source={entry.image} style={styles.picture} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={[styles.body, text]}>{entry.body}</Text>
          {entry.example && <Text style={[styles.example, text]}>{entry.example}</Text>}
          {entry.ask && <Text style={[styles.ask, text]}>건네 볼 질문: {entry.ask}</Text>}
          <PaperButton label="목록으로" onPress={() => setOpen(null)} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={[styles.heading, { fontSize: 19 * fontScale }]}>사전</Text>
          <Text style={[styles.note, text]}>이 게임이 기대고 있는 인지치료의 생각들이에요.</Text>
          {ENTRIES.map((e) => (
            <TouchableOpacity key={e.id} style={styles.row} onPress={() => setOpen(e.id)}>
              <Image source={e.image} style={styles.thumb} />
              <Text style={[styles.rowText, { fontSize: 15 * fontScale }]}>{e.title}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[styles.note, { fontSize: 12 * fontScale, lineHeight: 18 * fontScale }]}>
            이 게임은 치료가 아니에요. 마음이 많이 힘들 땐 전문가와 이야기해 보세요.
          </Text>
          <PaperButton label="닫기" onPress={onClose} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // v1.00: all but opaque: over the game, its words underneath showed through the page's own
  shade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.97)', zIndex: 20 },
  page: { padding: 20, gap: 12, alignItems: 'center' },
  heading: { color: '#fff', fontFamily: 'serif', marginTop: 8 },
  picture: { width: 240, height: 240, borderRadius: 6 },
  body: { color: '#fff', fontFamily: 'serif', alignSelf: 'stretch' },
  example: { color: '#e8c77d', fontFamily: 'serif', alignSelf: 'stretch' },
  ask: { color: 'rgba(255,255,255,0.8)', fontFamily: 'serif', fontStyle: 'italic', alignSelf: 'stretch' },
  note: { color: 'rgba(255,255,255,0.7)', fontFamily: 'serif', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  rowText: { color: '#fff', fontFamily: 'serif' },
});
