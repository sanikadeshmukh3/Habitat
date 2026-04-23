import { useTheme, FontSize, Radius, Spacing, Colors } from '@/constants/theme';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    FlatList,
    Image,
    ImageBackground,
    ImageSourcePropType,
    Modal,
    Animated,
    Dimensions,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { useRecap } from '@/hooks/use-recap';
import { useUserProfile } from '@/hooks/use-user';
import { useWeeklySummary } from '@/hooks/use-weekly-summary';
import { useRegenerateWeeklySummary } from '@/hooks/use-regenerate-weekly-summary';
import type { Animal, WeekdayItem } from '@/lib/recap-utility';

//Weekly Summary helpers

function startOfWeekSunday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

type SnapshotCard = {
    id: string;
    title: string;
    subtitle?: string;
    accent?: string;
    body: React.ReactNode;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDE_SPACER = 18;
const CARD_GAP = 12;
const CARD_WIDTH = SCREEN_WIDTH - SIDE_SPACER * 2 - CARD_GAP;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const HORIZONTAL_PADDING = SIDE_SPACER - CARD_GAP / 2;

// const COLORS = {
//     forest: '#234B3A',
//     moss: '#5F7A61',
//     sage: '#AFC3A2',
//     cream: '#F7F1E8',
//     tan: '#D9C2A3',
//     brown: '#6B4F3A',
//     bark: '#4D3A2D',
//     softWhite: 'rgba(255,255,255,0.82)',
//     glass: 'rgba(255,255,255,0.72)',
//     chip: 'rgba(255,255,255,0.68)',
// };

export const ANIMAL_IMAGE_BY_ANIMAL: Record<Animal, ImageSourcePropType> = {
  Wolf: require('@/assets/images/animals/wolf.png'),
  Bee: require('@/assets/images/animals/bee.png'),
  Owl: require('@/assets/images/animals/owl.png'),
  Jaguar: require('@/assets/images/animals/jaguar.png'),
  Bear: require('@/assets/images/animals/bear.png'),
  Dog: require('@/assets/images/animals/dog.png'),
  Bunny: require('@/assets/images/animals/bunny.png'),
  Swan: require('@/assets/images/animals/swan.png'),
  Fox: require('@/assets/images/animals/fox.png'),
  Monkey: require('@/assets/images/animals/monkey.png'),
  Turtle: require('@/assets/images/animals/turtle.png'),
  Sloth: require('@/assets/images/animals/sloth.png'),
  Snail: require('@/assets/images/animals/snail.png'),
  Fallback: require('@/assets/images/animals/fallback-wrapped.png'),
} as const;


function DayChip({ item, styles }: { item: WeekdayItem, styles: ReturnType<typeof makeStyles> }) {
    return (
        <View style={styles.dayChip}>
            <Text style={[styles.dateNumber, item.isToday && styles.dateNumberToday]}>
                {item.dateNumber}
            </Text>

            <View
                style={[
                    styles.circle,
                    item.done && styles.circleDone,
                    item.isToday && styles.circleToday,
                    item.isFuture && { opacity: 0.4 },
                ]}
            >
                {item.done && <Text style={styles.check}>✓</Text>}
                {item.isFuture && <Text style={styles.futureDot}>·</Text>}
            </View>

            <Text style={[styles.dayLabel, item.isToday && styles.dayLabelToday]}>
                {item.key}
            </Text>
        </View>
    );
}

function getMoodEmoji(label: string) {
  if (label === 'Easy') return '😊';
  if (label === 'Okay') return '🙂';
  if (label === 'Hard') return '😓';
  if (label === 'No data') return '🫥';
  return '📝';
}

function SnapshotCardView({
  card,
  index,
  scrollX,
  styles,
}: {
  card: SnapshotCard;
  index: number;
  scrollX: Animated.Value;
  styles: ReturnType<typeof makeStyles>;
}) {
  const inputRange = [
    (index - 1) * SNAP_INTERVAL,
    index * SNAP_INTERVAL,
    (index + 1) * SNAP_INTERVAL,
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.97, 1, 0.97],
    extrapolate: 'clamp',
  });

  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: [8, 0, 8],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.82, 1, 0.82],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.snapshotCardWrap}>
      <Animated.View
        style={[
          styles.snapshotCard,
          {
            transform: [{ scale }, { translateY }],
            opacity,
          },
        ]}
      >
        <View style={styles.snapshotHeader}>
          <Text style={styles.snapshotTitle}>{card.title}</Text>
          {!!card.subtitle && (
            <Text style={styles.snapshotSubtitle}>{card.subtitle}</Text>
          )}
        </View>

        <View
          style={[
            styles.snapshotAccent,
            { backgroundColor: card.accent ?? Colors.midGreen },
          ]}
        />

        <View style={styles.snapshotBody}>{card.body}</View>
      </Animated.View>
    </View>
  );
}

