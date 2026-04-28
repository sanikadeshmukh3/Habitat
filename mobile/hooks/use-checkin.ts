/**
 * use-checkin.ts
 *
 * This file centralizes all check-in related data logic using React Query.
 * It provides:
 *  - Query hook for fetching monthly check-ins
 *  - Mutation hook for creating/updating check-ins (upsert)
 *  - Shared key builder to ensure consistency across the app
 *
 * Design Goal:
 * Ensure a single source of truth for check-in state so that multiple screens
 * (e.g., calendar and habit detail) stay synchronized automatically.
 */

import api from '@/lib/api';
import {
  UseMutationResult,
  UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { habitKeys } from './use-habits';

export type CheckInPayload = {
  habitId: string;
  date: string;
  completed?: boolean;
  difficultyRating?: number | null;
  notes?: string;
};

export type HabitCheckIn = {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  difficultyRating: number | null;
  notes: string | null;
};

export type MonthlyCheckInMap = Record<
  string,
  {
    completed: boolean;
    difficultyRating: number | null;
    notes: string | null;
  }
>;

type UpsertCheckInContext = {
  previousMonthData?: MonthlyCheckInMap;
};

/**
 * React Query keys for check-in related data.
 *
 * We namespace queries by "month" so that:
 * - All check-ins for a given month are cached together
 * - Updates invalidate only the relevant portion of the cache
 */
export const checkinKeys = {
  all: () => ['checkins'] as const,
  month: (year: number, month: number) =>
    ['checkins', 'month', year, month] as const,
} as const;

/**
 * Builds a consistent key for a habit check-in on a specific date.
 *
 * Format: habitId-YYYY-MM-DD
 *
 * Why this matters:
 * - Ensures all components reference the same check-in entry
 * - Prevents mismatches caused by inconsistent date formatting
 * - Handles both Date objects and ISO strings
 */
export function buildMonthKey(habitId: string, dateInput: string | Date): string {
  // If given an ISO string, extract the date portion directly to avoid
  // timezone conversion issues and ensure the key matches the backend format
  if (typeof dateInput === 'string') {
    const datePart = dateInput.substring(0, 10); // "2026-04-25T12:00:00.000Z" → "2026-04-25"
    return `${habitId}-${datePart}`;
  }

  const year  = dateInput.getFullYear();
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const day   = String(dateInput.getDate()).padStart(2, '0');
  return `${habitId}-${year}-${month}-${day}`;
}

/**
 * Fetches all check-ins for a given month from the backend.
 *
 * Returns a map keyed by "habitId-YYYY-MM-DD".
 *
 * This structure allows O(1) lookup for any habit/day combination
 * in both the calendar and habit detail screens.
 */
async function fetchCheckInsForMonth(
  year: number,
  month: number,
): Promise<MonthlyCheckInMap> {
  const { data } = await api.get<{ data: MonthlyCheckInMap }>('/checkins', {
    params: { year, month },
  });

  return data.data;
}

async function upsertCheckIn(payload: CheckInPayload): Promise<HabitCheckIn> {
  const { data } = await api.post<{ data: HabitCheckIn }>(
    '/checkins',
    payload,
  );

  return data.data;
}

/**
 * React Query hook for retrieving monthly check-ins.
 *
 * Features:
 * - Caches results per (year, month)
 * - Automatically refetches when invalidated
 * - Provides shared data across components
 *
 * This is the primary source of truth for check-in state.
 */
export function useCheckInsForMonth(
  year: number,
  month: number,
): UseQueryResult<MonthlyCheckInMap, AxiosError> {
  return useQuery({
    queryKey: checkinKeys.month(year, month),
    queryFn: () => fetchCheckInsForMonth(year, month),
    enabled: Number.isFinite(year) && Number.isFinite(month),
    staleTime: 1000 * 60,
  });
}

/**
 * Mutation hook for creating or updating a check-in.
 *
 * Uses an "upsert" approach:
 * - If a check-in exists → update it
 * - If not → create a new one
 *
 * Includes optimistic updates to provide instant UI feedback.
 */
export function useUpsertCheckIn(
  year: number,
  month: number,
): UseMutationResult<HabitCheckIn, AxiosError, CheckInPayload, UpsertCheckInContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckInPayload) => upsertCheckIn(payload),

    onMutate: async (payload) => {
      // cancel all checkin queries, not just the current month,
      // since the calendar merges prev/current/next month data
      await queryClient.cancelQueries({
        queryKey: checkinKeys.all(),
      });

      const previousMonthData = queryClient.getQueryData<MonthlyCheckInMap>(
        checkinKeys.month(year, month),
      );

      const key = buildMonthKey(payload.habitId, payload.date);
      const trimmedNotes = payload.notes?.trim();

      queryClient.setQueryData<MonthlyCheckInMap>(
        checkinKeys.month(year, month),
        (old = {}) => ({
          ...old,
          [key]: {
            completed: payload.completed ?? true,
            difficultyRating: payload.difficultyRating ?? null,
            notes: trimmedNotes ? trimmedNotes : null,
          },
        }),
      );

      return { previousMonthData };
    },

    onError: (error, _payload, context) => {
      console.error('[useUpsertCheckIn] failed:', error.message);

      if (context?.previousMonthData) {
        queryClient.setQueryData(
          checkinKeys.month(year, month),
          context.previousMonthData,
        );
      }
    },

    onSuccess: (savedCheckIn) => {
      const key = buildMonthKey(savedCheckIn.habitId, savedCheckIn.date);

      queryClient.setQueryData<MonthlyCheckInMap>(
        checkinKeys.month(year, month),
        (old = {}) => ({
          ...old,
          [key]: {
            completed: savedCheckIn.completed,
            difficultyRating: savedCheckIn.difficultyRating,
            notes: savedCheckIn.notes,
          },
        }),
      );
    },

    onSettled: (_data, _error, payload) => {
      // intentionally NOT invalidating checkinKeys here
      // onMutate and onSuccess already manage the checkin cache correctly
      // invalidating causes a background refetch that races with onSuccess
      // and overwrites the cache with stale data
      if (payload?.habitId) {
        queryClient.invalidateQueries({
          queryKey: habitKeys.detail(payload.habitId),
        });
      }
    
      queryClient.invalidateQueries({
        queryKey: habitKeys.list(),
      });
    },
  });
}