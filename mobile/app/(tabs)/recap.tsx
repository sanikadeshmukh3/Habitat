// recap.tsx
import React, { useMemo } from 'react';
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
  useWindowDimensions,
  Platform,
} from 'react-native';

type WeekdayKey = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

type WeekdayItem = {
  key: WeekdayKey;
  dateNumber: number;
  done: boolean;
  isToday: boolean;
};

export type SnapshotCard = {
  id: string;
  title: string;
  subtitle?: string;
  body?: React.ReactNode; // graphs/components/etc.
};

export type AnimalRecap = {
  imageUri?: string;
  typeLabel?: string;
};

export type RecapScreenProps = {
  userDisplayName: string;

  /**
   * Completion map for the current week, keyed by weekday.
   * If you don’t have real data yet, you can omit it.
   */
  weeklyProgressDoneByDay?: Partial<Record<WeekdayKey, boolean>>;

  animal?: AnimalRecap;

  snapshotCards?: SnapshotCard[];

  backgroundImage?: string;

  onPressSettings?: () => void;
  onPressHelp?: () => void;
  onPressWeeklyChecklist?: () => void;

  /** Optional override for testing */
  now?: Date;
};

const WEEKDAY_ORDER: WeekdayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfWeekSunday(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeekItems(
  now: Date,
  doneByDay?: Partial<Record<WeekdayKey, boolean>>,
): WeekdayItem[] {
  const safeDoneByDay = doneByDay ?? {}; // ✅ prevents undefined crash

  const todayIndex = now.getDay();
  const sunday = startOfWeekSunday(now);

  const items: WeekdayItem[] = [];
  for (let i = 0; i < WEEKDAY_ORDER.length; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);

    const key = WEEKDAY_ORDER[i];

    items.push({
      key,
      dateNumber: date.getDate(),
      done: Boolean(safeDoneByDay[key]),
      isToday: i === todayIndex,
    });
  }

  return items;
}

function DayChip({ item }: { item: WeekdayItem }) {
  return (
    <View style={styles.dayChip}>
      <Text style={[styles.dateNumber, item.isToday && styles.dateNumberToday]}>
        {item.dateNumber}
      </Text>

      <View style={[styles.circle, item.done && styles.circleDone, item.isToday && styles.circleToday]}>
        {item.done && <Text style={styles.check}>✓</Text>}
      </View>

      <Text style={[styles.dayLabel, item.isToday && styles.dayLabelToday]}>{item.key}</Text>
    </View>
  );
}

function SnapshotCardView({ card }: { card: SnapshotCard }) {
  return (
    <View style={styles.snapshotCard}>
      <View style={styles.snapshotHeader}>
        <Text style={styles.snapshotTitle}>{card.title}</Text>
        {card.subtitle ? <Text style={styles.snapshotSubtitle}>{card.subtitle}</Text> : null}
      </View>

      <View style={styles.snapshotBody}>
        {card.body ?? <Text style={styles.snapshotBodyText}>{'<analytics component>'}</Text>}
      </View>
    </View>
  );
}

