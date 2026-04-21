import api from '@/lib/api';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const colors = {
  bg:            '#F7FAF5',
  card:          '#FFFFFF',
  sage:          '#7BAE7F',
  sageMid:       '#A8C5A0',
  sagePale:      '#E3F0E1',
  yellow:        '#F5E6A3',
  yellowDeep:    '#E8C84A',
  indigo:        '#3D3B8E',
  indigoPale:    '#EEEDF8',
  indigoMid:     '#6C63FF',
  textPrimary:   '#2B2D42',
  textSecondary: '#6B7280',
  border:        '#E4EDE2',
  shadow:        'rgba(61, 59, 142, 0.08)',
};

type ProgressData = {
  entryId: string;
  habitId: string;
  habitName: string;
  currentScore: number;
  targetScore: number;
  provingWindowStart: string;
  provingWindowTarget: string;
  daysRemaining: number;
  thresholdMet: boolean;
  windowPassed: boolean;
};

type Props = {
  enrollmentId: string;
  onOptOut: () => void;
};

export default function StackingStatusCard({ enrollmentId, onOptOut }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await api.get(`/stacking/progress/${enrollmentId}`);
        setProgress(response.data.progress);
      } catch (error) {
        console.error('Error fetching stacking progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [enrollmentId]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.indigo} />
      </View>
    );
  }

  if (!progress) return null;

  const scorePercent  = Math.round(progress.currentScore * 100);
  const targetPercent = Math.round(progress.targetScore * 100);
  const fillPercent   = Math.min(progress.currentScore / progress.targetScore, 1);

  const progressMessage = progress.windowPassed
    ? `Your proving window has passed — keep going, you're almost there!`
    : `${progress.daysRemaining} day${progress.daysRemaining !== 1 ? 's' : ''} remaining in your proving window`;

  return (
    <View style={styles.card}>

      {/* yellow accent bar at top */}
      <View style={styles.accentBar} />

      <View style={styles.content}>

        {/* header row */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionLabel}>HABIT STACKING</Text>
          <TouchableOpacity onPress={onOptOut} activeOpacity={0.7}>
            <Text style={styles.optOutText}>Opt Out</Text>
          </TouchableOpacity>
        </View>

        {/* active habit name */}
        <Text style={styles.activeHabitLabel}>Currently focusing on</Text>
        <Text style={styles.activeHabitName}>{progress.habitName}</Text>

        {/* consistency progress bar */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Consistency</Text>
          <Text style={styles.progressScore}>
            {scorePercent}%{' '}
            <Text style={styles.progressTarget}>/ {targetPercent}% goal</Text>
          </Text>
        </View>

        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${fillPercent * 100}%` },
              progress.thresholdMet && styles.progressBarComplete,
            ]}
          />
        </View>

        {/* progress message */}
        <Text style={styles.progressMessage}>{progressMessage}</Text>

        {/* view / edit priority ranking button */}
        <TouchableOpacity
          style={styles.rankingButton}
          onPress={() => router.push({
            pathname: '/habit-ranking',
            params: { mode: 'reorder', enrollmentId },
          })}
          activeOpacity={0.85}
        >
          <Text style={styles.rankingButtonText}>View / Edit Priority Ranking</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.indigoPale,
    borderRadius: 20,
    marginTop: 25,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  accentBar: {
    height: 4,
    backgroundColor: colors.yellowDeep,
    width: '100%',
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.indigo,
    letterSpacing: 1,
  },
  optOutText: {
    fontSize: 13,
    color: colors.indigoMid,
    fontWeight: '600',
  },
  activeHabitLabel: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  activeHabitName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.indigo,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressScore: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.indigo,
  },
  progressTarget: {
    fontWeight: '400',
    color: colors.textPrimary,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: colors.sagePale,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.sage,
    borderRadius: 6,
  },
  progressBarComplete: {
    backgroundColor: colors.indigo,
  },
  progressMessage: {
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 16,
    lineHeight: 18,
  },
  rankingButton: {
    backgroundColor: colors.indigo,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  rankingButtonText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
});