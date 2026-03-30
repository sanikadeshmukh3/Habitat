/**
 * mobile/hooks/use-checkin.ts
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { habitKeys } from './use-habits';

export type CheckInPayload = {
  habitId: number;
  date: string;
  completed?: boolean;
  difficultyRating?: number | null;
  notes?: string;
};

export type HabitCheckIn = {
  id: number;
  habitId: number;
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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const checkinKeys = {
  all: () => ['checkins'] as const,
  month: (year: number, month: number) =>
    ['checkins', 'month', year, month] as const,
} as const;

function buildMonthKey(habitId: number, dateInput: string | Date): string {
  const d = new Date(dateInput);
  return `${habitId}-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

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
  const { data } = await api.post<{ data: HabitCheckIn }>('/checkins', payload);
  return data.data;
}

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

export function useUpsertCheckIn(
  year: number,
  month: number,
  userId: number,
): UseMutationResult<HabitCheckIn, AxiosError, CheckInPayload, UpsertCheckInContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckInPayload) => upsertCheckIn(payload),

    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: checkinKeys.month(year, month),
      });

      const previousMonthData = queryClient.getQueryData<MonthlyCheckInMap>(
        checkinKeys.month(year, month),
      );

      const key = buildMonthKey(payload.habitId, payload.date);

      queryClient.setQueryData<MonthlyCheckInMap>(
        checkinKeys.month(year, month),
        (old = {}) => ({
          ...old,
          [key]: {
            completed: payload.completed ?? true,
            difficultyRating: payload.difficultyRating ?? null,
            notes: payload.notes?.trim() ? payload.notes : null,
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
      queryClient.invalidateQueries({
        queryKey: checkinKeys.month(year, month),
      });

      if (payload?.habitId) {
        queryClient.invalidateQueries({
          queryKey: habitKeys.detail(payload.habitId),
        });
      }

      if (userId) {
        queryClient.invalidateQueries({
          queryKey: habitKeys.list(userId),
        });
      }
    },
  });
}