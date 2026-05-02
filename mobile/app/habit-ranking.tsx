import { FontSize, Radius, Spacing, useTheme } from '@/constants/theme';
import api from '@/lib/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

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

type HabitRankItem = {
  habitId: string;
  habitName: string;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  consistencyScore: number;
  frequency: string;
  suggestedRank: number;
};

type ActiveEntryItem = {
  habitId: string;
  habitName: string;
};

export default function HabitRankingScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const router = useRouter();

  // mode is passed as a route param:
  // 'enroll' — initial enrollment, all habits draggable, calls /stacking/enroll
  // 'reorder' — edit while enrolled, only pending habits draggable, calls /stacking/reorder
  const { mode, enrollmentId } = useLocalSearchParams<{
    mode: 'enroll' | 'reorder';
    enrollmentId?: string;
  }>();

  const isReorderMode = mode === 'reorder';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tier1Habits, setTier1Habits] = useState<HabitRankItem[]>([]);
  const [activeEntry, setActiveEntry] = useState<ActiveEntryItem | null>(null);
  const [rankableHabits, setRankableHabits] = useState<HabitRankItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isReorderMode && enrollmentId) {
          // reorder mode — fetch current schedule state for this enrollment
          const response = await api.get(`/stacking/schedule/${enrollmentId}`);
          setActiveEntry(response.data.activeEntry);
          setRankableHabits(response.data.pendingEntries);
        } else {
          // enroll mode — fetch suggested ranking for the authenticated user
          // userId is not needed in the URL — the server reads it from the token
          const response = await api.get('/stacking/ranking');
          const ranking: HabitRankItem[] = response.data.ranking;
          setTier1Habits(ranking.filter((h) => h.tier === 'TIER_1'));
          setRankableHabits(ranking.filter((h) => h.tier !== 'TIER_1'));
        }
      } catch (error) {
        console.error('Error fetching ranking data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;

  const tierLabel = (tier: string) => {
    if (tier === 'TIER_2') return 'Developing';
    if (tier === 'TIER_3') return 'Struggling';
    return '';
  };

  const tierColor = (tier: string) => {
    if (tier === 'TIER_2') return Colors.badgeGold;
    if (tier === 'TIER_3') return Colors.midIndigo;
    return Colors.lightGreen;
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      if (isReorderMode && enrollmentId) {
        // reorder mode — send new ordering for pending entries only
        const reorderedHabitIds = rankableHabits.map((h) => h.habitId);
        await api.post('/stacking/reorder', { enrollmentId, reorderedHabitIds });
        router.back();
      } else {
        // enroll mode — send final confirmed ranking to create the enrollment
        // userId is not sent — the server reads it from the token
        const rankedHabitIds = rankableHabits.map((h) => h.habitId);
        await api.post('/stacking/enroll', { rankedHabitIds });
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Error confirming ranking:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderDraggableItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<HabitRankItem>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          activeOpacity={0.85}
          style={[
            styles.habitCard,
            isActive && styles.habitCardActive,
          ]}
        >
          <View style={styles.dragHandle}>
            <Text style={styles.dragHandleText}>⠿</Text>
          </View>

          <View style={styles.habitCardContent}>
            <Text style={styles.habitCardName}>{item.habitName}</Text>
            {item.consistencyScore !== undefined && (
              <Text style={styles.habitCardScore}>
                {formatScore(item.consistencyScore)} consistency
              </Text>
            )}
          </View>

          {item.tier && (
            <View style={[styles.tierBadge, { backgroundColor: tierColor(item.tier) }]}>
              <Text style={styles.tierBadgeText}>{tierLabel(item.tier)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.midGreen} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isReorderMode ? 'Edit Priority Order' : 'Prioritize Your Habits'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>
          {isReorderMode
            ? 'Drag to reorder your upcoming habits. Your currently active habit is not affected.'
            : "Drag to reorder. We'll help you tackle one habit at a time."}
        </Text>

        {/* tier 1 locked section — enroll mode only */}
        {!isReorderMode && tier1Habits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Already Mastered</Text>
            {tier1Habits.map((habit) => (
              <View key={habit.habitId} style={styles.lockedCard}>
                <Text style={styles.lockedCardName}>{habit.habitName}</Text>
                <View style={styles.masteredBadge}>
                  <Text style={styles.masteredBadgeText}>✓ Mastered</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* currently active habit — reorder mode only */}
        {isReorderMode && activeEntry && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Currently Active</Text>
            <View style={styles.activeCard}>
              <Text style={styles.activeCardName}>{activeEntry.habitName}</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>▶ In Progress</Text>
              </View>
            </View>
          </View>
        )}

        {/* draggable pending habits — flex: 1 so it fills all remaining space */}
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.sectionLabel}>
            {isReorderMode ? 'Upcoming Habits' : 'Your Focus Order'}
          </Text>
          <DraggableFlatList
            data={rankableHabits}
            onDragEnd={({ data }) => setRankableHabits(data)}
            keyExtractor={(item) => item.habitId}
            renderItem={renderDraggableItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            scrollEnabled={false}
            activationDistance={10}
          />
        </View>

        {/* confirm button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.cardBg} />
            ) : (
              <Text style={styles.confirmButtonText}>
                {isReorderMode ? 'Save Order' : 'Start Habit Stacking'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

    </SafeAreaView>
  );
}

const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pageBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: Colors.paleIndigo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: FontSize.lg,
    color: Colors.primaryIndigo,
    fontWeight: '600',
  },
  title: {
    fontSize: Spacing.lg,
    fontWeight: '700',
    color: Colors.primaryIndigo,
    textAlign: 'center',
    flex: 1,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.darkBrown,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryIndigo,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  lockedCard: {
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.ms,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lockedCardName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.darkBrown,
    flex: 1,
  },
  masteredBadge: {
    backgroundColor: Colors.midGreen,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.ms,
    borderRadius: Radius.lg,
  },
  masteredBadgeText: {
    color: Colors.cardBg,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  activeCard: {
    backgroundColor: Colors.paleIndigo,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.ms,
    borderWidth: 1,
    borderColor: Colors.midIndigo,
  },
  activeCardName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.primaryIndigo,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: Colors.primaryIndigo,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.ms,
    borderRadius: Radius.lg,
  },
  activeBadgeText: {
    color: Colors.cardBg,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  habitCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.ms,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: Radius.sm,
    elevation: 2,
  },
  habitCardActive: {
    backgroundColor: Colors.paleIndigo,
    borderColor: Colors.midIndigo,
    shadowOpacity: 0.3,
    elevation: 8,
  },
  dragHandle: {
    marginRight: Spacing.ms,
  },
  dragHandleText: {
    fontSize: 20,
    color: Colors.lightGreen,
  },
  habitCardContent: {
    flex: 1,
  },
  habitCardName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.darkBrown,
    marginBottom: Spacing.xs,
  },
  habitCardScore: {
    fontSize: FontSize.sm,
    color: Colors.darkBrown,
  },
  tierBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.ms,
    borderRadius: Radius.lg,
    marginLeft: Spacing.sm,
  },
  tierBadgeText: {
    color: Colors.cardBg,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  footer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.pageBg,
  },
  confirmButton: {
    backgroundColor: Colors.midGreen,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Colors.cardBg,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});