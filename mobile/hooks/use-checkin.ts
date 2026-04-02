/**
 * mobile/hooks/use-checkin.ts
 *
 * This file manages ALL check-in related logic using React Query.
 *
 * Responsibilities:
 * - Fetch check-ins for a given month
 * - Create/update (upsert) check-ins
 * - Handle optimistic UI updates
 * - Keep UI in sync with backend via cache invalidation
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { habitKeys } from './use-habits';

/**
 * Payload sent to backend when creating/updating a check-in
 */
export type CheckInPayload = {
  habitId: string;                  // ID of the habit being checked in
  date: string;                     // ISO date string (YYYY-MM-DD)
  completed?: boolean;              // Whether the habit was completed (default true)
  difficultyRating?: number | null; // Optional difficulty rating
  notes?: string;                   // Optional user notes
};

/**
 * Structure of a check-in returned from the backend
 */
export type HabitCheckIn = {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  difficultyRating: number | null;
  notes: string | null;
};

/**
 * Shape of monthly check-in data stored in React Query cache
 *
 * Key format:
 *   "habitId-YYYY-MM-DD"
 *
 * Value:
 *   Check-in metadata for that specific day
 */
export type MonthlyCheckInMap = Record<
  string,
  {
    completed: boolean;
    difficultyRating: number | null;
    notes: string | null;
  }
>;

/**
 * Context used for optimistic updates
 * Allows rollback if mutation fails
 */
type UpsertCheckInContext = {
  previousMonthData?: MonthlyCheckInMap;
};

/**
 * React Query key factory for check-ins
 * Helps organize cache keys consistently
 */
export const checkinKeys = {
  all: () => ['checkins'] as const,

  // Key for fetching a specific month’s data
  month: (year: number, month: number) =>
    ['checkins', 'month', year, month] as const,
} as const;

/**
 * Builds a unique key for a check-in entry
 * Used for storing/retrieving data from cache
 *
 * Example output:
 *   "habit123-2026-04-25"
 */
function buildMonthKey(habitId: string, dateInput: string | Date): string {
  if (typeof dateInput === 'string') {
    return `${habitId}-${dateInput}`;
  }

  const year = dateInput.getFullYear();
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const day = String(dateInput.getDate()).padStart(2, '0');

  return `${habitId}-${year}-${month}-${day}`;
}

/**
 * Fetch all check-ins for a given month from backend
 */
async function fetchCheckInsForMonth(
  year: number,
  month: number,
): Promise<MonthlyCheckInMap> {
  const { data } = await api.get<{ data: MonthlyCheckInMap }>('/checkins', {
    params: { year, month }, // Query params sent to backend
  });

  return data.data;
}

/**
 * Create or update (upsert) a check-in in backend
 */
async function upsertCheckIn(payload: CheckInPayload): Promise<HabitCheckIn> {
  const { data } = await api.post<{ data: HabitCheckIn }>(
    '/checkins',
    payload,
  );

  return data.data;
}

/**
 * Hook: Fetch check-ins for a specific month
 *
 * Uses React Query for:
 * - caching
 * - background refetching
 * - automatic updates
 */
export function useCheckInsForMonth(
  year: number,
  month: number,
): UseQueryResult<MonthlyCheckInMap, AxiosError> {
  return useQuery({
    queryKey: checkinKeys.month(year, month),

    // Fetch function
    queryFn: () => fetchCheckInsForMonth(year, month),

    // Only run query if inputs are valid
    enabled: Number.isFinite(year) && Number.isFinite(month),

    // Cache freshness (1 minute)
    staleTime: 1000 * 60,
  });
}

/**
 * Hook: Create/update a check-in
 *
 * Features:
 * - Optimistic UI updates
 * - Error rollback
 * - Cache syncing
 */
export function useUpsertCheckIn(
  year: number,
  month: number,
  userId: string,
): UseMutationResult<HabitCheckIn, AxiosError, CheckInPayload, UpsertCheckInContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckInPayload) => upsertCheckIn(payload),

    /**
     * OPTIMISTIC UPDATE
     * Runs BEFORE the API request
     */
    onMutate: async (payload) => {
      // Cancel any outgoing queries to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: checkinKeys.month(year, month),
      });

      // Snapshot previous data for rollback
      const previousMonthData = queryClient.getQueryData<MonthlyCheckInMap>(
        checkinKeys.month(year, month),
      );

      const key = buildMonthKey(payload.habitId, payload.date);
      const trimmedNotes = payload.notes?.trim();

      // Immediately update cache (UI updates instantly)
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

    /**
     * ERROR HANDLING
     * Roll back optimistic update if request fails
     */
    onError: (error, _payload, context) => {
      console.error('[useUpsertCheckIn] failed:', error.message);

      if (context?.previousMonthData) {
        queryClient.setQueryData(
          checkinKeys.month(year, month),
          context.previousMonthData,
        );
      }
    },

    /**
     * SUCCESS HANDLING
     * Sync cache with actual backend response
     */
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

    /**
     * FINAL STEP (always runs)
     * Ensures data consistency across app
     */
    onSettled: (_data, _error, payload) => {
      // Refetch month data
      queryClient.invalidateQueries({
        queryKey: checkinKeys.month(year, month),
      });

      // Refetch habit details if needed
      if (payload?.habitId) {
        queryClient.invalidateQueries({
          queryKey: habitKeys.detail(payload.habitId),
        });
      }

      // Refetch habit list (dashboard updates)
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: habitKeys.list(),
        });
      }
    },
  });
}