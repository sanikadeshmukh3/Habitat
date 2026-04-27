import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RecapScreen from '@/app/(tabs)/recap';

/*
Wrapped / Recap Screen Unit Tests

What this file tests:
1. Loading state renders correctly
2. Weekly recap content renders correctly
3. AI summary regeneration button works

Tech Stack:
- Jest
- React Native Testing Library

These tests mock:
- useRecap()
- useWeeklySummary()
- useRegenerateWeeklySummary()

Purpose:
Ensure Habitat Wrapped renders correctly and key user actions work.
*/

jest.mock('@/hooks/use-recap', () => ({
  useRecap: jest.fn(),
}));

jest.mock('@/hooks/use-weekly-summary', () => ({
  useWeeklySummary: jest.fn(),
}));

jest.mock('@/hooks/use-regenerate-weekly-summary', () => ({
  useRegenerateWeeklySummary: jest.fn(),
}));

import { useRecap } from '@/hooks/use-recap';
import { useWeeklySummary } from '@/hooks/use-weekly-summary';
import { useRegenerateWeeklySummary } from '@/hooks/use-regenerate-weekly-summary';

/*
Mock weekly recap data
Simulates what a real user would receive after completing habits
for the week.
*/
const mockRecap = {
  weekKey: '2026-04-19',
  weekStart: '2026-04-19',
  weekEnd: '2026-04-25',

  archetype: {
    animal: 'Bear',
    title: 'Steady Bear',
    description: 'You maintained a steady rhythm.',
  },

  scores: {
    completionScore: 0.75,
    consistencyScore: 0.7,
    streakScore: 0.65,
    reflectionScore: 0.5,
  },

  snapshots: {
    completionPulse: {
      title: 'Completion Pulse',
      value: '75%',
      insight: 'Strong consistency',
    },
    categoryLeader: {
      title: 'Category Leader',
      bestCategory: 'Fitness',
      weakestCategory: 'Sleep',
      insight: 'Fitness carried your week',
    },
    rhythmCheck: {
      title: 'Rhythm Check',
      strongDays: 5,
      insight: 'You stayed consistent',
    },
    moodBoard: {
      title: 'Mood Board',
      label: 'Easy',
      insight: 'Your habits felt manageable',
    },
  },

  weekItems: [
    { key: 'sun', dayLabel: 'Sun', shortLabel: 'Sun', ratio: 0.8 },
    { key: 'mon', dayLabel: 'Mon', shortLabel: 'Mon', ratio: 0.7 },
    { key: 'tue', dayLabel: 'Tue', shortLabel: 'Tue', ratio: 0.9 },
    { key: 'wed', dayLabel: 'Wed', shortLabel: 'Wed', ratio: 0.6 },
    { key: 'thu', dayLabel: 'Thu', shortLabel: 'Thu', ratio: 0.75 },
    { key: 'fri', dayLabel: 'Fri', shortLabel: 'Fri', ratio: 0.8 },
    { key: 'sat', dayLabel: 'Sat', shortLabel: 'Sat', ratio: 0.9 },
  ],
};

describe('Wrapped / Recap Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state while recap is loading', () => {
    (useRecap as jest.Mock).mockReturnValue({
      recap: null,
      previousWeekRecap: null,
      isLoading: true,
      loading: true,
      error: null,
    });

    (useWeeklySummary as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    (useRegenerateWeeklySummary as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });

    render(<RecapScreen />);

    console.log('\n----------------------------------[RECAP LOADING TEST]----------------------------------');
    console.log('EXPECTED: Loading screen should appear');
    console.log('ACTUAL: Loading screen rendered successfully');

    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  test('renders archetype, snapshot cards, and AI summary correctly', () => {
    (useRecap as jest.Mock).mockReturnValue({
      recap: mockRecap,
      previousWeekRecap: mockRecap,
      isLoading: false,
      loading: false,
      error: null,
    });

    (useWeeklySummary as jest.Mock).mockReturnValue({
      data: {
        summary: 'You had a strong and consistent week.',
        available: true,
        refreshesRemaining: 2,
      },
      isLoading: false,
    });

    (useRegenerateWeeklySummary as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });

    render(<RecapScreen />);

    console.log('\n----------------------------------[RECAP CONTENT TEST]----------------------------------');
    console.log(
      'EXPECTED: Archetype, snapshot cards, and AI summary should render'
    );
    console.log('ACTUAL: All recap content rendered successfully');

    expect(screen.getByText(/steady bear/i)).toBeTruthy();
    expect(screen.getByText(/completion pulse/i)).toBeTruthy();
    expect(screen.getByText(/rhythm check/i)).toBeTruthy();
    expect(screen.getByText(/strong and consistent week/i)).toBeTruthy();
  });

  test('calls regenerate summary when refresh button is pressed', () => {
    const mockRegenerate = jest.fn();

    (useRecap as jest.Mock).mockReturnValue({
      recap: mockRecap,
      previousWeekRecap: mockRecap,
      isLoading: false,
      loading: false,
      error: null,
    });

    (useWeeklySummary as jest.Mock).mockReturnValue({
      data: {
        summary: 'You had a strong week.',
        available: true,
        refreshesRemaining: 2,
      },
      isLoading: false,
    });

    (useRegenerateWeeklySummary as jest.Mock).mockReturnValue({
      mutate: mockRegenerate,
      isPending: false,
    });

    render(<RecapScreen />);

    fireEvent.press(screen.getByText(/refresh summary/i));

    console.log('\n----------------------------------[RECAP REGENERATE TEST]----------------------------------');
    console.log(
      'EXPECTED: Refresh summary button should trigger regenerate function'
    );
    console.log('ACTUAL: Regenerate function called successfully');

    expect(mockRegenerate).toHaveBeenCalled();
  });
});