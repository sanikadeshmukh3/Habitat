// prisma/seed-stacking-demo.js
//
// Seeds a demo user whose state is pre-configured to demonstrate the full
// habit stacking lifecycle for presentation purposes.
//
// ─── What this creates ────────────────────────────────────────────────────────
//
//   User:  demo@habitat.com / password123
//
//   5 habits with 35 days of check-in history:
//
//   ┌─────────────────────┬────────┬─────────────┬────────┬───────────────────┐
//   │ Habit               │ Tier   │ Consistency │ Active │ Role              │
//   ├─────────────────────┼────────┼─────────────┼────────┼───────────────────┤
//   │ Morning Meditation  │ TIER_1 │ 92%         │ yes    │ Locked (not shown │
//   │ Daily Reading       │ TIER_1 │ 87%         │ yes    │ in schedule)      │
//   │ Drink Water         │ TIER_3 │ 85%         │ yes    │ ACTIVE entry —    │
//   │                     │        │             │        │ proving window    │
//   │                     │        │             │        │ elapsed → modal   │
//   │ Evening Walk        │ TIER_2 │ 71%         │ no     │ PENDING rank 1    │
//   │ Journaling          │ TIER_3 │ 48%         │ no     │ PENDING rank 2    │
//   └─────────────────────┴────────┴─────────────┴────────┴───────────────────┘
//
//   On app open, the proving window pipeline detects that:
//     - Drink Water's proving window has elapsed (target was yesterday)
//     - Drink Water's consistency score is 85% (above the 80% unlock threshold)
//   → The StackingActivationModal fires automatically, prompting the user to
//     unlock Evening Walk.
//
// ─── How to run ───────────────────────────────────────────────────────────────
//
//   node prisma/seed-stacking-demo.js
//
//   Run this from the backend/ directory. Requires DATABASE_URL to be set in
//   your .env file. The script is safe to re-run — it deletes the demo user and
//   all their data before recreating everything from scratch.
//
// ─── Login credentials ────────────────────────────────────────────────────────
//
//   Email:    demo@habitat.com
//   Password: password123

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // noon — avoids timezone edge cases on boundary days
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Generates check-in records for a habit over a date range.
 * completionPattern is an array of booleans, one per day from startDay to endDay
 * (index 0 = startDay days ago, last index = endDay days ago).
 */
function generateCheckIns(habitId, completionPattern) {
  const totalDays = completionPattern.length;
  return completionPattern.map((completed, i) => {
    const daysBack = totalDays - i; // oldest first
    return {
      habitId,
      completed,
      date: daysAgo(daysBack),
      pointsEarned: completed ? 10 : 0,
    };
  });
}

// ─── Completion patterns (35 days, index 0 = 35 days ago) ────────────────────
// true = completed, false = missed

const T = true;
const F = false;

// Morning Meditation — TIER_1, 92% (33/35 completed)
const MEDITATION_PATTERN = [
  T, T, T, T, T, T, F, T, T, T,
  T, T, T, T, T, T, T, T, F, T,
  T, T, T, T, T, T, T, T, T, T,
  T, T, T, T, T,
];

// Daily Reading — TIER_1, 87% (30/35 completed — some weekend misses)
const READING_PATTERN = [
  T, T, F, T, T, T, T, T, T, T,
  F, T, T, T, T, T, T, T, T, T,
  T, F, T, T, T, T, T, T, T, T,
  T, T, T, F, T,
];

// Drink Water — started struggling (TIER_3), recovered during proving window.
// Observation window: days 35–6 ago (30 days), 55% (16/29 completed) → TIER_3.
// Proving window: last 14 days, 12/14 completed = 85.7% → above 80% unlock.
const WATER_PATTERN = [
  // Observation window (days 35–6 ago): struggling at 55%
  T, F, T, F, F, T, T, F, T, F,
  T, T, F, F, T, T, F, T, F, T,
  T, F, T, F, F, T, T, F, T, // 29 days observation
  // gap day (day 6 ago) — observation window closed
  F,
  // Proving window (last 14 days — days 5 to today): 12/14 = 85.7%
  T, T, T, T, F, T, T, T, T, T, T, T, F, T,
];
// Total: 29 + 1 + 14 = 44... let me fix the pattern to 35 days clearly

// Let me redo this more carefully as 35 days
// Days 35–6 ago = 30 days observation; days 5 ago to today = last few of proving window
// proving window = 14 days, started 14 days ago
// So days 35 to 15 ago = 21 days before proving window (struggling)
// Days 14 to today = 14 days proving window

