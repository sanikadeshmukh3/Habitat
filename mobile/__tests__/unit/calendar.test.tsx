import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import CalendarScreen from '../../app/calendar';

// mock navigation
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

// mock API
jest.mock('@/lib/api', () => ({
  get: jest.fn(),
}));

// mock check-in hook
jest.mock('@/hooks/use-checkin', () => ({
  useUpsertCheckIn: () => ({
    mutate: jest.fn(),
  }),
}));

describe('Calendar screen', () => {
  it('fetches and displays habits', async () => {
    const api = require('@/lib/api');

    api.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: '1',
            name: 'Drink Water',
          },
        ],
      },
    });

    // second call = /checkins
    api.get.mockResolvedValueOnce({
      data: { data: {} },
    });

    const { getByText } = render(<CalendarScreen />);

    await waitFor(() => {
      expect(getByText('Drink Water')).toBeTruthy();
    });
  });
});