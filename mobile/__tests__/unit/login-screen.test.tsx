import React from 'react';
import { render } from '@testing-library/react-native';
import Login from '../../app/login';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe('Login screen', () => {
  it('renders the main login UI', () => {
    const { getByPlaceholderText, getByText } = render(<Login />);

    expect(getByText('Habitat')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Forgot Password?')).toBeTruthy();
  });
});