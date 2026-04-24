import { router, useFocusEffect } from "expo-router";
import api from '@/lib/api';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, FontSize, Radius, Spacing, createSharedStyles } from '@/constants/theme';
import { useUserProfile, useUpdateUserProfile } from '../hooks/use-user';
import { useQueryClient } from "@tanstack/react-query";
import { badgeLabel } from '../types/user';

export default function ProfileScreen() {

  // ── Remote data ───────────────────────────────────────────────────────────
  const {
    data:      profile,
    isLoading: profileLoading,
    refetch,
    isError:   profileError,
  } = useUserProfile();

  const { Colors } = useTheme();
  const { mutate: saveProfile, isPending: isSaving } = useUpdateUserProfile();

  // ── Derived display values ─────────────────────────────────────────────────
  const email     = profile?.email              ?? '';
  const firstName = profile?.firstName          ?? '';
  const lastName  = profile?.lastName           ?? '';
  const points    = profile?.points             ?? 0;
  const badges    = profile?.badges             ?? [];

  // ── UI-only state ─────────────────────────────────────────────────────────
  const [showNewPassword,     setShowNewPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditing,           setIsEditing]           = useState(false);

  const [showPasswordGate,  setShowPasswordGate]  = useState(false);
  const [currentPassword,   setCurrentPassword]   = useState('');
  const [showCurrentPass,   setShowCurrentPass]   = useState(false);
  const [passwordGateError, setPasswordGateError] = useState('');

  const [draftEmail,       setDraftEmail]       = useState('');
  const [draftFirstName,   setDraftFirstName]   = useState('');
  const [draftLastName,    setDraftLastName]    = useState('');
  const [draftPass,        setDraftPass]        = useState('');
  const [draftPassConfirm, setDraftPassConfirm] = useState('');

  const queryClient = useQueryClient();

  useFocusEffect(
    React.useCallback(() => {
      if (refetch) refetch();
    }, [refetch])
  );

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
    setShowPasswordGate(false);
    setDraftEmail(email);
    setDraftFirstName(firstName);
    setDraftLastName(lastName);
    setDraftPass('');
    setDraftPassConfirm('');
    setIsEditing(true);
  };

  const saveEdit = () => {
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

    if (draftFirstName.trim().length === 0) {
      Alert.alert('First name required', 'Please enter your first name.');
      return;
    }

    const payload: Parameters<typeof saveProfile>[0] = {};
    if (draftEmail.trim()     && draftEmail.trim()     !== email)     payload.email     = draftEmail.trim();
    if (draftFirstName.trim() && draftFirstName.trim() !== firstName) payload.firstName = draftFirstName.trim();
    // Allow clearing last name (send null) or updating it
    if (draftLastName.trim() !== lastName) {
      payload.lastName = draftLastName.trim() || null;
    }
    if (draftPass.length >= 8) {
      payload.password        = draftPass;
      payload.currentPassword = currentPassword;
    }

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

  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const sharedStyles = createSharedStyles(Colors);

  const handleLogOut = async () => {
    try {
      await AsyncStorage.clear();
      delete api.defaults.headers.common['Authorization'];
      queryClient.clear();
      router.replace('/login');
    } catch (err) {
      console.error("Logout error:", err);
      Alert.alert("Error", "Failed to log out properly.");
    }
  };

  const goBack = () => router.push('./(tabs)/home');

  if (profileError) {
    return (
      <View style={styles.centred}>
        <Text style={styles.errorText}>Could not load profile. Please try again.</Text>
        <TouchableOpacity style={sharedStyles.backBtn} onPress={goBack}>
          <Text style={sharedStyles.backBtnText}>← Back</Text>
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

        <TouchableOpacity style={sharedStyles.backBtn} onPress={goBack}>
          <Text style={sharedStyles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* ── Top row: avatar + info ─────────────────────────────────────── */}
        <View style={styles.topRow}>
          <View style={styles.infoBlock}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {(isEditing ? draftFirstName : firstName)[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            </View>

            <View style={styles.infoText}>
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

              <Text style={styles.infoLabel}>First Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={draftFirstName}
                  onChangeText={setDraftFirstName}
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.infoValue}>{firstName || '—'}</Text>
              )}

              <Text style={styles.infoLabel}>Last Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={draftLastName}
                  onChangeText={setDraftLastName}
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.infoValue}>{lastName || '—'}</Text>
              )}

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
                    <Text style={styles.revealLink}>{showNewPassword ? 'hide' : 'show'} password</Text>
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
                    <Text style={styles.revealLink}>{showConfirmPassword ? 'hide' : 'show'} password</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.infoValue}>••••••••</Text>
              )}

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
        </View>

        {/* ── Stats row: points + badges ─────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.pointsCard}>
            <Text style={styles.cardTitle}>Points</Text>
            {profileLoading ? (
              <ActivityIndicator color={Colors.primaryGreen} />
            ) : (
              <Text style={styles.pointsValue}>{points}</Text>
            )}
          </View>

          <View style={styles.badgesCard}>
            <Text style={styles.cardTitle}>Badges</Text>
            {profileLoading ? (
              <ActivityIndicator color={Colors.primaryGreen} />
            ) : badges.length === 0 ? (
              <Text style={styles.noBadgesText}>No badges yet — keep going! 🌱</Text>
            ) : (
              badges.map((b) => (
                <View key={b.badgeId} style={styles.badgeChip}>
                  <Text style={styles.badgeText}>{badgeLabel(b.badgeId)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.logOutBtn} onPress={handleLogOut}>
          <Text style={styles.logOutBtnText}>Log Out</Text>
        </TouchableOpacity>

        {/* ── Current-password gate modal ───────────────────────────────── */}
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
              <Text style={styles.modalSubtitle}>Enter your current password to edit your profile.</Text>

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
                <Text style={styles.revealLink}>{showCurrentPass ? 'hide' : 'show'} password</Text>
              </TouchableOpacity>

              {passwordGateError.length > 0 && (
                <Text style={styles.modalError}>{passwordGateError}</Text>
              )}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={confirmPasswordGate}>
                  <Text style={styles.saveBtnText}>Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPasswordGate(false)}>
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
const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  bg:        { flex: 1, backgroundColor: Colors.pageBg },
  centred:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.pageBg, gap: Spacing.md },
  errorText: { color: Colors.lightBrown, fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: Spacing.lg },
  container: { paddingTop: Spacing.top_margin, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },

  backBtn:     { marginBottom: Spacing.md, alignSelf: 'flex-start', paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, backgroundColor: Colors.paleGreen, borderRadius: Radius.sm },
  backBtnText: { color: Colors.primaryGreen, fontWeight: '600', fontSize: FontSize.md },

  topRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: Colors.cardBg, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  infoBlock:     { flexDirection: 'row', alignItems: 'flex-start', flex: 1, marginRight: Spacing.sm },
  avatarWrapper: { alignItems: 'center', marginRight: Spacing.sm },
  avatarCircle:  { width: 64, height: 64, borderRadius: Radius.full, backgroundColor: Colors.primaryGreen, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: Colors.white, fontSize: FontSize.xl, fontWeight: '700' },
  infoText:      { flex: 1 },
  infoLabel:     { fontSize: FontSize.xs, color: Colors.lightBrown, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.xs },
  infoValue:     { fontSize: FontSize.sm, color: Colors.darkBrown, fontWeight: '500' },
  revealLink:    { color: Colors.midGreen, fontSize: FontSize.xs, textDecorationLine: 'underline', marginTop: 2 },
  editInput:     { borderWidth: 1, borderColor: Colors.midGreen, borderRadius: Radius.sm, paddingVertical: 4, paddingHorizontal: Spacing.xs + 2, fontSize: FontSize.sm, color: Colors.darkBrown, backgroundColor: Colors.inputBg, marginBottom: 2 },

  editBtnRow:       { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  editBtn:          { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, backgroundColor: Colors.paleGreen, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.midGreen },
  editBtnText:      { color: Colors.primaryGreen, fontWeight: '600', fontSize: FontSize.xs },
  saveBtn:          { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, backgroundColor: Colors.primaryGreen, borderRadius: Radius.sm, minWidth: 52, alignItems: 'center' },
  saveBtnDisabled:  { opacity: 0.6 },
  saveBtnText:      { color: Colors.white, fontWeight: '700', fontSize: FontSize.xs },
  cancelBtn:        { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderWidth: 1, borderColor: Colors.midGreen, borderRadius: Radius.sm },
  cancelBtnText:    { color: Colors.primaryGreen, fontWeight: '600', fontSize: FontSize.xs },

  statsRow:      { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  pointsCard:    { flex: 1, backgroundColor: Colors.cardBg, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cardTitle:     { fontSize: FontSize.sm, color: Colors.lightBrown, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.xs },
  pointsValue:   { fontSize: 42, fontWeight: '800', color: Colors.primaryGreen },
  badgesCard:    { flex: 2, backgroundColor: Colors.cardBg, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  badgeChip:     { backgroundColor: Colors.paleGreen, borderRadius: Radius.full, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, marginTop: Spacing.xs, alignSelf: 'flex-start' },
  badgeText:     { fontSize: FontSize.sm, color: Colors.primaryGreen, fontWeight: '600' },
  noBadgesText:  { fontSize: FontSize.sm, color: Colors.lightBrown, marginTop: Spacing.xs, fontStyle: 'italic' },

  logOutBtn:     { marginTop: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.danger, alignItems: 'center' },
  logOutBtnText: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.md },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  modalCard:     { width: '100%', backgroundColor: Colors.cardBg, borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.xs },
  modalTitle:    { fontSize: FontSize.lg, fontWeight: '700', color: Colors.darkBrown, marginBottom: 2 },
  modalSubtitle: { fontSize: FontSize.sm, color: Colors.lightBrown, marginBottom: Spacing.sm },
  modalError:    { fontSize: FontSize.xs, color: Colors.danger, marginTop: 2 },
  modalBtnRow:   { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
});