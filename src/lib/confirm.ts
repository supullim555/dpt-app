import { Alert, Platform } from 'react-native';

/**
 * A yes/no confirm that actually works on web. `Alert.alert()` is a documented no-op there
 * (react-native-web ships `static alert() {}`) — found by actually clicking "전체 기록 지우기"
 * in the deployed web build and watching nothing happen. `window.confirm` is blocking and ugly,
 * but it's a real dialog; swap it for a custom modal later if the look matters more than that.
 */
export function confirmDestructive(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel', onPress: () => resolve(false) },
      { text: '지우기', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
