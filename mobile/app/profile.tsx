import { router } from "expo-router";
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Image,
  ImageBackground,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useUserProfile, useUpdateUserProfile } from '../hooks/use-user';

// ── Placeholder badges/points ─────────────────────────────────────────────────
// TODO: replace with a real hook once you add a points/badges system to your schema.
const PLACEHOLDER_BADGES = [
  { id: '1', label: '🌱 Seedling' },
  { id: '2', label: '🔥 7-Day Streak' },
  { id: '3', label: '🏆 Top Sharer' },
];
const PLACEHOLDER_POINTS = 112;

export default function ProfileScreen() {

  // ── Remote data ───────────────────────────────────────────────────────────
  const {
    data:      profile,
    isLoading: profileLoading,
    isError:   profileError,
  } = useUserProfile();

  const { mutate: saveProfile, isPending: isSaving } = useUpdateUserProfile();

  // ── Derived display values (fall back to empty while loading) ─────────────
  const email     = profile?.email            ?? '';
  const publicTag = profile?.settings.publicTag ?? '';
  const isPublic  = profile?.settings.isPublic  ?? true;
  const photoUri  = profile?.settings.photoUri  ?? null;

  // ── UI-only state ─────────────────────────────────────────────────────────
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing,    setIsEditing]    = useState(false);

  // Draft values — initialised from server data when the user opens the editor
  const [draftEmail,    setDraftEmail]    = useState('');
  const [draftTag,      setDraftTag]      = useState('');
  const [draftPass,     setDraftPass]     = useState('');
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | null>(null);

  const startEdit = () => {
    setDraftEmail(email);
    setDraftTag(publicTag);
    setDraftPass('');           // never pre-fill password for security
    setDraftPhotoUri(photoUri);
    setIsEditing(true);
  };

  // ── Save: write all edited fields to the DB in a single PATCH ────────────
  const saveEdit = () => {
    // Build the payload with only changed fields so we don't overwrite
    // unchanged data unnecessarily.
    const payload: Parameters<typeof saveProfile>[0] = {};

    if (draftEmail.trim()   && draftEmail.trim() !== email)     payload.email     = draftEmail.trim();
    if (draftTag.trim()     && draftTag.trim()   !== publicTag)  payload.publicTag = draftTag.trim();
    if (draftPass.length >= 8)                                   payload.password  = draftPass;
    if (draftPhotoUri !== photoUri)                              payload.photoUri  = draftPhotoUri;

    // Nothing actually changed — skip the network call
    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    saveProfile(payload, {
      onSuccess: () => setIsEditing(false),
      onError:   (err) => {
        const msg = (err as any)?.response?.data?.error ?? 'Could not save changes.';
        Alert.alert('Save failed', msg);
      },
    });
  };

  const cancelEdit = () => setIsEditing(false);

  // ── Privacy toggle — saves immediately (single-tap action like a setting) ─
  const handlePrivacyToggle = (value: boolean) => {
    saveProfile({ isPublic: value });
  };

  // ── Photo picker ──────────────────────────────────────────────────────────
  // Stores the local URI as a draft.  On save() it is submitted along with the
  // other changed fields.
  //
  // ⚠️  PRODUCTION NOTE — see advice at the bottom of this file for how to
  //     upload the image to cloud storage before persisting a URL to the DB.
  const pickPhoto = async () => {
    try {
      const { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } =
        await import('expo-image-picker');
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission required', 'Photo library access is needed.'); return; }
      const result = await launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
      if (!result.canceled) setDraftPhotoUri(result.assets[0].uri);
    } catch (e) {
      console.error('Image pick error:', e);
    }
  };

  // ── Log out ───────────────────────────────────────────────────────────────
  const handleLogOut = async () => {
    // TODO: clear your auth token / session before navigating
    // e.g. await AsyncStorage.multiRemove(['@userId', '@authToken']);
    //      or call your auth context's signOut() method.
    router.replace('./login');
  };

  const goBack = () => router.push('./(tabs)/home');

  // ── Resolve which photo URI to display ───────────────────────────────────
  // While editing show the draft (so the user sees their newly picked photo
  // before they save).  Otherwise show the persisted value.
  const displayPhotoUri = isEditing ? draftPhotoUri : photoUri;

  // ── Loading / error states ────────────────────────────────────────────────

  if (profileError) {
    return (
      <View style={styles.centred}>
        <Text style={styles.errorText}>Could not load profile. Please try again.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/images/leaf.png')}
      style={styles.bg}
      imageStyle={{ opacity: 0.06 }}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Back button ─────────────────────────────────────── */}
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* ── Top row: avatar+info LEFT | privacy toggle RIGHT ── */}
        <View style={styles.topRow}>

          <View style={styles.infoBlock}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                {displayPhotoUri ? (
                  <Image source={{ uri: displayPhotoUri }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {email[0]?.toUpperCase() ?? '?'}
                  </Text>
                )}
              </View>
              {isEditing && (
                <TouchableOpacity style={styles.cameraBtn} onPress={pickPhoto}>
                  <Text style={styles.cameraBtnText}>📷</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoText}>

              {/* EMAIL */}
              <Text style={styles.infoLabel}>Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={draftEmail}
                  onChangeText={setDraftEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.infoValue}>{email}</Text>
              )}

              {/* TAG */}
              <Text style={styles.infoLabel}>Tag</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={draftTag}
                  onChangeText={setDraftTag}
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.infoValue}>{publicTag || '—'}</Text>
              )}

              {/* PASSWORD */}
              <Text style={styles.infoLabel}>Password</Text>
              {isEditing ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={draftPass}
                    onChangeText={setDraftPass}
                    secureTextEntry={!showPassword}
                    placeholder="New password (8+ chars)"
                    placeholderTextColor={Colors.lightBrown}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                    <Text style={styles.revealLink}>
                      {showPassword ? 'hide' : 'show'} password
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                  <Text style={styles.infoValue}>
                    ••••••••{'  '}
                    <Text style={styles.revealLink}>
                      {/* password is never returned by the API, so we never show it */}
                      change
                    </Text>
                  </Text>
                </TouchableOpacity>
              )}

              {/* Edit / Save / Cancel */}
              <View style={styles.editBtnRow}>
                {isEditing ? (
                  <>
                    <TouchableOpacity
                      style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                      onPress={saveEdit}
                      disabled={isSaving}
                    >
                      {isSaving
                        ? <ActivityIndicator size="small" color={Colors.white} />
                        : <Text style={styles.saveBtnText}>Save</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} disabled={isSaving}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
                    <Text style={styles.editBtnText}>✏️  Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

            </View>
          </View>

          {/* Privacy toggle — saves immediately */}
          <View style={styles.privacyBlock}>
            <Text style={styles.privacyLabel}>
              {isPublic ? '🌐 Public' : '🔒 Private'}
            </Text>
            <Switch
              value={isPublic}
              onValueChange={handlePrivacyToggle}
              trackColor={{ false: Colors.lightBrown, true: Colors.midGreen }}
              thumbColor={isPublic ? Colors.primaryGreen : Colors.lightBrown}
            />
          </View>
        </View>

        {/* ── Stats row: points + badges ─────────────────────── */}
        {/* TODO: replace PLACEHOLDER_* with a real useUserStats(userId) hook */}
        <View style={styles.statsRow}>
          <View style={styles.pointsCard}>
            <Text style={styles.cardTitle}>Points</Text>
            <Text style={styles.pointsValue}>{PLACEHOLDER_POINTS}</Text>
          </View>
          <View style={styles.badgesCard}>
            <Text style={styles.cardTitle}>Badges</Text>
            {PLACEHOLDER_BADGES.map(b => (
              <View key={b.id} style={styles.badgeChip}>
                <Text style={styles.badgeText}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Log Out ──────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logOutBtn} onPress={handleLogOut}>
          <Text style={styles.logOutBtnText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: Colors.pageBg,
  },
  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.pageBg,
    gap: Spacing.md,
  },
  errorText: {
    color: Colors.lightBrown,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  container: {
    paddingTop: Spacing.lg * 2,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  // ── Back button ──
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

  // ── Top row ──
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: Spacing.sm,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
  },
  avatarInitial: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  cameraBtn: {
    marginTop: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.sm,
  },
  cameraBtnText: {
    fontSize: 14,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.lightBrown,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.xs,
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.darkBrown,
    fontWeight: '500',
  },
  revealLink: {
    color: Colors.midGreen,
    fontSize: FontSize.xs,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  editInput: {
    borderWidth: 1,
    borderColor: Colors.midGreen,
    borderRadius: Radius.sm,
    paddingVertical: 4,
    paddingHorizontal: Spacing.xs + 2,
    fontSize: FontSize.sm,
    color: Colors.darkBrown,
    backgroundColor: Colors.inputBg,
    marginBottom: 2,
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  editBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.midGreen,
  },
  editBtnText: {
    color: Colors.primaryGreen,
    fontWeight: '600',
    fontSize: FontSize.xs,
  },
  saveBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.primaryGreen,
    borderRadius: Radius.sm,
    minWidth: 52,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.xs,
  },
  cancelBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.midGreen,
    borderRadius: Radius.sm,
  },
  cancelBtnText: {
    color: Colors.primaryGreen,
    fontWeight: '600',
    fontSize: FontSize.xs,
  },

  // ── Privacy toggle ──
  privacyBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  privacyLabel: {
    fontSize: FontSize.xs,
    color: Colors.medBrown,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pointsCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: FontSize.sm,
    color: Colors.lightBrown,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  pointsValue: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.primaryGreen,
  },
  badgesCard: {
    flex: 2,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeChip: {
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: FontSize.sm,
    color: Colors.primaryGreen,
    fontWeight: '600',
  },

  // ── Log out ──
  logOutBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#d9534f',
    alignItems: 'center',
  },
  logOutBtnText: {
    color: '#d9534f',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
});