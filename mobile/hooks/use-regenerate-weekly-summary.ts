import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import axios from 'axios';

type WeeklySummaryResponse = {
  summary: string | null;
  fromCache: boolean;
  available: boolean;
  message?: string;
  refreshCount: number;
  refreshesRemaining: number;
};

type WeeklySummaryPayload = {
  weekKey: string;
  recap: {
    weekStart: string;
    weekEnd: string;
    archetype: {
      animal: string;
      title: string;
      description: string;
    };
    scores: {
      completionScore: number;
      consistencyScore: number;
      streakScore: number;
      reflectionScore?: number;
      activityScore?: number;
    };
    snapshots: {
      completionPulse: {
        percent: number;
        insight: string;
      };
      categoryLeader: {
        topCategory: string;
        topPercent: number;
        weakestCategory?: string | null;
        weakestPercent?: number | null;
        insight: string;
      };
      rhythmCheck: {
        bestDay: string;
        weakestDay?: string | null;
        strongDays: number;
        insight: string;
      };
      moodBoard: {
        label: string;
        averageDifficulty?: number | null;
        insight: string;
      };
    };
  };
};

async function regenerateWeeklySummary(payload: WeeklySummaryPayload) {
  try {
    const { data } = await api.post<WeeklySummaryResponse>(
      '/ai/weekly-summary/regenerate',
      payload
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('REGENERATE ERROR STATUS:', error.response?.status);
      console.log('REGENERATE ERROR DATA:', error.response?.data);
    }
    throw error;
  }
}

export function useRegenerateWeeklySummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: regenerateWeeklySummary,
    onSuccess: async (data, payload) => {
      queryClient.setQueryData(['weekly-summary', payload.weekKey], data);
      await queryClient.invalidateQueries({
        queryKey: ['weekly-summary', payload.weekKey],
      });
    },
    onError: (error) => {
      console.log('regenerate mutation error', error);
    },
  });
}