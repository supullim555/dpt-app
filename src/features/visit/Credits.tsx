import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ImageBackground, StyleSheet, Text, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native';
import { USE_NATIVE_DRIVER } from '@/core/anim/nativeDriver';
import CrisisFooter from '@/ui/CrisisFooter';

// v0.98: the happy ending's last scene. A bright blue sky over the top of the ginkgo, the credits rolling up it, and
// then the one thing the game wants to leave with you. A tap hurries the credits to the end; the next tap goes on.
const ROLL_MS = 26000;
const CREDITS: [string, string][] = [
  ['병문안', ''],
  ['이야기 · 대사', '사람이 직접 썼어요'],
  ['그림', 'Gemini로 그리고, 손으로 다듬었어요'],
  ['음악', '"Forget Me Not" · Kistol (OpenGameArt)'],
  ['소리', 'OpenGameArt · Kenney의 CC0 소리들'],
  ['3D', 'three.js'],
  ['영상', 'EffectCraft'],
  ['기대고 있는 생각', '인지치료 · 인지행동치료'],
  ['', ''],
  ['그리고', '끝까지 와 준 당신'],
];
export const THANKS = '플레이 해주셔서 감사합니다.';
export const MAGIC = '살면서 아무리 힘들어도, 마법 같은 일이 찾아오는 날이 있을 거예요.';

export default function Credits({ fontScale, onDone }: { fontScale: number; onDone: () => void }) {
  const [height, setHeight] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const [rolled, setRolled] = useState(false);
  const roll = useRef(new Animated.Value(0)).current;
  const message = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!height || !listHeight || rolled) return;
    const anim = Animated.timing(roll, { toValue: 1, duration: ROLL_MS, easing: Easing.linear, useNativeDriver: USE_NATIVE_DRIVER });
    anim.start(({ finished }) => finished && setRolled(true));
    return () => anim.stop();
  }, [height, listHeight, rolled, roll]);

  useEffect(() => {
    if (!rolled) return;
    const anim = Animated.timing(message, { toValue: 1, duration: 1400, useNativeDriver: USE_NATIVE_DRIVER });
    anim.start();
    return () => anim.stop();
  }, [rolled, message]);

  const translateY = roll.interpolate({ inputRange: [0, 1], outputRange: [height, -listHeight] });
  const text = { fontSize: 15 * fontScale, lineHeight: 24 * fontScale };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.fill}
        onPress={() => (rolled ? onDone() : (roll.stopAnimation(), roll.setValue(1), setRolled(true)))}
        accessibilityLabel={rolled ? '넘기기' : '크레딧 넘기기'}
      >
        <ImageBackground source={require('@/assets/visit/comics/end-sky.jpg')} resizeMode="cover" style={styles.fill} onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}>
          {!rolled && (
            <Animated.View style={[styles.list, { transform: [{ translateY }] }]} onLayout={(e: LayoutChangeEvent) => setListHeight(e.nativeEvent.layout.height)}>
              {CREDITS.map(([role, who], i) => (
                <View key={i} style={styles.entry}>
                  {role ? <Text style={[styles.role, { fontSize: (i === 0 ? 26 : 13) * fontScale }]}>{role}</Text> : null}
                  {who ? <Text style={[styles.who, text]}>{who}</Text> : null}
                </View>
              ))}
            </Animated.View>
          )}
          {rolled && (
            <Animated.View style={[styles.message, { opacity: message }]}>
              <Text style={[styles.thanks, { fontSize: 20 * fontScale, lineHeight: 32 * fontScale }]}>{THANKS}</Text>
              <Text style={[styles.magic, { fontSize: 16 * fontScale, lineHeight: 28 * fontScale }]}>{MAGIC}</Text>
              <Text style={styles.more}>▼</Text>
            </Animated.View>
          )}
        </ImageBackground>
      </TouchableOpacity>
      <CrisisFooter tone="dark" />
    </View>
  );
}

const SHADOW = { textShadowColor: 'rgba(20,40,80,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 };
const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#3a6fb0' },
  fill: { flex: 1, overflow: 'hidden' },
  list: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center', gap: 26, paddingHorizontal: 24 },
  entry: { alignItems: 'center', gap: 4 },
  role: { color: '#fff', fontFamily: 'serif', opacity: 0.85, ...SHADOW },
  who: { color: '#fff', fontFamily: 'serif', textAlign: 'center', ...SHADOW },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 18 },
  thanks: { color: '#fff', fontFamily: 'serif', textAlign: 'center', ...SHADOW },
  magic: { color: '#fff', fontFamily: 'serif', textAlign: 'center', ...SHADOW },
  more: { position: 'absolute', bottom: 24, color: '#fff', fontSize: 11, opacity: 0.7 },
});
