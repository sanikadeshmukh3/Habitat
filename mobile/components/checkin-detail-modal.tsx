import { FontSize, Radius, Spacing, useTheme } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const DIFFICULTY_OPTIONS = [
  { value: 1, emoji: '😊', label: 'Easy' },
  { value: 2, emoji: '🙂', label: 'Okay' },
  { value: 3, emoji: '😓', label: 'Hard' },
];

export function difficultyEmoji(rating: number | null): string {
  return DIFFICULTY_OPTIONS.find(o => o.value === rating)?.emoji ?? '✓';
}

type Props = {
  visible: boolean;
  habitName: string;
  difficultyRating: number | null;
  notes: string;
  isToday: boolean;
  readOnly?: boolean; // if true, hides edit and undo — record is view only
  onClose: () => void;
  onSave: (value: { difficultyRating: number | null; notes: string }) => void;
  onUndo: () => void;
};

type Mode = 'view' | 'edit';

export default function CheckInDetailModal({
  visible,
  habitName,
  difficultyRating,
  notes,
  isToday,
  readOnly = false,
  onClose,
  onSave,
  onUndo,
}: Props) {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [mode, setMode] = useState<Mode>('view');
  const [draftRating, setDraftRating] = useState<number | null>(difficultyRating);
  const [draftNotes, setDraftNotes]   = useState(notes);

  // reset to view mode and sync draft values whenever modal opens
  useEffect(() => {
    if (visible) {
      setMode('view');
      setDraftRating(difficultyRating);
      setDraftNotes(notes);
    }
  }, [visible, difficultyRating, notes]);

  const handleSave = () => {
    onSave({ difficultyRating: draftRating, notes: draftNotes });
    setMode('view');
  };

  // cancel edit — revert drafts to saved values and return to view
  const handleCancelEdit = () => {
    setDraftRating(difficultyRating);
    setDraftNotes(notes);
    setMode('view');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>

          {/* ── Header ── */}
          <Text style={styles.habitName}>{habitName}</Text>
          <Text style={styles.subtitle}>
            {mode === 'view' ? 'Check-in details' : 'Edit feedback'}
          </Text>

          {mode === 'view' ? (
            <>
              {/* ── Emoji display ── */}
              <View style={styles.emojiRow}>
                <Text style={styles.emojiLarge}>
                  {difficultyEmoji(difficultyRating)}
                </Text>
                {difficultyRating !== null && (
                  <Text style={styles.emojiLabel}>
                    {DIFFICULTY_OPTIONS.find(o => o.value === difficultyRating)?.label}
                  </Text>
                )}
              </View>

              {/* ── Notes — plain text on the card, no box ── */}
              {notes?.trim() ? (
                <Text style={styles.notesText}>{notes}</Text>
              ) : (
                <Text style={styles.noNotes}>No notes added.</Text>
              )}

              {/* ── Primary actions — only shown if not read-only ── */}
              {!readOnly && (
                <View style={styles.primaryActions}>
                  {isToday && (
                    <TouchableOpacity style={styles.undoBtn} onPress={onUndo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="arrow-u-left-top" size={16} color={Colors.danger} />
                        <Text style={styles.undoBtnText}>Undo check-in</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.editBtn} onPress={() => setMode('edit')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialCommunityIcons name="pencil-outline" size={16} color={Colors.white} />
                      <Text style={styles.editBtnText}>Edit feedback</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Discrete close link ── */}
              <TouchableOpacity style={styles.closeLink} onPress={onClose}>
                <Text style={styles.closeLinkText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* ── Difficulty selector ── */}
              <View style={styles.moodRow}>
                {DIFFICULTY_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.moodBtn, draftRating === opt.value && styles.moodBtnActive]}
                    onPress={() => setDraftRating(opt.value)}
                  >
                    <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                    <Text style={styles.moodLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Notes input ── */}
              <TextInput
                style={styles.notesInput}
                placeholder="Add notes (optional)…"
                placeholderTextColor={Colors.lightBrown}
                multiline
                value={draftNotes}
                onChangeText={setDraftNotes}
              />

              {/* ── Edit actions ── */}
              <View style={styles.primaryActions}>
                <TouchableOpacity style={styles.undoBtn} onPress={handleCancelEdit}>
                  <Text style={styles.undoBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={handleSave}>
                  <Text style={styles.editBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: Colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.md,
    },
    card: {
      backgroundColor: Colors.cardBg,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      width: '100%',
      maxWidth: 380,
      alignItems: 'center', // centers all card content
    },
    habitName: {
      fontSize: FontSize.lg,
      fontWeight: '700',
      color: Colors.darkBrown,
      textAlign: 'center',
      marginBottom: 2,
    },
    subtitle: {
      fontSize: FontSize.sm,
      color: Colors.lightBrown,
      textAlign: 'center',
      marginBottom: Spacing.md,
    },
    emojiRow: {
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    emojiLarge: {
      fontSize: 48,
    },
    emojiLabel: {
      fontSize: FontSize.sm,
      color: Colors.midBrown,
      fontWeight: '600',
      marginTop: 4,
    },
    // plain text notes — no box, sits naturally on the card
    notesText: {
      fontSize: FontSize.sm,
      color: Colors.darkBrown,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.sm,
    },
    // italic placeholder when no notes exist — same plain style
    noNotes: {
      fontSize: FontSize.sm,
      color: Colors.lightBrown,
      fontStyle: 'italic',
      textAlign: 'center',
      marginBottom: Spacing.md,
    },
    // centered row for the two primary action buttons
    primaryActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
      width: '100%',
    },
    // red outlined button
    undoBtn: {
      flex: 1,
      paddingVertical: Spacing.sm + 2,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.sm,
      borderWidth: 1.5,
      borderColor: '#cc3333',
      alignItems: 'center',
    },
    undoBtnText: {
      color: '#cc3333',
      fontWeight: '600',
      fontSize: FontSize.sm,
    },
    // solid green button
    editBtn: {
      flex: 1,
      paddingVertical: Spacing.sm + 2,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.sm,
      backgroundColor: Colors.primaryGreen,
      alignItems: 'center',
    },
    editBtnText: {
      color: Colors.white,
      fontWeight: '700',
      fontSize: FontSize.sm,
    },
    // discrete close — small muted text link, no border or fill
    closeLink: {
      marginTop: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    closeLinkText: {
      fontSize: FontSize.sm,
      color: Colors.lightBrown,
      textDecorationLine: 'underline',
    },
    // ── Edit mode styles ──
    moodRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    moodBtn: {
      alignItems: 'center',
      padding: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 2,
      borderColor: Colors.border,
      width: 84,
    },
    moodBtnActive: {
      borderColor: Colors.primaryGreen,
      backgroundColor: Colors.paleGreen,
    },
    moodEmoji: {
      fontSize: 28,
      marginBottom: 4,
    },
    moodLabel: {
      fontSize: FontSize.xs,
      color: Colors.midBrown,
      fontWeight: '600',
    },
    notesInput: {
      backgroundColor: Colors.inputBg,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.sm,
      minHeight: 80,
      width: '100%',
      fontSize: FontSize.sm,
      color: Colors.darkBrown,
      textAlignVertical: 'top',
      marginBottom: Spacing.md,
    },
  });