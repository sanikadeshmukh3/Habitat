import { FontSize, Radius, Spacing, useTheme } from '@/constants/theme';
import api from '@/lib/api';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

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
        <ActivityIndicator color={Colors.primaryIndigo} />
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

const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  card: {
    backgroundColor: Colors.paleIndigo,
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: Radius.sm,
    elevation: 2,
  },
  accentBar: {
    height: 4,
    backgroundColor: Colors.badgeGold,
    width: '100%',
  },
  content: {
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.ms,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryIndigo,
    letterSpacing: 1,
  },
  optOutText: {
    fontSize: FontSize.sm,
    color: Colors.midIndigo,
    fontWeight: '600',
  },
  activeHabitLabel: {
    fontSize: FontSize.sm,
    color: Colors.darkBrown,
    marginBottom: Spacing.xs,
  },
  activeHabitName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primaryIndigo,
    marginBottom: Spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.darkBrown,
  },
  progressScore: {
    fontSize: Spacing.sm,
    fontWeight: '700',
    color: Colors.primaryIndigo,
  },
  progressTarget: {
    fontWeight: '400',
    color: Colors.darkBrown,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.midGreen,
    borderRadius: Radius.sm,
  },
  progressBarComplete: {
    backgroundColor: Colors.primaryIndigo,
  },
  progressMessage: {
    fontSize: FontSize.xs,
    color: Colors.darkBrown,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  rankingButton: {
    backgroundColor: Colors.primaryIndigo,
    paddingVertical: Spacing.ms,
    borderRadius: Spacing.ms,
    alignItems: 'center',
  },
  rankingButtonText: {
    color: Colors.cardBg,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});