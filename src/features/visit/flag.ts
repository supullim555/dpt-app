import { Platform } from 'react-native';

// 병문안 is reachable only at ?visit=1 until its script has had expert review (docs/계획서.md):
// pushing to master deploys publicly, and the default address must not show a placeholder story
// about a dying girl. &dev=1 adds day-skipping buttons for testing the seven days.
const search = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : '';

export const VISIT_ENABLED = /[?&]visit=1\b/.test(search);
export const VISIT_DEV = /[?&]dev=1\b/.test(search);
