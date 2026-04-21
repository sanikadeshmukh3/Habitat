// hooks/use-weekly-summary.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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

async function fetchWeeklySummary(
  payload: WeeklySummaryPayload
): Promise<WeeklySummaryResponse> {
  const { data } = await api.post<WeeklySummaryResponse>('/ai/weekly-summary', payload);
  return data;
}

export function useWeeklySummary(payload: WeeklySummaryPayload | null) {
  return useQuery({
    queryKey: ['weekly-summary', payload?.weekKey],
    queryFn: () => fetchWeeklySummary(payload!),
    enabled: !!payload,
    staleTime: 1000 * 60 * 60 * 24,
  });
}