// tests/unit/use-user.test.ts

/**
 * Unit tests for hooks/use-user.ts
 *
 * These tests exercise the React Query cache manipulation logic — optimistic
 * updates, cache seeding, and rollbacks on error — without ever hitting a real
 * server.  The api module is mocked so every test controls exactly what the
 * network "returns".
 *
 * Dependencies (add if not already installed):
 *   npm install --save-dev @testing-library/react @testing-library/jest-dom
 *
 * Run with:  npx jest use-user
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useUserSettings,
  useUpdateUserSettings,
  useUpdateUserProfile,
  userKeys,
} from '../../hooks/use-user';
import type { UserProfile, UserSettings } from '../../types/user';
import { DEFAULT_USER_SETTINGS } from '../../types/user';

// ─── Mock the api module ──────────────────────────────────────────────────────

jest.mock('../../lib/api', () => ({
  get:   jest.fn(),
  patch: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require('../../lib/api') as { get: jest.Mock; patch: jest.Mock };

// ─── Test utilities ───────────────────────────────────────────────────────────

/**
 * Creates a fresh QueryClient for each test.  `retry: false` prevents Jest
 * from waiting for React Query's default three retries on failures.
 * `gcTime: Infinity` keeps cached data alive for the full test duration.
 */
function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries:   { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

/**
 * Returns a wrapper component that provides QueryClient context to renderHook.
 * A new client is created per test via makeClient() so no cache leaks between
 * tests.
 */
function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

// ─── Fixture data ─────────────────────────────────────────────────────────────

const SETTINGS: UserSettings = {
  theme:         'light',
  habitStacking: false,
  notifications: false,
  isPublic:      true,
};

const PROFILE: UserProfile = {
  id:        'user-1',
  email:     'alice@example.com',
  firstName: 'Alice',
  lastName:  'Smith',
  timezone:  'America/New_York',
  creation:  '2024-01-01T00:00:00.000Z',
  points:    10,
  badges:    [],
  settings:  SETTINGS,
};

beforeEach(() => jest.clearAllMocks());

// ─── useUserSettings ──────────────────────────────────────────────────────────

/**
 * useUserSettings
 *
 * Fetches /users/me/settings.  The most important behaviour beyond the network
 * call is that it seeds placeholder data from the profile cache so the settings
 * screen renders instantly when the user navigated from a screen that already
 * fetched the profile.
 */
describe('useUserSettings', () => {
  /**
   * When the profile query is already in the React Query cache (e.g. profile.tsx
   * mounted first), useUserSettings must return profile.settings immediately as
   * placeholder data — no loading spinner, no extra network round-trip.
   */
  test('returns settings from the profile cache as placeholder data', async () => {
    const client = makeClient();
    // Simulate profile.tsx having already fetched and cached the profile.
    client.setQueryData(userKeys.profile(), PROFILE);

    // The network call will eventually resolve, but the placeholder must already
    // be present before it does.
    api.get.mockResolvedValue({ data: { data: SETTINGS } });

    const { result } = renderHook(() => useUserSettings(), {
      wrapper: makeWrapper(client),
    });

    // Placeholder is synchronous — no waiting required.
    expect(result.current.data?.theme).toBe('light');
    expect(result.current.data?.habitStacking).toBe(false);
  });

  /**
   * When there is no cached profile the hook falls back to a standard network
   * fetch.  After the promise resolves the data must reflect the server response.
   */
  test('fetches settings from the network when the profile cache is empty', async () => {
    const client = makeClient();
    api.get.mockResolvedValue({ data: { data: SETTINGS } });

    const { result } = renderHook(() => useUserSettings(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith('/users/me/settings');
    expect(result.current.data?.theme).toBe('light');
  });
});

// ─── useUpdateUserSettings ────────────────────────────────────────────────────

/**
 * useUpdateUserSettings
 *
 * Patches /users/me/settings with optimistic updates.  The critical invariants:
 *
 *   1. Both the settings cache AND the profile cache are updated immediately
 *      (before the server responds) so the UI feels instant.
 *   2. Both caches are restored to their pre-mutation snapshots when the server
 *      returns an error, so the UI never gets stuck in a stale optimistic state.
 */
describe('useUpdateUserSettings', () => {
  /**
   * Optimistic update — settings cache: calling mutate({ theme: 'dark' }) must
   * update the settings cache before the API call resolves.  The UI reads from
   * the cache, so the toggle must appear to flip instantly.
   */
  test('applies optimistic update to the settings cache before the API responds', async () => {
    const client = makeClient();
    client.setQueryData(userKeys.settings(), SETTINGS);

    // Use a never-resolving promise so we can inspect the in-flight cache state.
    api.patch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useUpdateUserSettings(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ theme: 'dark' });
    });

    const cached = client.getQueryData<UserSettings>(userKeys.settings());
    expect(cached?.theme).toBe('dark'); // applied before server acks
  });

  /**
   * Optimistic update — profile cache mirror: the profile cache must also
   * reflect the change so profile.tsx stays consistent without an extra refetch.
   */
  test('mirrors the optimistic update into the profile cache', async () => {
    const client = makeClient();
    client.setQueryData(userKeys.settings(), SETTINGS);
    client.setQueryData(userKeys.profile(), PROFILE);

    api.patch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useUpdateUserSettings(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ habitStacking: true });
    });

    const cachedProfile = client.getQueryData<UserProfile>(userKeys.profile());
    expect(cachedProfile?.settings.habitStacking).toBe(true);
  });

  /**
   * Rollback on error: both the settings cache and the profile cache must revert
   * to their values from before mutate() was called when the server rejects the
   * request.
   */
  test('rolls back both caches to their previous values on server error', async () => {
    const client = makeClient();
    client.setQueryData(userKeys.settings(), SETTINGS);
    client.setQueryData(userKeys.profile(), PROFILE);

    // Return the original data on refetch (triggered by onSettled invalidation)
    // so the rollback assertion reflects the restored snapshot, not a refetch.
    api.get.mockResolvedValue({ data: { data: SETTINGS } });
    api.patch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUpdateUserSettings(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ theme: 'dark' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // After onError runs, both caches must be back to the original 'light' theme.
    const cachedSettings = client.getQueryData<UserSettings>(userKeys.settings());
    const cachedProfile  = client.getQueryData<UserProfile>(userKeys.profile());
    expect(cachedSettings?.theme).toBe('light');           // restored ✓
    expect(cachedProfile?.settings.theme).toBe('light');   // restored ✓
  });
});

