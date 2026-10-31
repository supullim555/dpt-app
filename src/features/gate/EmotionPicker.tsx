import { useState } from 'react';
import type { ReactNode } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VISIT_CARDS } from '@/assets/visitUi';
import { EMOTION_FAMILIES, EMOTION_UNSURE, type EmotionFamily, type EmotionFamilyId } from './emotions';

type Props = {
  /** The word picked (a secondary, or a primary on its own), or null for "잘 모르겠어요". */
  onPick: (label: string | null, family: EmotionFamilyId | null) => void;
  /** Crumpled-paper word cards (the hospital visit) instead of the gate's coloured chips. */
  paper?: boolean;
};

function PaperCard({ onPress, index, children }: { onPress: () => void; index: number; children: ReactNode }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.paperCard}>
      <ImageBackground source={VISIT_CARDS[index % VISIT_CARDS.length]} resizeMode="stretch" imageStyle={styles.fillImage} style={styles.paperFill}>
        <Text style={styles.paperText}>{children}</Text>
      </ImageBackground>
    </TouchableOpacity>
  );
}

// 일차정서 first — six broad families (Willcox's Feeling Wheel, emotions.ts) — then, on the next
// tap, the 이차정서 inside the chosen one. Shared by the gate and the hospital visit.
export default function EmotionPicker({ onPick, paper = false }: Props) {
  const [family, setFamily] = useState<EmotionFamily | null>(null);

  if (!family) {
    return (
      <View style={styles.center}>
        <Text style={styles.prompt}>지금 마음에 가까운 말이 있다면?</Text>
        <View style={styles.familyGrid}>
          {EMOTION_FAMILIES.map((f, i) =>
            paper ? (
              <PaperCard key={f.id} index={i} onPress={() => setFamily(f)}>
                {f.label}
              </PaperCard>
            ) : (
            <TouchableOpacity
              key={f.id}
              style={[styles.familyButton, { borderColor: f.color, backgroundColor: `${f.color}33` }]}
              onPress={() => setFamily(f)}
            >
              <Text style={styles.familyText}>{f.label}</Text>
            </TouchableOpacity>
            )
          )}
        </View>
        <TouchableOpacity style={styles.unsure} onPress={() => onPick(null, null)}>
          <Text style={styles.unsureText}>{EMOTION_UNSURE}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.prompt}>{family.label} 중에서는 어떤 쪽에 가까워?</Text>
      <View style={styles.wordRow}>
        {family.words.map((word, i) =>
          paper ? (
            <PaperCard key={word} index={i} onPress={() => onPick(word, family.id)}>
              {word}
            </PaperCard>
          ) : (
          <TouchableOpacity
            key={word}
            style={[styles.chip, { backgroundColor: `${family.color}33`, borderColor: family.color }]}
            onPress={() => onPick(word, family.id)}
          >
            <Text style={styles.chipText}>{word}</Text>
          </TouchableOpacity>
          )
        )}
      </View>
      <TouchableOpacity style={[styles.chip, styles.chipPlain]} onPress={() => onPick(family.label, family.id)}>
        <Text style={styles.chipText}>그냥 {family.label}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.back} onPress={() => setFamily(null)}>
        <Text style={styles.unsureText}>‹ 다른 감정</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 12 },
  prompt: { color: '#fff', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  paperCard: { width: 98, height: 50 },
  // ImageBackground's image otherwise keeps the file's own size on web and overflows.
  fillImage: { width: '100%', height: '100%' },
  paperFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  paperText: { color: '#111', fontSize: 15, fontFamily: 'serif', fontWeight: '700' },
  familyGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 330 },
  familyButton: { width: 100, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, alignItems: 'center' },
  familyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  wordRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 330 },
  chipPlain: { backgroundColor: 'rgba(255,255,255,0.08)' },
  back: { paddingHorizontal: 12, paddingVertical: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chipText: { color: '#fff', fontSize: 14 },
  unsure: { marginTop: 2, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
  unsureText: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
});
