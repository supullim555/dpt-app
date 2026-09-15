import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'dpt.';

export async function saveEntry<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export async function loadEntry<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  return raw ? (JSON.parse(raw) as T) : null;
}
