import { Platform } from 'react-native';

// Web-only: Enter submits, Shift+Enter inserts a newline. Native platforms
// don't get a physical Enter key on their default multiline keyboard, so we
// leave their normal "return key inserts a newline" behavior untouched.
export function makeSubmitOnEnterHandler(onSubmit: () => void) {
  if (Platform.OS !== 'web') return undefined;
  return (e: { nativeEvent: { key: string; shiftKey?: boolean }; preventDefault?: () => void }) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault?.();
      onSubmit();
    }
  };
}
