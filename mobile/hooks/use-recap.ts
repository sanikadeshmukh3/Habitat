import { useEffect, useMemo, useState } from 'react';
import {
  buildWeeklyRecap,
  getWeekKey,
  type WeeklyRecap,
  type HabitCheckInRecord,
  type HabitRecord,
  startOfWeekSunday,
} from '@/lib/recap-utility';
import { loadRecapFromCache, saveRecapToCache } from '@/lib/recap-cache';
import { useHabits } from '@/hooks/use-habits';
import { useCheckInsForMonth, type MonthlyCheckInMap } from '@/hooks/use-checkin';

function monthKey(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
  };
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function mapToCheckInRecords(checkInMap: MonthlyCheckInMap): HabitCheckInRecord[] {
  const records: HabitCheckInRecord[] = [];

  for (const [key, value] of Object.entries(checkInMap)) {
    const dateMatch = key.match(/\d{4}-\d{2}-\d{2}/);

    if (!dateMatch) {
      console.warn('[useRecap] Invalid check-in key format:', key);
      continue;
    }

    const date = dateMatch[0];
    const dateIndex = key.indexOf(date);

    if (dateIndex <= 0) {
      console.warn('[useRecap] Invalid check-in key format:', key);
      continue;
    }

    const habitId = key.slice(0, dateIndex - 1); // remove the dash before the date

    if (!habitId) {
      console.warn('[useRecap] Invalid check-in key format:', key);
      continue;
    }

    records.push({
      habitId,
      date,
      completed: value.completed,
      difficultyRating: value.difficultyRating,
      notes: value.notes,
    });
  }

  return records;
}

export function useRecap(now = new Date()) {
  const weekKey = getWeekKey(now);
  const weekStart = startOfWeekSunday(now);

  const currentMonthInfo = monthKey(now);
  const startMonthInfo = monthKey(weekStart);
  const spansTwoMonths = !sameMonth(now, weekStart);

  const { data: habits = [], isLoading: habitsLoading } = useHabits();

  const {
    data: currentMonthCheckInMap = {},
    isLoading: currentMonthLoading,
  } = useCheckInsForMonth(currentMonthInfo.year, currentMonthInfo.month);

  const {
    data: startMonthCheckInMap = {},
    isLoading: startMonthLoading,
  } = useCheckInsForMonth(startMonthInfo.year, startMonthInfo.month);

  const [cachedRecap, setCachedRecap] = useState<WeeklyRecap | null>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCache() {
      try {
        const cached = await loadRecapFromCache(weekKey);
        if (mounted) {
          setCachedRecap(cached);
        }
      } finally {
        if (mounted) {
          setCacheLoaded(true);
        }
      }
    }

    loadCache();

    return () => {
      mounted = false;
    };
  }, [weekKey]);

  const checkIns = useMemo(() => {
    const currentRecords = mapToCheckInRecords(currentMonthCheckInMap);

    if (!spansTwoMonths) {
      return currentRecords;
    }

    const startRecords = mapToCheckInRecords(startMonthCheckInMap);

    const deduped = new Map<string, HabitCheckInRecord>();

    for (const checkIn of [...startRecords, ...currentRecords]) {
      const dedupeKey = `${checkIn.habitId}-${checkIn.date}`;
      deduped.set(dedupeKey, checkIn);
    }

    return Array.from(deduped.values());
  }, [currentMonthCheckInMap, startMonthCheckInMap, spansTwoMonths]);

  const computedRecap = useMemo(() => {
    if (!cacheLoaded) return null;
    if (!habits.length) return null;

    return buildWeeklyRecap(habits as HabitRecord[], checkIns, now);
  }, [habits, checkIns, now, cacheLoaded]);

  useEffect(() => {
    if (!computedRecap) return;

    saveRecapToCache(computedRecap).catch((error) => {
      console.warn('Failed to save recap cache:', error);
    });
  }, [computedRecap]);

  return {
    recap: computedRecap ?? cachedRecap,
    isLoading:
      habitsLoading ||
      currentMonthLoading ||
      (spansTwoMonths && startMonthLoading) ||
      !cacheLoaded,
    weekKey,
    isFromCache: !computedRecap && !!cachedRecap,
  };
}