function MiniBarChart({ values, styles }: { values: number[]; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.chartWrap}>
      {values.map((h, i) => (
        <View key={i} style={styles.barColumn}>
          <View style={[styles.bar, { height: h }]} />
        </View>
      ))}
    </View>
  );
}

function StatsBlock({
  completionPercent,
  consistencyPercent,
  styles,
}: {
  completionPercent: number;
  consistencyPercent: number;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.statsBlock}>
      <View>
        <Text style={styles.statsBig}>{completionPercent}%</Text>
        <Text style={styles.statsLabel}>completion</Text>
      </View>
      <View>
        <Text style={styles.statsBig}>{consistencyPercent}%</Text>
        <Text style={styles.statsLabel}>consistency</Text>
      </View>
    </View>
  );
}

export default function RecapScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);  
  
  const scrollX = useRef(new Animated.Value(0)).current;
    const [showInfoModal, setShowInfoModal] = useState(false);
    
    const { recap, isLoading, isFromCache, weekKey } = useRecap();
    const [activeIndex, setActiveIndex] = useState(0);
    const handleSnap = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / SNAP_INTERVAL);
        setActiveIndex(Math.max(0, Math.min(index, snapshotCards.length - 1)));
    };

    const previousWeekDate = useMemo(() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d;
    }, []);

    const {
      recap: previousWeekRecap,
      isLoading: isPreviousWeekRecapLoading,
      weekKey: previousWeekKey,
    } = useRecap(previousWeekDate);

    const weeklySummaryPayload = useMemo(() => {
      if (!previousWeekRecap) return null;

      return {
        weekKey: previousWeekKey,
        recap: {
          weekStart: previousWeekRecap.weekStart,
          weekEnd: previousWeekRecap.weekEnd,
          archetype: previousWeekRecap.archetype,
          scores: previousWeekRecap.scores,
          snapshots: {
            completionPulse: previousWeekRecap.snapshots.completionPulse,
            categoryLeader: previousWeekRecap.snapshots.categoryLeader,
            rhythmCheck: previousWeekRecap.snapshots.rhythmCheck,
            moodBoard: previousWeekRecap.snapshots.moodBoard,
          },
        },
      };
    }, [previousWeekRecap, previousWeekKey]);

    const {
      data: weeklySummaryData,
      isLoading: isWeeklySummaryLoading,
      isError: isWeeklySummaryError,
    } = useWeeklySummary(weeklySummaryPayload);

    const regenerateMutation = useRegenerateWeeklySummary();

    const refreshesRemaining = weeklySummaryData?.refreshesRemaining ?? 3;

    const isRefreshDisabled =
      !weeklySummaryPayload ||
      weeklySummaryData?.available === false ||
      refreshesRemaining <= 0 ||
      regenerateMutation.isPending;

    if (isLoading || !recap) {
        return (
            <View style={styles.background}>
                <View style={styles.loadingWrap}>
                    <Text style={styles.loadingText}>Loading recap...</Text>
                </View>
            </View>
        );
    }

    const animalImage = ANIMAL_IMAGE_BY_ANIMAL[recap.archetype.animal] ?? ANIMAL_IMAGE_BY_ANIMAL.Fallback;
    const weekItems = recap.weekItems;

    const weekBarValues = recap.weekItems.map((item) => {
        if (item.ratio == null) return 8;
        return Math.max(8, Math.round(item.ratio * 80));
    });

    const categoryLeader = recap.snapshots.categoryLeader;
    const rhythmCheck = recap.snapshots.rhythmCheck;
    const moodBoard = recap.snapshots.moodBoard;
    const completionPulse = recap.snapshots.completionPulse;

    const hasOnlyOneCategory =
    !categoryLeader.weakestCategory ||
    categoryLeader.topCategory === categoryLeader.weakestCategory;

    const categoryGap = Math.abs(
    categoryLeader.topPercent - categoryLeader.weakestPercent
    );

    const categoriesAreBasicallyTied = !hasOnlyOneCategory && categoryGap <= 5;

    const sameBestAndWorstDay =
    !rhythmCheck.weakestDay || rhythmCheck.bestDay === rhythmCheck.weakestDay;

    const snapshotCards: SnapshotCard[] = [
    {
        id: 'completion-pulse',
        title: 'Completion Pulse',
        subtitle: `${completionPulse.percent}%`,
        accent: Colors.midGreen,
        body: (
        <View>
            <Text style={styles.cardBodyHeadline}>
            {completionPulse.percent}% complete
            </Text>
            <Text style={styles.cardBodySubtext}>
            {completionPulse.insight}
            </Text>
            <StatsBlock styles={styles}
            completionPercent={completionPulse.percent}
            consistencyPercent={Math.round(recap.scores.streakScore * 100)}
            />
        </View>
        ),
    },
    {
        id: 'category-leader',
        title: 'Category Leader',
        subtitle: categoryLeader.topCategory,
        accent: Colors.lightBrown,
        body: (
            <View>
            <View style={styles.categoryHero}>
                <Text style={styles.categoryHeroLabel}>Top category</Text>
                <Text style={styles.categoryHeroName}>{categoryLeader.topCategory}</Text>
                <Text style={styles.categoryHeroPercent}>{categoryLeader.topPercent}%</Text>
            </View>

            {hasOnlyOneCategory ? (
                <View style={styles.categorySupportBox}>
                <Text style={styles.categorySupportText}>
                    This was your main focus category this week.
                </Text>
                </View>
            ) : categoriesAreBasicallyTied ? (
                <View style={styles.categorySupportBox}>
                <Text style={styles.categorySupportText}>
                    Your categories stayed fairly balanced overall.
                </Text>
                </View>
            ) : (
                <View style={styles.categoryCompareRow}>
                <View style={styles.categoryCompareTextWrap}>
                    <Text style={styles.categoryCompareLabel}>Opportunity</Text>
                    <Text style={styles.categoryCompareName}>
                    {categoryLeader.weakestCategory}
                    </Text>
                </View>

                <View style={styles.categoryComparePercentPill}>
                    <Text style={styles.categoryComparePercent}>
                    {categoryLeader.weakestPercent}%
                    </Text>
                </View>
                </View>
            )}

            <Text style={[styles.cardBodySubtext, { marginTop: 14 }]}>
                {categoryLeader.insight}
            </Text>
            </View>
        ),
    },
    {
        id: 'rhythm-check',
        title: 'Rhythm Check',
        subtitle: `${rhythmCheck.strongDays} strong day${rhythmCheck.strongDays === 1 ? '' : 's'}`,
        accent: Colors.midGreen,
        body: (
        <View>
            <Text style={styles.cardBodyHeadline}>
            {sameBestAndWorstDay ? 'Steady all week' : `Best: ${rhythmCheck.bestDay}`}
            </Text>

            <Text style={styles.cardBodySubtext}>
            {sameBestAndWorstDay
                ? 'No single day stood out above or below the rest.'
                : `Needed support: ${rhythmCheck.weakestDay}`}
            </Text>

            <MiniBarChart values={weekBarValues} styles={styles} />

            <Text style={[styles.cardBodySubtext, { marginTop: 10 }]}>
            {rhythmCheck.insight}
            </Text>
        </View>
        ),
    },
    {
        id: 'mood-board',
        title: 'Mood Board',
        subtitle: moodBoard.label,
        accent: Colors.midGreen,
        body: (
            <View>
            {/* HERO MOOD */}
            <View style={styles.moodHero}>
                <View style={styles.moodEmojiWrap}>
                    <Text style={styles.moodEmoji}>
                    {getMoodEmoji(moodBoard.label)}
                    </Text>
                </View>

                <Text style={styles.moodLabel}>Weekly Mood</Text>
                <Text style={styles.moodName}>{moodBoard.label}</Text>
            </View>

            {/* DIFFICULTY */}
            <View style={styles.moodDifficultyRow}>
                <Text style={styles.moodDifficultyLabel}>Difficulty</Text>
                <Text style={styles.moodDifficultyValue}>
                {moodBoard.averageDifficulty == null
                    ? '—'
                    : `${moodBoard.averageDifficulty.toFixed(1)} / 5`}
                </Text>
            </View>

            {/* BAR */}
            {moodBoard.averageDifficulty != null && (
                <View style={styles.moodBarTrack}>
                <View
                    style={[
                    styles.moodBarFill,
                    {
                        width: `${(moodBoard.averageDifficulty / 5) * 100}%`,
                    },
                    ]}
                />
                </View>
            )}

            {/* INSIGHT */}
            <Text style={[styles.cardBodySubtext, { marginTop: 14 }]}>
                {moodBoard.insight}
            </Text>
            </View>
        ),
    },
    ];

    return (
        <ImageBackground
        source={require("../../assets/images/leaf.png")}
        style={styles.background}
        imageStyle={{ opacity: 0.08 }} // want the leaves to be a bit transparent on the screen
        >
        <View />

        <ScrollView
            contentContainerStyle={[
            styles.container,
            ]}
            showsVerticalScrollIndicator={false}
        >
            <View
            style={styles.space}
            >
            </View>

            <Modal
            visible={showInfoModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowInfoModal(false)}
            >
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>About Habitat Wrapped</Text>

                <Text style={styles.modalText}>
                    This screen is your weekly reflection space. It highlights how consistently
                    you showed up, which areas led the week, and the overall rhythm behind your habits.
                </Text>

                <Text style={styles.modalText}>
                    Think of it as a calm, visual recap of your routines — your own Habitat Wrapped.
                </Text>

                <Text style={styles.modalText}>
                    You’ll also see a personalized AI summary here as more weekly patterns become available.
                </Text>

                <Pressable
                    style={styles.modalButton}
                    onPress={() => setShowInfoModal(false)}
                >
                    <Text style={styles.modalButtonText}>Got it</Text>
                </Pressable>
                </View>
            </View>
            </Modal>

            <View style={styles.topBar}>
                <View style={styles.titleWrap}>
                    <Text style={styles.titleEyebrow}>Habitat Wrapped</Text>
                    <Text style={styles.title}>Your Natural Habitat</Text>
                </View>
            </View>

            <View style={styles.subtitleRow}>
            <Pressable
                style={styles.helpPill}
                onPress={() => setShowInfoModal(true)}
            >
                <Text style={styles.helpText}>i</Text>
            </Pressable>

            <Text style={styles.subtitle}>
                A recap of your health and habits this week.
            </Text>
            </View>

            <View style={styles.weekSection}>
            <View style={styles.sectionRow}>
                <Text style={styles.sectionEyebrow}>WEEKLY PROGRESS</Text>
                <Text style ={styles.weekKeyText}>{recap.weekStart.slice(0, 10)} – {recap.weekEnd.slice(0, 10)}</Text>
            </View>

            <View style={styles.weekCard}>
                <FlatList
                    data={weekItems}
                    keyExtractor={(i) => i.key}
                    horizontal
                    renderItem={({ item }) => <DayChip item={item} styles={styles} />}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.weekList}
                />
            </View>
            </View>

            <Text style={styles.sectionTitle}>This week, you were a…</Text>

            <View style={styles.animalCard}>
            <Image source={animalImage} style={styles.animalImage} />
            <View style={styles.animalTextWrap}>
                <Text style={styles.animalEyebrow}>behavior match</Text>
                <Text style={styles.animalType}>{recap.archetype.title}</Text>
                <Text style={styles.animalDescription}>
                    {recap.archetype.description}
                </Text>
            </View>
            </View>

            <View style={styles.snapHeaderRow}>
            <Text style={styles.sectionTitle}>Snapshots</Text>
            <Text style={styles.snapHint}>Swipe to see more</Text>
            </View>

            <Animated.FlatList
            horizontal
            data={snapshotCards}
            keyExtractor={(i) => i.id}
            renderItem={({ item, index }) => (
                <SnapshotCardView card={item} index={index} scrollX={scrollX} styles={styles} />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.snapList}
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            bounces={false}
            onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
            )}
            onMomentumScrollEnd={handleSnap}
            scrollEventThrottle={16}
            />

            <View style={styles.pagination}>
            {snapshotCards.map((_, index) => (
                <View
                key={index}
                style={[
                    styles.paginationDot,
                    index === activeIndex && styles.paginationDotActive,
                ]}
                />
            ))}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>AI-GENERATED REFLECTION</Text>
              <Text style={styles.summaryHeadline}>Last Week in Review</Text>

              <Text style={styles.summaryText}>
                {isWeeklySummaryLoading
                  ? 'Generating your weekly reflection...'
                  : weeklySummaryData?.available === false
                  ? weeklySummaryData.message ||
                    'Your weekly reflection unlocks after the week is complete.'
                  : isWeeklySummaryError
                  ? 'Your weekly reflection could not be loaded right now.'
                  : weeklySummaryData?.summary ||
                    'There was not enough activity last week to generate a meaningful reflection yet.'}
              </Text>

              <Pressable
                onPress={() => {
                  if (!weeklySummaryPayload) return;
                  regenerateMutation.mutate(weeklySummaryPayload);
                }}
                disabled={isRefreshDisabled}
                style={[
                  styles.refreshButton,
                  isRefreshDisabled && styles.refreshButtonDisabled,
                ]}
              >
                <Text style={styles.refreshButtonText}>
                  {regenerateMutation.isPending
                    ? 'Refreshing...'
                    : refreshesRemaining <= 0
                    ? 'No refreshes left'
                    : `Refresh summary (${refreshesRemaining} left)`}
                </Text>
              </Pressable>
            </View>
        </ScrollView>
        </ImageBackground>
    );
}

