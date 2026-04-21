import api from '@/lib/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
    if (tier === 'TIER_2') return colors.yellowDeep;
    if (tier === 'TIER_3') return colors.indigoMid;
    return colors.sageMid;
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
        <ActivityIndicator size="large" color={colors.sage} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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

        {/* draggable pending habits */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {isReorderMode ? 'Upcoming Habits' : 'Your Focus Order'}
          </Text>
          <DraggableFlatList
            data={rankableHabits}
            onDragEnd={({ data }) => setRankableHabits(data)}
            keyExtractor={(item) => item.habitId}
            renderItem={renderDraggableItem}
            contentContainerStyle={{ paddingBottom: 20 }}
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
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.confirmButtonText}>
                {isReorderMode ? 'Save Order' : 'Start Habit Stacking'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.indigoPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: colors.indigo,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.indigo,
    textAlign: 'center',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 28,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.indigo,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  lockedCard: {
    backgroundColor: colors.sagePale,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockedCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  masteredBadge: {
    backgroundColor: colors.sage,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  masteredBadgeText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '600',
  },
  activeCard: {
    backgroundColor: colors.indigoPale,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.indigoMid,
  },
  activeCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.indigo,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: colors.indigo,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  activeBadgeText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '600',
  },
  habitCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  habitCardActive: {
    backgroundColor: colors.indigoPale,
    borderColor: colors.indigoMid,
    shadowOpacity: 0.3,
    elevation: 8,
  },
  dragHandle: {
    marginRight: 12,
  },
  dragHandleText: {
    fontSize: 20,
    color: colors.sageMid,
  },
  habitCardContent: {
    flex: 1,
  },
  habitCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  habitCardScore: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  tierBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  tierBadgeText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    paddingBottom: 36,
    backgroundColor: colors.bg,
  },
  confirmButton: {
    backgroundColor: colors.sage,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
});