import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useTheme, FontSize, Radius, Spacing } from '@/constants/theme';

export type CheckInModalValue = {
  difficultyRating: number | null;
  notes: string;
};

type Props = {
  visible: boolean;
  initialDifficultyRating?: number | null;
  initialNotes?: string;
  onClose: () => void;
  onSave: (value: CheckInModalValue) => void;
};

export default function CheckInModal({
  visible,
  initialDifficultyRating = null,
  initialNotes = '',
  onClose,
  onSave,
}: Props) {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [difficultyRating, setDifficultyRating] = useState<number | null>(initialDifficultyRating);
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    if (visible) {
      setDifficultyRating(initialDifficultyRating);
      setNotes(initialNotes);
    }
  }, [visible, initialDifficultyRating, initialNotes]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>How did it go?</Text>

          <View style={styles.moodRow}>
            <TouchableOpacity
              style={[
                styles.moodBtn,
                difficultyRating === 1 && styles.moodBtnActive,
              ]}
              onPress={() => setDifficultyRating(1)}
            >
              <Text style={styles.moodEmoji}>😊</Text>
              <Text style={styles.moodLabel}>Easy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.moodBtn,
                difficultyRating === 2 && styles.moodBtnActive,
              ]}
              onPress={() => setDifficultyRating(2)}
            >
              <Text style={styles.moodEmoji}>🙂</Text>
              <Text style={styles.moodLabel}>Okay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.moodBtn,
                difficultyRating === 3 && styles.moodBtnActive,
              ]}
              onPress={() => setDifficultyRating(3)}
            >
              <Text style={styles.moodEmoji}>😓</Text>
              <Text style={styles.moodLabel}>Hard</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.notesInput}
            placeholder="Add notes (optional)…"
            placeholderTextColor={Colors.lightBrown}
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() =>
                onSave({
                  difficultyRating,
                  notes,
                })
              }
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.darkBrown,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
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
    fontSize: FontSize.sm,
    color: Colors.darkBrown,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.midGreen,
  },
  cancelBtnText: {
    color: Colors.primaryGreen,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  saveBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryGreen,
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
});