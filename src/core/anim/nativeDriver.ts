import { Platform } from 'react-native';

// react-native-web has no native animation driver; requesting it there just
// logs a console warning and silently falls back to JS anyway.
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';
