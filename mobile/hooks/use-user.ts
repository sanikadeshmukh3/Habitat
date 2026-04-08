import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  UserProfile,
  UserSettings,
  UpdateProfilePayload,
  UpdateSettingsPayload,
  DEFAULT_USER_SETTINGS,
} from '../types/user';

import api from '../lib/api';

// ─── Query key factory ────────────────────────────────────────────────────────

export const userKeys = {
  all:      ()             => ['users']                         as const,
  profile:  () => ['users', 'profile']   as const,
  settings: () => ['users', 'settings']  as const,
} as const;

// ─── API functions ────────────────────────────────────────────────────────────

async function fetchUserProfile(): Promise<UserProfile> {
  const { data } = await api.get<{ data: UserProfile }>(`/users/me`);
  console.log('User profile fetched:', data.data);
  // Ensure settings always has all keys even if the DB row is missing some
  return {
    ...data.data,
    settings: { ...DEFAULT_USER_SETTINGS, ...data.data.settings },
  };
}

async function fetchUserSettings(): Promise<UserSettings> {
  const { data } = await api.get<{ data: UserSettings }>(`/users/me/settings`);
  return { ...DEFAULT_USER_SETTINGS, ...data.data };
}

async function patchUserProfile(
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const { data } = await api.patch<{ data: UserProfile }>(`/users/me`, payload);
  return {
    ...data.data,
    settings: { ...DEFAULT_USER_SETTINGS, ...data.data.settings },
  };
}

async function patchUserSettings(
  payload: UpdateSettingsPayload,
): Promise<UserSettings> {
  const { data } = await api.patch<{ data: UserSettings }>(
    `/users/me/settings`,
    payload,
  );
  return { ...DEFAULT_USER_SETTINGS, ...data.data };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * useUserProfile
 *
 * Fetches the full profile for a given user.  Both profile.tsx and any other
 * screen that needs the user's email, tag, or avatar should use this hook.
 *
 * @example
 * const { data: profile, isLoading } = useUserProfile(currentUserId);
 * const email    = profile?.email;
 * const photoUri = profile?.settings.photoUri;
 */
export function useUserProfile(
): UseQueryResult<UserProfile, AxiosError> {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn:  () => fetchUserProfile(),
    staleTime: 1000 * 60 * 5, // treat profile as fresh for 5 minutes
  });
}

/**
 * useUserSettings
 *
 * Fetches only the settings slice.  settings.tsx should use this hook so it
 * doesn't need to load the full profile just to render toggles.
 *
 * If the profile is already cached (because profile.tsx mounted first) the
 * settings are seeded from that cache immediately, so no extra network request
 * is made.
 *
 * @example
 * const { data: settings, isLoading } = useUserSettings(currentUserId);
 * const theme = settings?.theme ?? 'light';
 */
export function useUserSettings(
): UseQueryResult<UserSettings, AxiosError> {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: userKeys.settings(),
    queryFn:  () => fetchUserSettings(),
    staleTime: 1000 * 60 * 5,

    // Seed from the profile cache so settings.tsx renders instantly when the
    // user navigates from a screen that already loaded the profile.
    placeholderData: () => {
      const profile = queryClient.getQueryData<UserProfile>(userKeys.profile());
      return profile?.settings;
    },
  });
}

/**
 * useUpdateUserProfile
 *
 * Patches the user's profile with optimistic updates.
 * Call this from profile.tsx's saveEdit() instead of managing local state.
 *
 * @example
 * const { mutate: saveProfile, isPending } = useUpdateUserProfile(currentUserId);
 * saveProfile({ email: 'new@email.com', publicTag: '@newhandle' });
 */
export function useUpdateUserProfile(
): UseMutationResult<UserProfile, AxiosError, UpdateProfilePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => patchUserProfile(payload),

    // ── Optimistic update ──────────────────────────────────────────────────
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: userKeys.profile() });
      await queryClient.cancelQueries({ queryKey: userKeys.settings() });

      const prevProfile  = queryClient.getQueryData<UserProfile>(userKeys.profile());
      const prevSettings = queryClient.getQueryData<UserSettings>(userKeys.settings());

      // Extract settings-backed fields from the payload.
      // currentPassword is only used server-side for auth verification —
      // it must NOT be spread into the settings cache.
      const { email, password, currentPassword: _currentPassword, ...settingsFields } = payload;

      if (prevProfile) {
        queryClient.setQueryData<UserProfile>(userKeys.profile(), {
          ...prevProfile,
          ...(email ? { email } : {}),
          settings: { ...prevProfile.settings, ...settingsFields },
        });
      }

      if (prevSettings && Object.keys(settingsFields).length > 0) {
        queryClient.setQueryData<UserSettings>(userKeys.settings(), {
          ...prevSettings,
          ...settingsFields,
        });
      }

      return { prevProfile, prevSettings };
    },

    // ── Rollback on error ──────────────────────────────────────────────────
    onError: (error, _payload, context) => {
      console.error('[useUpdateUserProfile] failed:', error.message);

      if (context?.prevProfile) {
        queryClient.setQueryData(userKeys.profile(), context.prevProfile);
      }
      if (context?.prevSettings) {
        queryClient.setQueryData(userKeys.settings(), context.prevSettings);
      }
    },

    // ── Settle: revalidate from server ─────────────────────────────────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
      queryClient.invalidateQueries({ queryKey: userKeys.settings() });
    },
  });
}

/**
 * useUpdateUserSettings
 *
 * Patches only the settings JSONB with optimistic updates.
 * Call this from settings.tsx whenever a toggle or chip selection changes.
 *
 * Both the profile cache and the settings cache are kept in sync so that
 * profile.tsx always reflects the latest values without an extra fetch.
 *
 * @example
 * const { mutate: saveSettings } = useUpdateUserSettings(currentUserId);
 * saveSettings({ theme: 'dark' });
 * saveSettings({ habitStacking: true });
 * saveSettings({ notifications: false });
 */
export function useUpdateUserSettings(
): UseMutationResult<UserSettings, AxiosError, UpdateSettingsPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => patchUserSettings(payload),

    // ── Optimistic update ──────────────────────────────────────────────────
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: userKeys.settings() });
      await queryClient.cancelQueries({ queryKey: userKeys.profile() });

      const prevSettings = queryClient.getQueryData<UserSettings>(userKeys.settings());
      const prevProfile  = queryClient.getQueryData<UserProfile>(userKeys.profile());

      const optimisticSettings = { ...(prevSettings ?? DEFAULT_USER_SETTINGS), ...payload };

      queryClient.setQueryData<UserSettings>(userKeys.settings(), optimisticSettings);

      // Mirror the change into the profile cache so profile.tsx stays consistent
      if (prevProfile) {
        queryClient.setQueryData<UserProfile>(userKeys.profile(), {
          ...prevProfile,
          settings: optimisticSettings,
        });
      }

      return { prevSettings, prevProfile };
    },

    // ── Rollback on error ──────────────────────────────────────────────────
    onError: (error, _payload, context) => {
      console.error('[useUpdateUserSettings] failed:', error.message);

      if (context?.prevSettings) {
        queryClient.setQueryData(userKeys.settings(), context.prevSettings);
      }
      if (context?.prevProfile) {
        queryClient.setQueryData(userKeys.profile(), context.prevProfile);
      }
    },

    // ── Settle: revalidate from server ─────────────────────────────────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.settings() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}