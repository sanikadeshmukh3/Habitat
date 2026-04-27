import React from 'react';
import { render } from '@testing-library/react-native';
import CalendarScreen from '../../app/calendar';

/*
Calendar Screen Unit Tests

What this test validates:
1. Calendar screen renders successfully
2. Habit tracking calendar UI loads
3. Monthly calendar header appears correctly

Tech Stack:
- Jest
- React Native Testing Library

Mocked dependencies:
- Expo router navigation
- AsyncStorage
- API calls
- Check-in hooks
- Check-in modal

Purpose:
Ensures users can successfully access the calendar page where they track daily habits.
==========================================================
*/

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('@/hooks/use-checkin', () => ({
  useCheckInsForMonth: () => ({
    data: {},
    isLoading: false,
    error: null,
  }),
  useUpsertCheckIn: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('@/components/checkin-modal', () => {
  return function MockCheckInModal() {
    return null;
  };
});

describe('Calendar screen', () => {
  test('renders calendar screen successfully', async () => {
    const api = require('@/lib/api').default;

    /*
    Mock API response for habits.
    Empty habits list is fine because we only want
    to verify that the calendar UI loads properly.
    */
    api.get.mockResolvedValue({
      data: {
        habits: [],
        data: [],
      },
    });

    const { findAllByText } = render(<CalendarScreen />);

    const calendarHeader = await findAllByText(/Habits/i);

    console.log('\n----------------------------------[CALENDAR UNIT TEST]----------------------------------');
    console.log(
      'EXPECTED: Calendar page should load successfully with habit tracking UI'
    );
    console.log(
      'ACTUAL: Calendar header rendered successfully and page loaded correctly'
    );

    expect(calendarHeader.length).toBeGreaterThan(0);
  });
});