const WATER_PATTERN_FIXED = [
  // days 35–15 ago (21 days before proving window): struggling
  T, F, T, F, F, T, T, F, T, F,
  T, F, F, T, T, F, T, F, F, T, F,
  // days 14–1 ago (14 days, the proving window): recovered — 12/14 = 85.7%
  T, T, T, T, F, T, T, T, T, T, T, T, F, T,
];
// 21 + 14 = 35 ✓

// Evening Walk — TIER_2, 71% (25/35 completed)
const WALK_PATTERN = [
  T, T, T, F, T, T, F, T, T, F,
  T, T, F, T, T, T, F, T, T, T,
  F, T, T, T, F, T, T, F, T, T,
  T, F, T, T, F,
];

// Journaling — TIER_3, 48% (17/35 completed — clearly struggling)
const JOURNAL_PATTERN = [
  T, F, F, T, F, F, T, F, T, F,
  F, T, F, F, T, F, T, F, F, T,
  F, F, T, F, T, F, F, T, F, F,
  T, F, T, F, F,
];

// ─── Consistency score calculations ──────────────────────────────────────────

function consistencyScore(pattern, windowDays) {
  // score over the observation window (last windowDays of the pattern)
  const window = pattern.slice(-windowDays);
  const completed = window.filter(Boolean).length;
  return Math.min(completed / windowDays, 1.0);
}

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding stacking demo user...\n');

  // ── 1. Clean up any existing demo user ──────────────────────────────────────
  const existing = await prisma.user.findUnique({
    where: { email: 'demo@habitat.com' },
  });

  if (existing) {
    console.log('   Removing existing demo@habitat.com...');

    // delete in dependency order
    const habits = await prisma.habit.findMany({ where: { userId: existing.id } });
    const habitIds = habits.map((h) => h.id);

    const enrollments = await prisma.stackingEnrollment.findMany({
      where: { userId: existing.id },
    });
    const enrollmentIds = enrollments.map((e) => e.id);

    await prisma.stackingScheduleEntry.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    });
    await prisma.stackingEnrollment.deleteMany({ where: { userId: existing.id } });
    await prisma.habitCheckIn.deleteMany({ where: { habitId: { in: habitIds } } });
    await prisma.userBadge.deleteMany({ where: { userId: existing.id } });
    await prisma.habit.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });

    console.log('   Done.\n');
  }

  // ── 2. Create user ───────────────────────────────────────────────────────────
  const bcrypt = require('bcrypt');
  const PASSWORD_HASH = await bcrypt.hash('password123', 10);

  const user = await prisma.user.create({
    data: {
      email:      'demo@habitat.com',
      password:   PASSWORD_HASH,
      username:   'habitdemo',
      firstName:  'Demo',
      lastName:   'User',
      isVerified: true,
      timezone:   'America/New_York',
    },
  });

  console.log(`   ✓ User created: demo@habitat.com (id: ${user.id})`);

  // ── 3. Create habits ─────────────────────────────────────────────────────────

  // Shared observation window: closed 5 days ago (30 days from habit creation at day 35)
  const OBS_WINDOW_END = daysAgo(5);
  const HABIT_CREATED  = daysAgo(35);

  const meditation = await prisma.habit.create({
    data: {
      userId:              user.id,
      name:                'Morning Meditation',
      description:         '10 minutes of mindfulness to start the day',
      habitCategory:       'WELLNESS',
      frequency:           'DAILY',
      active:              true,
      createdAt:           HABIT_CREATED,
      observationWindowEnd: OBS_WINDOW_END,
      tier:                'TIER_1',
      consistencyScore:    0.92,
      consistencyUpdatedAt: daysAgo(5),
      currentStreak:       12,
    },
  });

  const reading = await prisma.habit.create({
    data: {
      userId:              user.id,
      name:                'Daily Reading',
      description:         '20 pages before bed',
      habitCategory:       'PRODUCTIVITY',
      frequency:           'DAILY',
      active:              true,
      createdAt:           HABIT_CREATED,
      observationWindowEnd: OBS_WINDOW_END,
      tier:                'TIER_1',
      consistencyScore:    0.87,
      consistencyUpdatedAt: daysAgo(5),
      currentStreak:       8,
    },
  });

  const water = await prisma.habit.create({
    data: {
      userId:              user.id,
      name:                'Drink Water',
      description:         '8 glasses of water daily',
      habitCategory:       'NUTRITION',
      frequency:           'DAILY',
      active:              true,  // active — it's in the proving window
      createdAt:           HABIT_CREATED,
      observationWindowEnd: OBS_WINDOW_END,
      tier:                'TIER_3',
      consistencyScore:    0.857, // 12/14 during proving window
      consistencyUpdatedAt: daysAgo(1),
      currentStreak:       5,
    },
  });

  const walk = await prisma.habit.create({
    data: {
      userId:              user.id,
      name:                'Evening Walk',
      description:         '30 minute walk after dinner',
      habitCategory:       'FITNESS',
      frequency:           'DAILY',
      active:              false,  // dormant — waiting in the queue
      createdAt:           HABIT_CREATED,
      observationWindowEnd: OBS_WINDOW_END,
      tier:                'TIER_2',
      consistencyScore:    0.71,
      consistencyUpdatedAt: daysAgo(5),
      currentStreak:       0,
    },
  });

  const journaling = await prisma.habit.create({
    data: {
      userId:              user.id,
      name:                'Journaling',
      description:         'Daily reflection and gratitude',
      habitCategory:       'WELLNESS',
      frequency:           'DAILY',
      active:              false,  // dormant — waiting in the queue
      createdAt:           HABIT_CREATED,
      observationWindowEnd: OBS_WINDOW_END,
      tier:                'TIER_3',
      consistencyScore:    0.48,
      consistencyUpdatedAt: daysAgo(5),
      currentStreak:       0,
    },
  });

  console.log('   ✓ 5 habits created');

  // ── 4. Create check-in history ───────────────────────────────────────────────

  const allCheckIns = [
    ...generateCheckIns(meditation.id, MEDITATION_PATTERN),
    ...generateCheckIns(reading.id,    READING_PATTERN),
    ...generateCheckIns(water.id,      WATER_PATTERN_FIXED),
    ...generateCheckIns(walk.id,       WALK_PATTERN),
    ...generateCheckIns(journaling.id, JOURNAL_PATTERN),
  ];

  await prisma.habitCheckIn.createMany({ data: allCheckIns });

  console.log(`   ✓ ${allCheckIns.length} check-ins created (35 days × 5 habits)`);

  // ── 5. Create stacking enrollment ────────────────────────────────────────────

  const enrollment = await prisma.stackingEnrollment.create({
    data: {
      userId:     user.id,
      status:     'ACTIVE',
      enrolledAt: daysAgo(14),  // enrolled when proving window started
      updatedAt:  daysAgo(14),
    },
  });

  console.log(`   ✓ Enrollment created (id: ${enrollment.id})`);

  // ── 6. Create schedule entries ───────────────────────────────────────────────

  // ACTIVE entry: Drink Water — proving window elapsed, score above threshold
  // provingWindowTarget is yesterday → pipeline sees it as complete on next app open
  await prisma.stackingScheduleEntry.create({
    data: {
      enrollmentId:        enrollment.id,
      habitId:             water.id,
      priorityRank:        1,
      status:              'ACTIVE',
      provingWindowStart:  daysAgo(14),
      provingWindowTarget: daysAgo(1), // elapsed — activation modal will fire
      activatedAt:         daysAgo(14),
      snoozeCount:         0,
    },
  });

  // PENDING entry: Evening Walk — rank 1 in the pending queue
  await prisma.stackingScheduleEntry.create({
    data: {
      enrollmentId: enrollment.id,
      habitId:      walk.id,
      priorityRank: 2,
      status:       'PENDING',
      snoozeCount:  0,
    },
  });

  // PENDING entry: Journaling — rank 2 in the pending queue
  await prisma.stackingScheduleEntry.create({
    data: {
      enrollmentId: enrollment.id,
      habitId:      journaling.id,
      priorityRank: 3,
      status:       'PENDING',
      snoozeCount:  0,
    },
  });

  console.log('   ✓ 3 schedule entries created (1 ACTIVE, 2 PENDING)\n');

  // ── 7. Summary ───────────────────────────────────────────────────────────────

  console.log('─'.repeat(60));
  console.log('Demo user ready.\n');
  console.log('  Login:     demo@habitat.com / password123');
  console.log('  User ID:   ' + user.id);
  console.log('  Enrollment ID: ' + enrollment.id);
  console.log('');
  console.log('What to expect on first app open:');
  console.log('  → StackingActivationModal fires automatically');
  console.log('     "Drink Water proving window is complete!"');
  console.log('     "Ready to unlock Evening Walk?"');
  console.log('');
  console.log('Dashboard state:');
  console.log('  → StackingStatusCard shows Drink Water at 85.7%');
  console.log('  → Morning Meditation and Daily Reading show as normal active habits');
  console.log('  → Evening Walk and Journaling are dormant (greyed out)');
  console.log('');
  console.log('Habit ranking screen (reorder mode):');
  console.log('  → Drink Water shown as currently active (not draggable)');
  console.log('  → Evening Walk (TIER_2, 71%) at rank 1');
  console.log('  → Journaling (TIER_3, 48%) at rank 2');
  console.log('─'.repeat(60));
}

seed()
  .catch((err) => {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });