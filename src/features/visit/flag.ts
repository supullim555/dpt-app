import { Platform } from 'react-native';

// 병문안 is the app's front door since v0.75, by the user's decision (docs/계획서.md), ahead of the expert review its
// script still needs. The earlier app (the room, the check-in, the exercises) is kept, not deleted: it opens only at
// ?old=1. ?visit=1 still works for links already shared. &dev=1 adds day-skipping buttons for testing the seven days.
const search = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : '';

export const OLD_APP = /[?&]old=1\b/.test(search);
export const VISIT_ENABLED = !OLD_APP;
export const VISIT_DEV = /[?&]dev=1\b/.test(search);
