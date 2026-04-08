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
  Modal,
  KeyboardAvoidingView,
  Platform,
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
  const [showPassword,        setShowPassword]        = useState(false);
  const [showNewPassword,     setShowNewPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditing,           setIsEditing]           = useState(false);

  // Current-password gate modal
  const [showPasswordGate,  setShowPasswordGate]  = useState(false);
  const [currentPassword,   setCurrentPassword]   = useState('');
  const [showCurrentPass,   setShowCurrentPass]   = useState(false);
  const [passwordGateError, setPasswordGateError] = useState('');

  // Draft values — initialised from server data when the user opens the editor
  const [draftEmail,       setDraftEmail]       = useState('');
  const [draftTag,         setDraftTag]         = useState('');
  const [draftPass,        setDraftPass]        = useState('');
  const [draftPassConfirm, setDraftPassConfirm] = useState('');
  const [draftPhotoUri,    setDraftPhotoUri]    = useState<string | null>(null);

  // Opens the current-password gate; on success, enters edit mode
  const startEdit = () => {
    setCurrentPassword('');
    setPasswordGateError('');
    setShowCurrentPass(false);
    setShowPasswordGate(true);
  };

  const confirmPasswordGate = () => {
    if (currentPassword.length < 1) {
      setPasswordGateError('Please enter your current password.');
      return;
    }
    // ── TODO: if your API supports a pre-flight password-check endpoint,
    //    call it here before proceeding.  Otherwise the currentPassword is
    //    forwarded with the PATCH payload and the server will reject it if
    //    it is wrong (see saveEdit below).
    setShowPasswordGate(false);
    setDraftEmail(email);
    setDraftTag(publicTag);
    setDraftPass('');
    setDraftPassConfirm('');
    setDraftPhotoUri(photoUri);
    setIsEditing(true);
  };

  // ── Save: write all edited fields to the DB in a single PATCH ────────────
  const saveEdit = () => {
    // Validate new password fields before building the payload
    if (draftPass.length > 0 || draftPassConfirm.length > 0) {
      if (draftPass.length < 8) {
        Alert.alert('Invalid password', 'New password must be at least 8 characters.');
        return;
      }
      if (draftPass !== draftPassConfirm) {
        Alert.alert('Passwords do not match', 'Please make sure both password fields are identical.');
        return;
      }
    }

    // Build the payload with only changed fields so we don't overwrite
    // unchanged data unnecessarily.
    const payload: Parameters<typeof saveProfile>[0] = {};

    if (draftEmail.trim()   && draftEmail.trim() !== email)     payload.email     = draftEmail.trim();
    if (draftTag.trim()     && draftTag.trim()   !== publicTag)  payload.publicTag = draftTag.trim();
    if (draftPass.length >= 8) {
      payload.password        = draftPass;
      // ── TODO: forward currentPassword to the server so it can verify the
      //    old password before accepting the new one.  Remove this line if
      //    your API handles that differently (e.g. a separate confirm step).
      payload.currentPassword = currentPassword;
    }
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

  const cancelEdit = () => {
    setIsEditing(false);
    setDraftPassConfirm('');
    setCurrentPassword('');
  };

  // ── Privacy toggle — saves immediately (single-tap action like a setting) ─
  // TODO: Commenting out until public/private implementation is finalized.
  // const handlePrivacyToggle = (value: boolean) => {
  //   saveProfile({ isPublic: value });
  // };

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
    AsyncStorage.removeItem('token');
    router.replace('./login');
  };
  //clears the token and replaces the stack with login screen

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
                  <Text style={styles.infoLabel}>Create new password</Text>
                  <TextInput
                    style={styles.editInput}
                    value={draftPass}
                    onChangeText={setDraftPass}
                    secureTextEntry={!showNewPassword}
                    placeholder="New password (8+ chars)"
                    placeholderTextColor={Colors.lightBrown}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(p => !p)}>
                    <Text style={styles.revealLink}>
                      {showNewPassword ? 'hide' : 'show'} password
                    </Text>
                  </TouchableOpacity>

                  <Text style={[styles.infoLabel, { marginTop: Spacing.xs }]}>Confirm new password</Text>
                  <TextInput
                    style={styles.editInput}
                    value={draftPassConfirm}
                    onChangeText={setDraftPassConfirm}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor={Colors.lightBrown}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)}>
                    <Text style={styles.revealLink}>
                      {showConfirmPassword ? 'hide' : 'show'} password
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.infoValue}>••••••••</Text>
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
          {/* TODO: Commenting out until public/private implementation is finalized. */}
          {/* <View style={styles.privacyBlock}>
            <Text style={styles.privacyLabel}>
              {isPublic ? '🌐 Public' : '🔒 Private'}
            </Text>
            <Switch
              value={isPublic}
              onValueChange={handlePrivacyToggle}
              trackColor={{ false: Colors.lightBrown, true: Colors.midGreen }}
              thumbColor={isPublic ? Colors.primaryGreen : Colors.lightBrown}
            />
          </View> */}
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

        {/* ── Current-password gate modal ───────────────────────── */}
        <Modal
          visible={showPasswordGate}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPasswordGate(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirm your identity</Text>
              <Text style={styles.modalSubtitle}>
                Enter your current password to edit your profile.
              </Text>

              <Text style={styles.infoLabel}>Current password</Text>
              <TextInput
                style={styles.editInput}
                value={currentPassword}
                onChangeText={(v) => { setCurrentPassword(v); setPasswordGateError(''); }}
                secureTextEntry={!showCurrentPass}
                placeholder="Your current password"
                placeholderTextColor={Colors.lightBrown}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowCurrentPass(p => !p)}>
                <Text style={styles.revealLink}>
                  {showCurrentPass ? 'hide' : 'show'} password
                </Text>
              </TouchableOpacity>

              {passwordGateError.length > 0 && (
                <Text style={styles.modalError}>{passwordGateError}</Text>
              )}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={confirmPasswordGate}
                >
                  <Text style={styles.saveBtnText}>Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowPasswordGate(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

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

  // ── Current-password gate modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.darkBrown,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.lightBrown,
    marginBottom: Spacing.sm,
  },
  modalError: {
    fontSize: FontSize.xs,
    color: '#d9534f',
    marginTop: 2,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
});