// ─── useUpdateUserProfile ─────────────────────────────────────────────────────

/**
 * useUpdateUserProfile
 *
 * Patches /users/me with optimistic updates.  Unlike useUpdateUserSettings this
 * mutation handles both top-level profile fields (email, firstName, lastName)
 * and settings-backed fields (isPublic).  Password fields are write-only and
 * must never appear in the cache.
 */
describe('useUpdateUserProfile', () => {
  /**
   * Password fields must never be placed in the cache.  The mutation receives
   * `password` and `currentPassword` in its payload, but onMutate explicitly
   * strips them before writing to the query cache so they are never readable
   * from the client-side store.
   */
  test('never caches password or currentPassword from the payload', async () => {
    const client = makeClient();
    client.setQueryData(userKeys.profile(), PROFILE);

    api.patch.mockImplementation(() => new Promise(() => {})); // in-flight

    const { result } = renderHook(() => useUpdateUserProfile(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({
        email:           'new@example.com',
        password:        'newpass123',
        currentPassword: 'oldpass',
      });
    });

    const cached = client.getQueryData<UserProfile>(userKeys.profile()) as any;
    expect(cached.password).toBeUndefined();
    expect(cached.currentPassword).toBeUndefined();
  });

  /**
   * isPublic is a settings-backed field sent via the profile endpoint.  The
   * onMutate handler must place it inside profile.settings rather than as a
   * top-level property on the profile object.
   */
  test('routes isPublic into profile.settings, not as a top-level profile field', async () => {
    const client = makeClient();
    client.setQueryData(userKeys.profile(), PROFILE);

    api.patch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useUpdateUserProfile(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ isPublic: false });
    });

    const cached = client.getQueryData<UserProfile>(userKeys.profile()) as any;
    expect(cached.settings.isPublic).toBe(false);  // inside settings ✓
    expect(cached.isPublic).toBeUndefined();         // not a column ✓
  });

  /**
   * Standard profile fields (email, firstName, lastName) must be applied
   * directly to the top-level profile cache object, not nested inside settings.
   */
  test('applies email and firstName directly to the top-level profile cache', async () => {
    const client = makeClient();
    client.setQueryData(userKeys.profile(), PROFILE);

    api.patch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useUpdateUserProfile(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ email: 'new@example.com', firstName: 'Bob' });
    });

    const cached = client.getQueryData<UserProfile>(userKeys.profile());
    expect(cached?.email).toBe('new@example.com');
    expect(cached?.firstName).toBe('Bob');
  });

  /**
   * Rollback on error: both the profile cache and the settings cache must revert
   * to their pre-mutation snapshots when the server returns an error.
   */
  test('rolls back the profile cache to its original state on server error', async () => {
    const client = makeClient();
    client.setQueryData(userKeys.profile(), PROFILE);
    client.setQueryData(userKeys.settings(), SETTINGS);

    api.get.mockResolvedValue({ data: { data: PROFILE } });
    api.patch.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useUpdateUserProfile(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ email: 'new@example.com' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cachedProfile = client.getQueryData<UserProfile>(userKeys.profile());
    expect(cachedProfile?.email).toBe('alice@example.com'); // restored ✓
  });
});