const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) =>
  StyleSheet.create({
    background: {
      flex: 1,
      backgroundColor: Colors.pageBg,
    },

    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(250,246,239,0.18)',
    },

    container: {
      paddingTop: Spacing.top_margin,
      paddingHorizontal: Spacing.lg,
      paddingBottom: 42,
    },

    topBar: {
      marginBottom: Spacing.xs,
    },

    titleWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    titleEyebrow: {
      color: Colors.midGreen,
      fontSize: FontSize.xs,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: Spacing.sm,
      fontWeight: '700',
    },

    title: {
      fontSize: 30, // intentionally left raw (no xl token available close enough)
      color: Colors.primaryGreen,
      fontWeight: '700',
      letterSpacing: 0.3,
      textAlign: 'center',
    },

    rightSpacer: {
      width: Spacing.xs,
    },

    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      marginTop: Spacing.ms,
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing.xs,
    },

    helpPill: {
      width: 28,
      height: 28,
      borderRadius: Radius.md,
      backgroundColor: 'rgba(255,255,255,0.82)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.10)',
      marginTop: Spacing.xs,
    },

    helpText: {
      color: Colors.midBrown,
      fontSize: FontSize.sm,
      fontWeight: '700',
    },

    subtitle: {
      flex: 1,
      color: Colors.darkBrown,
      fontSize: FontSize.md,
      lineHeight: 23,
    },

    weekSection: {
      marginBottom: Spacing.md,
    },

    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: Spacing.sm,
    },

    sectionEyebrow: {
      color: Colors.midGreen,
      fontSize: FontSize.xs,
      letterSpacing: 1.5,
      fontWeight: '700',
    },

    weekKeyText: {
      color: Colors.midBrown,
      fontSize: FontSize.xs,
    },

    weekCard: {
      marginTop: Spacing.sm,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.xl,
      backgroundColor: 'rgba(255,255,255,0.68)',
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.08)',
      alignItems: 'center',
      shadowColor: Colors.midBrown,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },

    weekList: {
      paddingRight: Spacing.sm,
      gap: Spacing.sm,
    },

    dayChip: {
      alignItems: 'center',
      gap: Spacing.xs,
      minWidth: 38,
    },

    dateNumber: {
      fontSize: FontSize.xs,
      color: Colors.midBrown,
      fontWeight: '600',
    },

    dateNumberToday: {
      color: Colors.primaryGreen,
      fontWeight: '700',
    },

    circle: {
      width: 34,
      height: 34,
      borderRadius: Radius.lg,
      backgroundColor: 'rgba(255,255,255,0.86)',
      borderWidth: 1.3,
      borderColor: 'rgba(77,58,45,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    circleDone: {
      backgroundColor: 'rgba(95,122,97,0.16)',
      borderColor: 'rgba(35,75,58,0.24)',
    },

    circleToday: {
      borderColor: Colors.primaryGreen,
      borderWidth: 1.9,
      shadowColor: Colors.primaryGreen,
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },

    check: {
      color: Colors.primaryGreen,
      fontSize: FontSize.sm,
      fontWeight: '900',
    },

    futureDot: {
      fontSize: 16, // no close token
      color: Colors.midBrown,
    },

    dayLabel: {
      fontSize: FontSize.xs,
      color: Colors.midBrown,
      fontWeight: '500',
    },

    dayLabelToday: {
      color: Colors.primaryGreen,
      fontWeight: '700',
    },

    sectionTitle: {
      marginTop: Spacing.lg,
      fontSize: 24,
      color: Colors.primaryGreen,
      fontWeight: '700',
    },

    animalCard: {
      marginTop: Spacing.sm,
      borderRadius: Radius.xl,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.78)',
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.08)',
      shadowColor: Colors.midBrown,
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },

    animalImage: {
      width: '100%',
      height: 230,
      backgroundColor: 'rgba(175,195,162,0.12)',
    },

    animalTextWrap: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.lg,
    },

    animalEyebrow: {
      color: Colors.midGreen,
      fontSize: FontSize.xs,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      fontWeight: '700',
    },

    animalType: {
      marginTop: Spacing.xs,
      fontSize: 30,
      color: Colors.darkBrown,
      fontWeight: '700',
    },

    animalDescription: {
      marginTop: Spacing.sm,
      fontSize: FontSize.md,
      lineHeight: 23,
      color: Colors.midBrown,
    },

    snapHeaderRow: {
      marginTop: Spacing.xs,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },

    snapHint: {
      color: Colors.midBrown,
      fontSize: FontSize.xs,
    },

    snapList: {
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },

    snapshotCardWrap: {
      width: SNAP_INTERVAL,
    },

    snapshotCard: {
      width: CARD_WIDTH,
      padding: Spacing.md,
      borderRadius: Radius.xl,
      backgroundColor: 'rgba(255,255,255,0.78)',
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.08)',
      shadowColor: Colors.midBrown,
      shadowOpacity: 0.11,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },

    snapshotHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },

    snapshotTitle: {
      color: Colors.darkBrown,
      fontSize: FontSize.lg,
      fontWeight: '700',
      flex: 1,
    },

    snapshotSubtitle: {
      color: Colors.primaryGreen,
      fontSize: FontSize.md,
      fontWeight: '700',
    },

    snapshotAccent: {
      marginTop: Spacing.sm,
      width: 48,
      height: Spacing.xs,
      borderRadius: Radius.full,
    },

    snapshotBody: {
      marginTop: Spacing.md,
      minHeight: 168,
      justifyContent: 'flex-start',
    },

    cardBodyHeadline: {
      fontSize: FontSize.xl,
      color: Colors.primaryGreen,
      fontWeight: '700',
      lineHeight: 26,
    },

    cardBodySubtext: {
      marginTop: Spacing.sm,
      color: Colors.midBrown,
      fontSize: FontSize.sm,
      lineHeight: 21,
    },

    chartWrap: {
      marginTop: Spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 94,
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },

    barColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },

    bar: {
      width: '100%',
      borderRadius: Radius.full,
      backgroundColor: Colors.midGreen,
      opacity: 0.92,
    },

    moodEmoji: {
      fontSize: 34,
      marginBottom: Spacing.xs,
    },

    moodEmojiWrap: {
      width: 60,
      height: 60,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.75)',
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.08)',
      marginBottom: Spacing.sm,
    },

    statsBlock: {
      marginTop: Spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(255,255,255,0.66)',
      borderRadius: Radius.lg,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.05)',
    },

    statsBig: {
      fontSize: 28,
      color: Colors.darkBrown,
      fontWeight: '700',
    },

    statsLabel: {
      marginTop: Spacing.xs,
      color: Colors.midBrown,
      fontSize: FontSize.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },

    summaryCard: {
      marginTop: Spacing.lg,
      padding: Spacing.md,
      borderRadius: Radius.xl,
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.08)',
      shadowColor: Colors.midBrown,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },

    summaryEyebrow: {
      color: Colors.midGreen,
      fontSize: FontSize.xs,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      fontWeight: '700',
    },

    summaryHeadline: {
      marginTop: Spacing.sm,
      fontSize: 24,
      color: Colors.primaryGreen,
      fontWeight: '700',
    },

    summaryText: {
      marginTop: Spacing.sm,
      fontSize: FontSize.sm,
      lineHeight: 22,
      color: Colors.midBrown,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(28,34,28,0.24)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
    },

    modalCard: {
      width: '100%',
      borderRadius: Radius.xl,
      backgroundColor: 'rgba(250,245,236,0.98)',
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.10)',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },

    modalTitle: {
      fontSize: 24,
      color: Colors.primaryGreen,
      fontWeight: '700',
      marginBottom: Spacing.sm,
    },

    modalText: {
      fontSize: FontSize.sm,
      lineHeight: 22,
      color: Colors.midBrown,
      marginBottom: Spacing.sm,
    },

    modalButton: {
      marginTop: Spacing.xs,
      alignSelf: 'flex-end',
      backgroundColor: Colors.primaryGreen,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.ms,
      borderRadius: Radius.full,
    },

    modalButtonText: {
      color: Colors.white,
      fontSize: FontSize.sm,
      fontWeight: '700',
    },

    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: Dimensions.get('window').height,
      paddingHorizontal: Spacing.lg,
    },

    loadingText: {
      color: Colors.primaryGreen,
      fontSize: 17,
      fontWeight: '600',
      textAlign: 'center',
    },

    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },

    cacheText: {
      color: Colors.midGreen,
      fontSize: FontSize.xs,
      fontWeight: '700',
      textTransform: 'uppercase',
    },

    space: {
      marginBottom: Spacing.xs,
    },

    // backBtn: {
    //   marginBottom: Spacing.md,
    //   alignSelf: 'flex-start',
    //   paddingVertical: Spacing.xs,
    //   paddingHorizontal: Spacing.sm,
    //   backgroundColor: Colors.paleGreen,
    //   borderRadius: Radius.sm,
    // },

    // backBtnText: {
    //   color: Colors.primaryGreen,
    //   fontWeight: '600',
    //   fontSize: FontSize.md,
    // },

    iconButton: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: Colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.10)',
    },

    topIcon: {
      fontSize: FontSize.lg,
      color: Colors.primaryGreen,
    },

    morePill: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.lg,
      backgroundColor: Colors.white,
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.10)',
    },

    moreText: {
      color: Colors.midBrown,
      fontSize: FontSize.xs,
    },

    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: Spacing.xs,
      marginBottom: Spacing.xs,
      gap: Spacing.sm,
    },

    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: Radius.full,
      backgroundColor: 'rgba(77,58,45,0.18)',
    },

    paginationDotActive: {
      width: 20,
      backgroundColor: Colors.primaryGreen,
    },

    categoryHero: {
      marginTop: Spacing.xs,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: 'rgba(142,110,83,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(142,110,83,0.16)',
      alignItems: 'flex-start',
    },

    categoryHeroLabel: {
      fontSize: FontSize.xs,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: Colors.midBrown,
      marginBottom: Spacing.xs,
      fontWeight: '700',
    },

    categoryHeroName: {
      fontSize: 24,
      color: Colors.darkBrown,
      fontWeight: '700',
      lineHeight: 30,
    },

    categoryHeroPercent: {
      marginTop: Spacing.xs,
      fontSize: FontSize.md,
      color: Colors.primaryGreen,
      fontWeight: '700',
    },

    categorySupportBox: {
      marginTop: Spacing.sm,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: 'rgba(255,255,255,0.60)',
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.06)',
    },

    categorySupportText: {
      fontSize: FontSize.sm,
      lineHeight: 19,
      color: Colors.midBrown,
    },

    categoryCompareRow: {
      marginTop: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: 'rgba(255,255,255,0.60)',
      borderWidth: 1,
      borderColor: 'rgba(77,58,45,0.06)',
      gap: Spacing.sm,
    },

    categoryCompareTextWrap: {
      flex: 1,
    },

    categoryCompareLabel: {
      fontSize: FontSize.xs,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: Colors.midBrown,
      marginBottom: Spacing.xs,
      fontWeight: '700',
    },

    categoryCompareName: {
      fontSize: FontSize.md,
      color: Colors.darkBrown,
      fontWeight: '600',
    },

    categoryComparePercentPill: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      backgroundColor: 'rgba(95,122,97,0.12)',
    },

    categoryComparePercent: {
      fontSize: FontSize.sm,
      color: Colors.primaryGreen,
      fontWeight: '700',
    },

    moodHero: {
      marginTop: Spacing.xs,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: 'rgba(95,122,97,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(95,122,97,0.18)',
    },

    moodLabel: {
      fontSize: FontSize.xs,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: Colors.midBrown,
      marginBottom: Spacing.xs,
      fontWeight: '700',
    },

    moodName: {
      fontSize: FontSize.xl,
      color: Colors.darkBrown,
      fontWeight: '700',
      textAlign: 'center',
    },

    moodDifficultyRow: {
      marginTop: Spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    moodDifficultyLabel: {
      fontSize: FontSize.sm,
      color: Colors.midBrown,
    },

    moodDifficultyValue: {
      fontSize: FontSize.md,
      color: Colors.primaryGreen,
      fontWeight: '700',
    },

    moodBarTrack: {
      marginTop: Spacing.sm,
      height: 10,
      borderRadius: Radius.full,
      backgroundColor: 'rgba(77,58,45,0.08)',
      overflow: 'hidden',
    },

    moodBarFill: {
      height: '100%',
      borderRadius: Radius.full,
      backgroundColor: Colors.midGreen,
    },

    refreshButton: {
      marginTop: Spacing.md,
      alignSelf: 'flex-start',
      backgroundColor: Colors.primaryGreen,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.ms,
      borderRadius: Radius.full,
    },

    refreshButtonDisabled: {
      opacity: 0.5,
    },

    refreshButtonText: {
      color: Colors.white,
      fontSize: FontSize.sm,
      fontWeight: '700',
    },
  });