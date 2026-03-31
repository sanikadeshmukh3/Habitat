/**
 * hooks/useHabits.ts
 *
 * React Query hooks that act as the single source of truth for habit data.
 * Every screen (home, create-habit, habit-detail, etc.) should read from
 * and write through these hooks — never fetch directly.
 *
 * Prerequisites:
 *   npm install @tanstack/react-query axios
 *
 * Wrap your app root with <QueryClientProvider client={queryClient}>
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  Habit,
  HabitDetail,
  HabitCheckIn,
  CreateHabitPayload,
  UpdateHabitPayload,
} from '../types/habit';

import api from '@/lib/api';

// ─── Query key factory ────────────────────────────────────────────────────────
// Keeps cache invalidation predictable and co-located.

export const habitKeys = {
  all:    ()          => ['habits']                 as const,
  lists:  ()          => ['habits', 'list']         as const,
  list:   () => ['habits', 'list'] as const,
  detail: (id: string)    => ['habits', 'detail', id]   as const,
} as const;

// ─── API functions ────────────────────────────────────────────────────────────

async function fetchHabits(): Promise<Habit[]> {
  const { data } = await api.get<{ data: Habit[] }>('/habits');
  return data.data;
}

async function fetchHabitDetail(habitId: string): Promise<HabitDetail> {
  const { data } = await api.get<{ data: HabitDetail }>(`/habits/${habitId}`);
  return data.data;
}

async function createHabit(payload: CreateHabitPayload): Promise<Habit> {
  console.log('POSTING TO /habits with:', payload);
  const { data } = await api.post<{ data: Habit }>('/habits', payload);
  return data.data;
}

async function updateHabit(
  habitId: string,
  payload: UpdateHabitPayload,
): Promise<Habit> {
  const { data } = await api.patch<{ data: Habit }>(`/habits/${habitId}`, payload);
  return data.data;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * useHabits
 * Fetches the full habit list for a given user.
 *
 * @example
 * const { data: habits, isLoading, error } = useHabits(currentUserId);
 */
export function useHabits(): UseQueryResult<Habit[], AxiosError> {
  return useQuery({
    queryKey: habitKeys.list(),
    queryFn:  () => fetchHabits(),
    staleTime: 1000 * 60 * 2, // treat data as fresh for 2 minutes
  });
}

/**
 * useHabitDetail
 * Fetches a single habit plus its stats (streak, grid, completion rate).
 * Initialises from the list cache if the habit is already there, so the
 * hero card can render instantly while stats load in the background.
 *
 * @example
 * const { data: habit, isLoading } = useHabitDetail(habitId, currentUserId);
 */
export function useHabitDetail(
  habitId: string,
): UseQueryResult<HabitDetail, AxiosError> {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: habitKeys.detail(habitId),
    queryFn:  () => fetchHabitDetail(habitId),
    enabled:  !!habitId,
    staleTime: 1000 * 60 * 1, // stats change more often — refresh every minute
    // Seed the cache with data from the list so the screen isn't blank on mount
    placeholderData: () => {
      const list = queryClient.getQueryData<Habit[]>(habitKeys.list());
      const found = list?.find((h) => h.id === habitId);
      if (!found) return undefined;
      // Return a partial HabitDetail; stats will be undefined until the real
      // fetch completes. Cast is safe because we check for stats before use.
      return { ...found, stats: undefined } as unknown as HabitDetail;
    },
  });
}

/**
 * useCreateHabit
 * Creates a new habit and immediately adds it to the list cache (optimistic
 * insert is skipped here in favour of a simpler invalidation approach, since
 * the server assigns the id).
 *
 * @example
 * const { mutate: createHabit, isPending } = useCreateHabit(currentUserId);
 * createHabit({ name: 'Drink water', category: 'Fitness', frequency: 'Daily', isPublic: false });
 */
export function useCreateHabit(): UseMutationResult<
  Habit,
  AxiosError,
  CreateHabitPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateHabitPayload) => createHabit(payload),

    onSuccess: (newHabit) => {
      // Inject the new habit at the top of the cached list immediately
      // (avoids a full refetch round-trip for a snappier UX).
      queryClient.setQueryData<Habit[]>(habitKeys.list(), (old = []) => [
        newHabit,
        ...old,
      ]);

      // Also prime the detail cache so navigating straight to the new habit
      // detail screen won't trigger an extra network request.
      queryClient.setQueryData<HabitDetail>(
        habitKeys.detail(newHabit.id),
        { ...newHabit, stats: undefined } as unknown as HabitDetail,
      );
    },

    onError: (error) => {
      console.error('[useCreateHabit] failed:', error.message);
    },
  });
}

/**
 * useUpdateHabit
 * Applies a partial update to a habit using optimistic updates so the UI
 * responds instantly. If the server rejects the change the cache is rolled back.
 *
 * @example
 * const { mutate: updateHabit } = useUpdateHabit(habit.id, currentUserId);
 * updateHabit({ isPublic: true });
 */
export function useUpdateHabit(
  habitId: string,
): UseMutationResult<Habit, AxiosError, UpdateHabitPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateHabitPayload) => updateHabit(habitId, payload),

    // ── Optimistic update ────────────────────────────────────────────────────
    onMutate: async (payload) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic data
      await queryClient.cancelQueries({ queryKey: habitKeys.detail(habitId) });
      await queryClient.cancelQueries({ queryKey: habitKeys.list() });

      // Snapshot current values for rollback
      const prevDetail = queryClient.getQueryData<HabitDetail>(habitKeys.detail(habitId));
      const prevList   = queryClient.getQueryData<Habit[]>(habitKeys.list());

      // Apply the change immediately in both caches
      if (prevDetail) {
        queryClient.setQueryData<HabitDetail>(habitKeys.detail(habitId), {
          ...prevDetail,
          ...payload,
        });
      }

      if (prevList) {
        queryClient.setQueryData<Habit[]>(
          habitKeys.list(),
          prevList.map((h) => (h.id === habitId ? { ...h, ...payload } : h)),
        );
      }

      return { prevDetail, prevList };
    },

    // ── Rollback on error ────────────────────────────────────────────────────
    onError: (error, _payload, context) => {
      console.error('[useUpdateHabit] failed:', error.message);

      if (context?.prevDetail) {
        queryClient.setQueryData(habitKeys.detail(habitId), context.prevDetail);
      }
      if (context?.prevList) {
        queryClient.setQueryData(habitKeys.list(), context.prevList);
      }
    },

    // ── Settle: revalidate from server after success or error ────────────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.detail(habitId) });
      queryClient.invalidateQueries({ queryKey: habitKeys.list() });
    },
  });
}