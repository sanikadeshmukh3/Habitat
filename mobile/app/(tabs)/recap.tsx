import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
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
    Modal,
    Animated,
    Dimensions,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { useRecap } from '@/hooks/use-recap';
import type { WeekdayItem } from '@/lib/recap-utility';

// Some of the following are hardcoded, but general structure of the recap screen exists.

type SnapshotCard = {
    id: string;
    title: string;
    subtitle?: string;
    accent?: string;
    body: React.ReactNode;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_SPACING = 14;
const SIDE_SPACER = 18;

const COLORS = {
    forest: '#234B3A',
    moss: '#5F7A61',
    sage: '#AFC3A2',
    cream: '#F7F1E8',
    tan: '#D9C2A3',
    brown: '#6B4F3A',
    bark: '#4D3A2D',
    softWhite: 'rgba(255,255,255,0.82)',
    glass: 'rgba(255,255,255,0.72)',
    chip: 'rgba(255,255,255,0.68)',
};

const FONTS = {
    title: Platform.select({ ios: 'Georgia', android: 'serif' }),
    body: Platform.select({ ios: 'Avenir Next', android: 'sans-serif' }),
    bodyBold: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium' }),
};

const ANIMAL_IMAGE_BY_TITLE: Record<string, string> = {
  'Relentless Wolf':
    'https://images.unsplash.com/photo-1607350999170-b893fef057ea?auto=format&fit=crop&w=1200&q=80',
  'Busy Bee':
    'https://images.unsplash.com/photo-1570786097801-b8b9531ed5cb?auto=format&fit=crop&w=1200&q=80',
  'Adaptive Fox':
    'https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=1200&q=80',
  'Mindful Owl':
    'https://images.unsplash.com/photo-1660307038737-c7ada9b70fe4?auto=format&fit=crop&w=1200&q=80',
  'Electric Cheetah':
    'https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?auto=format&fit=crop&w=1200&q=80',
  'Steady Bear':
    'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80',
  'Reliable Dog':
    'https://images.unsplash.com/photo-1509334768310-62736d4fb984?auto=format&fit=crop&w=1200&q=80',
  'Calm Deer':
    'https://images.unsplash.com/photo-1718128403369-0815d808d762?auto=format&fit=crop&w=1200&q=80',
  'Energetic Squirrel':
    'https://images.unsplash.com/photo-1569219357232-1116aaf94241?auto=format&fit=crop&w=1200&q=80',
  'Resetting Frog':
    'https://images.unsplash.com/photo-1721414759843-97b02c764db2?auto=format&fit=crop&w=1200&q=80',
  'Thoughtful Dolphin':
    'https://images.unsplash.com/photo-1625056084571-e83f657bfcd8?auto=format&fit=crop&w=1200&q=80',
  'Flexible Monkey':
    'https://images.unsplash.com/photo-1727944792538-c8cd25bb79aa?auto=format&fit=crop&w=1200&q=80',
  'Patient Turtle':
    'https://images.unsplash.com/photo-1656109204719-8d4ab9de33c6?auto=format&fit=crop&w=1200&q=80',
  'Rebuilding Snail':
    'https://images.unsplash.com/photo-1569534893984-48aec815679b?auto=format&fit=crop&w=1200&q=80',
  'Resting Sloth':
    'https://images.unsplash.com/photo-1718122259770-ebbe7d7f9f7f?auto=format&fit=crop&w=1200&q=80',
};

function DayChip({ item }: { item: WeekdayItem }) {
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

function SnapshotCardView({
    card,
    index,
    scrollX,
}: {
    card: SnapshotCard;
    index: number;
    scrollX: Animated.Value;
}) {
    const inputRange = [
        (index - 1) * (CARD_WIDTH + CARD_SPACING),
        index * (CARD_WIDTH + CARD_SPACING),
        (index + 1) * (CARD_WIDTH + CARD_SPACING),
    ];

    const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.92, 1, 0.92],
        extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
        inputRange,
        outputRange: [10, 0, 10],
        extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.72, 1, 0.72],
        extrapolate: 'clamp',
    });

    return (
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
            {!!card.subtitle && <Text style={styles.snapshotSubtitle}>{card.subtitle}</Text>}
        </View>

        <View style={[styles.snapshotAccent, { backgroundColor: card.accent ?? COLORS.moss }]} />

        <View style={styles.snapshotBody}>{card.body}</View>
        </Animated.View>
    );
}

