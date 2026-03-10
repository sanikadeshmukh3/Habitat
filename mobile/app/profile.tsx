import React, { useState } from 'react';
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
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

// ── Fake user data – replace with real auth/store later ──────
const INITIAL_USER = {
  email:     'user@example.com',
  publicTag: '@greenleaf_user',
  password:  '••••••••',
  points:    112,
  badges: [
    { id: '1', label: '🌱 Seedling' },
    { id: '2', label: '🔥 7-Day Streak' },
    { id: '3', label: '🏆 Top Sharer' },
  ],
};

export default function ProfileScreen() {
  // ── State ────────────────────────────────────────────────
  const [isPublic, setIsPublic]         = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Edit mode: when true, fields become TextInputs
  // LOCATION OF EDIT LOGIC: the `isEditing` flag and the
  // `draft*` states below control the whole edit flow.
  const [isEditing, setIsEditing]       = useState(false);
  const [email,     setEmail]           = useState(INITIAL_USER.email);
  const [publicTag, setPublicTag]       = useState(INITIAL_USER.publicTag);
  const [password,  setPassword]        = useState(INITIAL_USER.password);

  // Draft values while editing – only committed on Save
  const [draftEmail,  setDraftEmail]    = useState(email);
  const [draftTag,    setDraftTag]      = useState(publicTag);
  const [draftPass,   setDraftPass]     = useState(password);

  const startEdit = () => {
    setDraftEmail(email);
    setDraftTag(publicTag);
    setDraftPass(password);
    setIsEditing(true);
  };

  const saveEdit = () => {
    setEmail(draftEmail);
    setPublicTag(draftTag);
    setPassword(draftPass);
    setIsEditing(false);
    // TODO: persist to your API/store here
  };

  const cancelEdit = () => setIsEditing(false);

  // ── Photo state ────────────────────
  // `photoUri` holds the raw picked image URI.
  // To persist across launches: save photoUri to AsyncStorage in saveEdit().
  const [photoUri,    setPhotoUri]    = useState<string | null>(null);

  // Opens the device photo library.
  const pickPhoto = async () => {
    try {
      const { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } =
        await import('expo-image-picker');
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { alert('Photo library permission required'); return; }
      const result = await launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    } catch (e) {
      console.error('Image pick error:', e);
    }
  };

  // navigation placeholder – swap with your router call
  const goBack = () => console.log('Navigate back to Home');

  return (
    <ImageBackground
      source={require('../assets/images/leaf.png')}
      style={styles.bg}
      imageStyle={{ opacity: 0.06 }}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Back button ─────────────────────────────────────
            LOCATION: change `backBtn` style to reposition     */}
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* ── Top row: avatar+info LEFT | privacy toggle RIGHT
            LOCATION: `topRow` flex row, adjust justify/align  */}
        <View style={styles.topRow}>

          {/* Left block – avatar circle + email / tag / password */}
          <View style={styles.infoBlock}>
            {/* ── Avatar
                View mode: shows photo (clipped to circle) or initial letter.
                Edit mode: same, plus a camera button underneath to pick a photo.
                After picking, the cropper modal (below) lets the user pan */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {email[0].toUpperCase()}
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
                <Text style={styles.infoValue}>{publicTag}</Text>
              )}

              {/* PASSWORD */}
              <Text style={styles.infoLabel}>Password</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={draftPass}
                  onChangeText={setDraftPass}
                  secureTextEntry={!showPassword}
                />
              ) : (
                <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                  <Text style={styles.infoValue}>
                    {showPassword ? password : '••••••••'}
                    {'  '}
                    <Text style={styles.revealLink}>
                      {showPassword ? 'hide' : 'show'}
                    </Text>
                  </Text>
                </TouchableOpacity>
              )}

              {/* Edit / Save / Cancel buttons
                  LOCATION: lives here inside infoText, below the fields.
                  Move this block elsewhere in the JSX to reposition.  */}
              <View style={styles.editBtnRow}>
                {isEditing ? (
                  <>
                    <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                      <Text style={styles.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
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

          {/* Right block – public / private toggle
              LOCATION: `privacyBlock` style, or move the whole
              View outside `topRow` to change layout            */}
          <View style={styles.privacyBlock}>
            <Text style={styles.privacyLabel}>
              {isPublic ? '🌐 Public' : '🔒 Private'}
            </Text>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: Colors.lightBrown, true: Colors.midGreen }}
              thumbColor={isPublic ? Colors.primaryGreen : Colors.lightBrown}
            />
          </View>
        </View>

        {/* ── Stats row: points + badges ── */}
        <View style={styles.statsRow}>
          <View style={styles.pointsCard}>
            <Text style={styles.cardTitle}>Points</Text>
            <Text style={styles.pointsValue}>{INITIAL_USER.points}</Text>
          </View>
          <View style={styles.badgesCard}>
            <Text style={styles.cardTitle}>Badges</Text>
            {INITIAL_USER.badges.map(b => (
              <View key={b.id} style={styles.badgeChip}>
                <Text style={styles.badgeText}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: Colors.pageBg,
  },
  container: {
    padding: Spacing.md,
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
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  // Wrapper holds the circle + the camera button underneath
  avatarWrapper: {
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  // The photo fills the circle; translateX/Y shifts it per cropOffset
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
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
  // ── Cropper (shown inline above the fields after picking a photo) ──
  // LOCATION: sits inside infoBlock, above infoText.
  // To make it a full-screen overlay instead, move it outside topRow
  // and add position:'absolute', top:0, left:0, right:0, bottom:0.
  cropperModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.midGreen,
  },
  cropperHint: {
    fontSize: FontSize.xs,
    color: Colors.lightBrown,
    marginBottom: Spacing.xs,
  },
  // The circular mask window – overflow:hidden clips the dragged image
  cropWindow: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primaryGreen,
    marginBottom: Spacing.sm,
  },
  // Larger than the window so there's room to pan
  dragImage: {
    width: 280,
    height: 280,
    marginLeft: -80,   // center the image inside the window initially
    marginTop: -80,
  },
  avatarInitial: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: '700',
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
  },

    // ── Edit mode styles ──
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

  // ── Privacy toggle (right side of top row) ──
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
});