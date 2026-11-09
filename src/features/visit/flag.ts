import { Platform } from 'react-native';

// &dev=1 adds day-skipping buttons for testing the seven days. (Until v0.91 the earlier app opened at ?old=1; it's
// gone now, and ?visit=1 links still open 병문안 like any other address.)
const search = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : '';

export const VISIT_DEV = /[?&]dev=1\b/.test(search);