function MiniBarChart({ values }: { values: number[] }) {
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

function MoodRow({ label }: { label: string }) {
  let emoji = '📝';

  if (label === 'Easy') emoji = '😊';
  else if (label === 'Okay') emoji = '🙂';
  else if (label === 'Hard') emoji = '😓';
  else if (label == 'No data') emoji = '🫥';

  return (
    <View style={styles.moodWrap}>
      <Text style={styles.moodEmoji}>{emoji}</Text>
    </View>
  );
}

function StatsBlock({
  completionPercent,
  streakPercent,
}: {
  completionPercent: number;
  streakPercent: number;
}) {
  return (
    <View style={styles.statsBlock}>
      <View>
        <Text style={styles.statsBig}>{completionPercent}%</Text>
        <Text style={styles.statsLabel}>completion</Text>
      </View>
      <View>
        <Text style={styles.statsBig}>{streakPercent}%</Text>
        <Text style={styles.statsLabel}>streak score</Text>
      </View>
    </View>
  );
}

export default function RecapScreen() {
    const scrollX = useRef(new Animated.Value(0)).current;
    const [showInfoModal, setShowInfoModal] = useState(false);
    
    const { recap, isLoading, isFromCache, weekKey } = useRecap();

    if (isLoading || !recap) {
        return (
            <View style={styles.background}>
                <View style={styles.loadingWrap}>
                    <Text style={styles.loadingText}>Loading recap...</Text>
                </View>
            </View>
        );
    }

    const animalImageUri =
        ANIMAL_IMAGE_BY_TITLE[recap.archetype.title] ??
        'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80';

    const weekItems = recap.weekItems;

    const weekBarValues = recap.weekItems.map((item) => {
        if (item.ratio == null) return 8;
        return Math.max(8, Math.round(item.ratio * 80));
    });

    const snapshotCards: SnapshotCard[] = [
        {
        id: 'completion-pulse',
        title: 'Completion Pulse',
        subtitle: `${recap.snapshots.completionPulse.percent}%`,
        accent: '#6E8B62',
        body: (
            <View>
            <Text style={styles.cardBodyHeadline}>
                {recap.snapshots.completionPulse.percent}% complete
            </Text>
            <Text style={styles.cardBodySubtext}>
                {recap.snapshots.completionPulse.insight}
            </Text>
            <StatsBlock
                completionPercent={recap.snapshots.completionPulse.percent}
                streakPercent={Math.round(recap.scores.streakScore * 100)}
            />
            </View>
        ),
        },
        {
        id: 'category-leader',
        title: 'Category Leader',
        subtitle: recap.snapshots.categoryLeader.topCategory,
        accent: '#8E6E53',
        body: (
            <View>
            <Text style={styles.cardBodyHeadline}>
                Top: {recap.snapshots.categoryLeader.topCategory} ({recap.snapshots.categoryLeader.topPercent}%)
            </Text>
            <Text style={styles.cardBodySubtext}>
                Needs attention: {recap.snapshots.categoryLeader.weakestCategory} ({recap.snapshots.categoryLeader.weakestPercent}%)
            </Text>
            <Text style={[styles.cardBodySubtext, { marginTop: 14 }]}>
                {recap.snapshots.categoryLeader.insight}
            </Text>
            </View>
        ),
        },
        {
        id: 'rhythm-check',
        title: 'Rhythm Check',
        subtitle: `${recap.snapshots.rhythmCheck.strongDays} strong days`,
        accent: '#7B8F6A',
        body: (
            <View>
            <Text style={styles.cardBodyHeadline}>
                Best: {recap.snapshots.rhythmCheck.bestDay}
            </Text>
            <Text style={styles.cardBodySubtext}>
                Weakest: {recap.snapshots.rhythmCheck.weakestDay}
            </Text>
            <MiniBarChart values={weekBarValues} />
            <Text style={[styles.cardBodySubtext, { marginTop: 10 }]}>
                {recap.snapshots.rhythmCheck.insight}
            </Text>
            </View>
        ),
        },
        {
        id: 'mood-board',
        title: 'Mood Board',
        subtitle: recap.snapshots.moodBoard.label,
        accent: '#5F7A61',
        body: (
            <View>
            <Text style={styles.cardBodyHeadline}>
                Difficulty:{' '}
                {recap.snapshots.moodBoard.averageDifficulty == null
                ? 'No data'
                : `${recap.snapshots.moodBoard.averageDifficulty.toFixed(1)} / 5`}
            </Text>
            <Text style={styles.cardBodySubtext}>
                {recap.snapshots.moodBoard.insight}
            </Text>
            <MoodRow label={recap.snapshots.moodBoard.label} />
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
            <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.push('/home')}
            >
                <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>

            <Modal
            visible={showInfoModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowInfoModal(false)}
            >
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>About Your Recap</Text>

                <Text style={styles.modalText}>
                    This screen gives you a weekly summary of your health and habit activity.
                    It highlights your progress throughout the week, shows an animal that
                    matches your overall behavior, and includes snapshot cards for trends
                    like habit score, sleep, and mood.
                </Text>

                <Text style={styles.modalText}>
                    Think of it like a Spotify Wrapped for your routines — a visual recap of
                    how your week went.
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
                <Text numberOfLines={2} style={styles.title}>
                User's Natural Habitat
                </Text>
                <Pressable
                    style={styles.helpPill}
                    hitSlop={10}
                    onPress={() => setShowInfoModal(true)}
                >
                    <Text style={styles.helpText}>i</Text>
                </Pressable>
            </View>

            <View style={styles.rightSpacer} />
            </View>

            <Text style={styles.subtitle}>A recap of your health and habits this week.</Text>

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
                    renderItem={({ item }) => <DayChip item={item} />}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.weekList}
                />
            </View>
            </View>

            <Text style={styles.sectionTitle}>This week, you were a…</Text>

            <View style={styles.animalCard}>
            <Image
                source={{ uri: animalImageUri }}
                style={styles.animalImage}
            />
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
                <SnapshotCardView card={item} index={index} scrollX={scrollX} />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.snapList}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            bounces={false}
            onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            />

            <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>WEEKLY HIGHLIGHT</Text>
            <Text style={styles.summaryHeadline}>AI Summary.</Text>
            <Text style={styles.summaryText}>
                This will be coming soon.
            </Text>
            </View>
        </ScrollView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: "#EAF6E8",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(250,246,239,0.20)',
    },

    backBtn: {
        marginBottom: Spacing.md,
        alignSelf: 'flex-start',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.paleGreen,
        borderRadius: Radius.sm,
    },
    backBtnText: {
        color: Colors.primaryGreen,
        fontWeight: '600',
        fontSize: FontSize.md,
    },

    container: {
        paddingTop: Dimensions.get('window').height * 0.05,
        paddingHorizontal: SIDE_SPACER,
        paddingBottom: 34,
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.chip,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.10)',
    },
    topIcon: {
        fontSize: 18,
        color: COLORS.forest,
    },

    rightSpacer: { width: 5 },

    titleWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    title: {
        fontSize: 24,
        color: COLORS.forest,
        maxWidth: '82%',
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    helpPill: {
        minWidth: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.chip,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.10)',
    },
    helpText: {
        color: COLORS.brown,
        fontSize: 14,
    },

    subtitle: {
        marginTop: 12,
        marginBottom: 18,
        color: COLORS.bark,
        fontSize: 15,
        lineHeight: 22,
    },

    weekSection: {
        marginBottom: 10,
    },
    sectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionEyebrow: {
        color: COLORS.moss,
        fontSize: 12,
        letterSpacing: 1.2,
    },
    morePill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: COLORS.chip,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.10)',
    },
    moreText: {
        color: COLORS.brown,
        fontSize: 12,
    },

    weekCard: {
        marginTop: 10,
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderRadius: 22,
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
        alignItems: 'center',
    },
    weekList: {
        paddingRight: 10,
        gap: 12,
    },

    dayChip: {
        alignItems: 'center',
        gap: 5,
        minWidth: 35,
    },
    dateNumber: {
        fontSize: 12,
        color: COLORS.brown,
    },
    dateNumberToday: {
        color: COLORS.forest,
    },
    circle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderWidth: 1.4,
        borderColor: 'rgba(77,58,45,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleDone: {
        backgroundColor: 'rgba(95,122,97,0.18)',
        borderColor: 'rgba(35,75,58,0.28)',
    },
    circleToday: {
        borderColor: COLORS.forest,
        borderWidth: 1.8,
    },
    check: {
        color: COLORS.forest,
        fontSize: 14,
        fontWeight: '900',
    },
    dayLabel: {
        fontSize: 12,
        color: COLORS.brown,
    },
    dayLabelToday: {
        color: COLORS.forest,
    },

    sectionTitle: {
        marginTop: 18,
        fontSize: 22,
        color: COLORS.forest,
        fontWeight: '700',
    },

    animalCard: {
        marginTop: 12,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: COLORS.softWhite,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
    },
    animalImage: {
        width: '100%',
        height: 215,
    },
    animalTextWrap: {
        padding: 16,
    },
    animalEyebrow: {
        color: COLORS.moss,
        fontSize: 11,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
    },
    animalType: {
        marginTop: 4,
        fontSize: 28,
        color: COLORS.bark,
        fontFamily: FONTS.title,
        fontWeight: '700',
    },
    animalDescription: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 21,
        color: COLORS.brown,
    },

    snapHeaderRow: {
        marginTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    snapHint: {
        color: COLORS.brown,
        fontSize: 12,
    },

    snapList: {
        paddingTop: 14,
        paddingBottom: 8,
        paddingRight: SIDE_SPACER,
    },
    snapshotCard: {
        width: CARD_WIDTH,
        marginRight: CARD_SPACING,
        padding: 16,
        borderRadius: 24,
        backgroundColor: COLORS.softWhite,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
        shadowColor: '#5A4635',
        shadowOpacity: 0.10,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
    },
    snapshotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    snapshotTitle: {
        color: COLORS.bark,
        fontSize: 18,
    },
    snapshotSubtitle: {
        color: COLORS.forest,
        fontSize: 16,
    },
    snapshotAccent: {
        marginTop: 10,
        width: 44,
        height: 5,
        borderRadius: 999,
    },
    snapshotBody: {
        marginTop: 16,
        minHeight: 160,
        justifyContent: 'flex-start',
    },

    cardBodyHeadline: {
        fontSize: 19,
        color: COLORS.forest,
        fontWeight: '700',
    },
    cardBodySubtext: {
        marginTop: 6,
        color: COLORS.brown,
        fontSize: 14,
        lineHeight: 20,
    },

    chartWrap: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 90,
        gap: 8,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    bar: {
        width: '100%',
        borderRadius: 999,
        backgroundColor: COLORS.moss,
        opacity: 0.9,
    },

    moodWrap: {
        marginTop: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    moodPill: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(175,195,162,0.22)',
    },
    moodEmoji: {
        fontSize: 48,
        textAlign: 'center',
    },

    statsBlock: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.60)',
        borderRadius: 18,
        padding: 14,
    },
    statsBig: {
        fontSize: 28,
        color: COLORS.bark,
        fontWeight: '700',
    },
    statsLabel: {
        marginTop: 2,
        color: COLORS.brown,
        fontSize: 12,
    },

    summaryCard: {
        marginTop: 18,
        padding: 18,
        borderRadius: 24,
        backgroundColor: 'rgba(247,241,232,0.88)',
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
    },
    summaryEyebrow: {
        color: COLORS.moss,
        fontSize: 11,
        letterSpacing: 1.1,
    },
    summaryHeadline: {
        marginTop: 6,
        fontSize: 22,
        color: COLORS.forest,
        fontWeight: '700',
    },
    summaryText: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 21,
        color: COLORS.brown,
    },

    modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    },

    modalCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(247,241,232,0.98)',
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(77,58,45,0.10)',
    },

    modalTitle: {
    fontSize: 22,
    color: COLORS.forest,
    fontWeight: '700',
    marginBottom: 10,
    },

    modalText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.brown,
    marginBottom: 12,
    },

    modalButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: COLORS.forest,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    },

    modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    },  

    loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: Dimensions.get('window').height,
    },

    loadingText: {
        color: COLORS.forest,
        fontSize: 16,
        fontWeight: '600',
    },

    futureDot: {
        fontSize: 16,
        color: COLORS.brown,
    },

    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },

    weekKeyText: {
        color: COLORS.brown,
        fontSize: 12,
    },

    cacheText: {
        color: COLORS.moss,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});