export default function RecapScreen({
  userDisplayName,
  weeklyProgressDoneByDay,
  animal,
  snapshotCards,
  backgroundImage,
  onPressSettings,
  onPressHelp,
  onPressWeeklyChecklist,
  now: nowProp,
}: RecapScreenProps) {
  const now = nowProp ?? new Date();
  const { width } = useWindowDimensions();

  const weekItems = useMemo(
    () => buildWeekItems(now, weeklyProgressDoneByDay),
    // using nowProp time if provided; otherwise build once per mount + when data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nowProp?.getTime(), weeklyProgressDoneByDay],
  );

  const safeAnimal: AnimalRecap = animal ?? {};
  const animalUri =
    safeAnimal.imageUri ??
    'https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=1200&q=80';

  const animalType = safeAnimal.typeLabel ?? '<insert animal type>';

  const safeCards: SnapshotCard[] =
    snapshotCards ??
    [
      {
        id: 'habit-score',
        title: 'Habit Score',
        subtitle: '—',
        body: <Text style={styles.snapshotBodyText}>{'<score chart>'}</Text>,
      },
      { id: 'sleep', title: 'Sleep Snapshot', body: <Text style={styles.snapshotBodyText}>{'<sleep graph>'}</Text> },
      { id: 'mood', title: 'Mood', body: <Text style={styles.snapshotBodyText}>{'<mood trend>'}</Text> },
    ];


  return (
    <ImageBackground source={require('../../assets/images/habitat-gradient.png')} style={styles.background} resizeMode="cover">
      <View style={styles.overlay} />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Platform.OS === 'ios' ? 16 : 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onPressSettings} style={styles.topButton} hitSlop={10}>
            <Text style={styles.topIcon}>⚙</Text>
          </Pressable>

          <View style={styles.titleWrap}>
            <Text numberOfLines={1} style={styles.title}>
              User’s Natural Habitat
            </Text>
            <Pressable onPress={onPressHelp} style={styles.helpPill} hitSlop={10}>
              <Text style={styles.helpText}>i</Text>
            </Pressable>
          </View>

          <View style={styles.rightSpacer} />
        </View>

        <Text style={styles.subtitle}>A recap of your health & habits this week.</Text>

        {/* Week progress (Sun → today) */}
        <View style={styles.weekRow}>
          <FlatList
            data={weekItems}
            keyExtractor={(i) => i.key}
            horizontal
            renderItem={({ item }) => <DayChip item={item} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekList}
          />
        </View>

        <Pressable onPress={onPressWeeklyChecklist} style={styles.morePill} hitSlop={10}>
            <Text style={styles.moreText}>•••</Text>
        </Pressable>

        {/* Animal */}
        <Text style={styles.sectionTitle}>This week, you were a…</Text>
        <View style={styles.animalCard}>
          <Image source={{ uri: animalUri }} style={styles.animalImage} />
          <Text style={styles.animalType}>{animalType}</Text>
        </View>

        {/* Snapshots */}
        <View style={styles.snapHeaderRow}>
          <Text style={styles.sectionTitle}>Snapshots</Text>
        </View>

        <FlatList
          horizontal
          data={safeCards}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <SnapshotCardView card={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.snapList}
        />
      </ScrollView>
    </ImageBackground>
  );
}

const CARD_WIDTH = 240;

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'rgba(255,255,255,0.2)', // light wash over background image
  },

  container: { paddingHorizontal: 18, paddingBottom: 28 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topButton: { padding: 6 },
  topIcon: { fontSize: 20, color: '#23503e' },

  rightSpacer: { width: 38 },

  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', maxWidth: '82%' },

  helpPill: {
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.15)',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  helpText: { fontWeight: '900', color: '#111827' },

  subtitle: { marginTop: 10, marginBottom: 12, color: '#374151' },

  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekList: { gap: 12, paddingRight: 8 },

  morePill: {
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.15)',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  moreText: { fontSize: 16, fontWeight: '900', color: '#111827', letterSpacing: 2 },

  dayChip: { alignItems: 'center', gap: 6, minWidth: 42 },
  dateNumber: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  dateNumberToday: { color: '#111827' },

  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(17,24,39,0.25)',
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    borderColor: 'rgba(16,185,129,0.50)',
    backgroundColor: 'rgba(16,185,129,0.20)',
  },
  circleToday: {
    borderColor: 'rgba(17,24,39,0.55)',
  },
  check: { color: '#065F46', fontWeight: '900' },

  dayLabel: { fontSize: 12, color: '#4B5563', fontWeight: '700' },
  dayLabelToday: { color: '#111827' },

  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 18, color: '#111827' },

  animalCard: { marginTop: 10, gap: 10 },
  animalImage: {
    width: '100%',
    height: 210,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  animalType: { fontWeight: '800', color: '#111827' },

  snapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  hint: { color: '#6B7280', fontSize: 12, marginTop: 18 },

  snapList: { gap: 12, paddingVertical: 10, paddingRight: 8 },

  snapshotCard: {
    width: CARD_WIDTH,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.10)',
  },
  snapshotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  snapshotTitle: { fontWeight: '800', color: '#111827' },
  snapshotSubtitle: { fontWeight: '900', color: '#111827' },

  snapshotBody: {
    marginTop: 10,
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.08)',
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  snapshotBodyText: { color: '#374151', fontWeight: '700' },

});