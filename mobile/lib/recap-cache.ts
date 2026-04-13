import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeeklyRecap } from './recap-utility';

const RECAP_PREFIX = '@recap/';

export async function saveRecapToCache(recap: WeeklyRecap) {
  const key = `${RECAP_PREFIX}${recap.weekKey}`;
  await AsyncStorage.setItem(key, JSON.stringify(recap));
}

export async function loadRecapFromCache(weekKey: string): Promise<WeeklyRecap | null> {
  const key = `${RECAP_PREFIX}${weekKey}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WeeklyRecap;
  } catch {
    return null;
  }
}