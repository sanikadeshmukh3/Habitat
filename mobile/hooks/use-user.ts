import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import {
  UserProfile,
  UserSettings,
  UpdateProfilePayload,
  UpdateSettingsPayload,
  DEFAULT_USER_SETTINGS,
} from '../types/user';

// ─── Axios instance ───────────────────────────────────────────────────────────

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ─── Query key factory ────────────────────────────────────────────────────────

export const userKeys = {
  all:      ()             => ['users']                         as const,
  profile:  (userId: string) => ['users', 'profile', userId]   as const,
  settings: (userId: string) => ['users', 'settings', userId]  as const,
} as const;

// ─── API functions ────────────────────────────────────────────────────────────

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data } = await api.get<{ data: UserProfile }>(`/users/${userId}`, {
    params: { userId: '1' }, // remove once auth middleware injects the user
  });
  // Ensure settings always has all keys even if the DB row is missing some
  return {
    ...data.data,
    settings: { ...DEFAULT_USER_SETTINGS, ...data.data.settings },
  };
}

async function fetchUserSettings(userId: string): Promise<UserSettings> {
  const { data } = await api.get<{ data: UserSettings }>(`/users/${userId}/settings`, {
    params: { userId: '1' }, // remove once auth middleware injects the user
});
  return { ...DEFAULT_USER_SETTINGS, ...data.data };
}

async function patchUserProfile(
  userId: string,
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const { data } = await api.patch<{ data: UserProfile }>(`/users/${userId}`, payload, {
    params: { userId: '1' }, // remove once auth middleware injects the user
  });
  return {
    ...data.data,
    settings: { ...DEFAULT_USER_SETTINGS, ...data.data.settings },
  };
}

async function patchUserSettings(
  userId: string,
  payload: UpdateSettingsPayload,
): Promise<UserSettings> {
  const { data } = await api.patch<{ data: UserSettings }>(
    `/users/${userId}/settings`,
    payload,
    {
      params: { userId: '1' }, // remove once auth middleware injects the user
    },
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
  userId: string,
): UseQueryResult<UserProfile, AxiosError> {
  return useQuery({
    queryKey: userKeys.profile(userId),
    queryFn:  () => fetchUserProfile(userId),
    enabled:  !!userId,
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
  userId: string,
): UseQueryResult<UserSettings, AxiosError> {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: userKeys.settings(userId),
    queryFn:  () => fetchUserSettings(userId),
    enabled:  !!userId,
    staleTime: 1000 * 60 * 5,

    // Seed from the profile cache so settings.tsx renders instantly when the
    // user navigates from a screen that already loaded the profile.
    placeholderData: () => {
      const profile = queryClient.getQueryData<UserProfile>(userKeys.profile(userId));
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
  userId: string,
): UseMutationResult<UserProfile, AxiosError, UpdateProfilePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => patchUserProfile(userId, payload),

    // ── Optimistic update ──────────────────────────────────────────────────
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: userKeys.profile(userId) });
      await queryClient.cancelQueries({ queryKey: userKeys.settings(userId) });

      const prevProfile  = queryClient.getQueryData<UserProfile>(userKeys.profile(userId));
      const prevSettings = queryClient.getQueryData<UserSettings>(userKeys.settings(userId));

      // Extract settings-backed fields from the payload
      const { email, password, ...settingsFields } = payload;

      if (prevProfile) {
        queryClient.setQueryData<UserProfile>(userKeys.profile(userId), {
          ...prevProfile,
          ...(email ? { email } : {}),
          settings: { ...prevProfile.settings, ...settingsFields },
        });
      }

      if (prevSettings && Object.keys(settingsFields).length > 0) {
        queryClient.setQueryData<UserSettings>(userKeys.settings(userId), {
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
        queryClient.setQueryData(userKeys.profile(userId), context.prevProfile);
      }
      if (context?.prevSettings) {
        queryClient.setQueryData(userKeys.settings(userId), context.prevSettings);
      }
    },

    // ── Settle: revalidate from server ─────────────────────────────────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.settings(userId) });
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
  userId: string,
): UseMutationResult<UserSettings, AxiosError, UpdateSettingsPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => patchUserSettings(userId, payload),

    // ── Optimistic update ──────────────────────────────────────────────────
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: userKeys.settings(userId) });
      await queryClient.cancelQueries({ queryKey: userKeys.profile(userId) });

      const prevSettings = queryClient.getQueryData<UserSettings>(userKeys.settings(userId));
      const prevProfile  = queryClient.getQueryData<UserProfile>(userKeys.profile(userId));

      const optimisticSettings = { ...(prevSettings ?? DEFAULT_USER_SETTINGS), ...payload };

      queryClient.setQueryData<UserSettings>(userKeys.settings(userId), optimisticSettings);

      // Mirror the change into the profile cache so profile.tsx stays consistent
      if (prevProfile) {
        queryClient.setQueryData<UserProfile>(userKeys.profile(userId), {
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
        queryClient.setQueryData(userKeys.settings(userId), context.prevSettings);
      }
      if (context?.prevProfile) {
        queryClient.setQueryData(userKeys.profile(userId), context.prevProfile);
      }
    },

    // ── Settle: revalidate from server ─────────────────────────────────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.settings(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
    },
  });
}