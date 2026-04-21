import api from '@/lib/api';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const colors = {
  bg:            '#F7FAF5',
  card:          '#FFFFFF',
  sage:          '#7BAE7F',
  sageMid:       '#A8C5A0',
  sagePale:      '#E3F0E1',
  yellow:        '#F5E6A3',
  yellowDeep:    '#E8C84A',
  indigo:        '#3D3B8E',
  indigoPale:    '#EEEDF8',
  indigoMid:     '#6C63FF',
  textPrimary:   '#2B2D42',
  textSecondary: '#6B7280',
  border:        '#E4EDE2',
  shadow:        'rgba(61, 59, 142, 0.08)',
};

type Props = {
  visible: boolean;
  completedHabitName: string;
  nextHabitName: string;
  nextEntryId: string;
  onActivated: () => void;
  onSnoozed: () => void;
};

export default function StackingActivationModal({
  visible,
  completedHabitName,
  nextHabitName,
  nextEntryId,
  onActivated,
  onSnoozed,
}: Props) {
  const [loading, setLoading] = useState(false);

  // calls POST /stacking/accept to activate the next habit in the queue
  const handleActivate = async () => {
    setLoading(true);
    try {
      await api.post('/stacking/accept', { entryId: nextEntryId });
      onActivated();
    } catch (error) {
      console.error('Error activating habit:', error);
    } finally {
      setLoading(false);
    }
  };

  // calls POST /stacking/snooze to delay the suggestion by 5 days
  const handleSnooze = async () => {
    setLoading(true);
    try {
      await api.post('/stacking/snooze', { entryId: nextEntryId });
      onSnoozed();
    } catch (error) {
      console.error('Error snoozing activation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onSnoozed}
    >
      {/* dimmed backdrop */}
      <View style={styles.backdrop}>

        {/* modal card */}
        <View style={styles.card}>

          {/* yellow accent bar */}
          <View style={styles.accentBar} />

          <View style={styles.content}>

            {/* headline */}
            <Text style={styles.headline}>You're on a roll! 🎉</Text>

            {/* personalized subtext naming both habits */}
            <Text style={styles.subtext}>
              You've built great consistency with{' '}
              <Text style={styles.habitNameHighlight}>{completedHabitName}</Text>
              . Ready to add{' '}
              <Text style={styles.habitNameHighlight}>{nextHabitName}</Text>
              {' '}to your routine?
            </Text>

            {/* primary activation button */}
            <TouchableOpacity
              style={styles.activateButton}
              onPress={handleActivate}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.card} />
              ) : (
                <Text style={styles.activateButtonText}>
                  Activate {nextHabitName}
                </Text>
              )}
            </TouchableOpacity>

            {/* secondary snooze button */}
            <TouchableOpacity
              style={styles.snoozeButton}
              onPress={handleSnooze}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.snoozeButtonText}>Not yet</Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  accentBar: {
    height: 5,
    backgroundColor: colors.yellowDeep,
    width: '30%',
    alignSelf: 'center',
    borderRadius: 10,
    marginTop: 12,
  },
  content: {
    padding: 28,
    paddingBottom: 40,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.indigo,
    textAlign: 'center',
    marginBottom: 14,
  },
  subtext: {
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  habitNameHighlight: {
    fontWeight: '700',
    color: colors.indigo,
  },
  activateButton: {
    backgroundColor: colors.sage,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  activateButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
  snoozeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  snoozeButtonText: {
    color: colors.indigoMid,
    fontSize: 15,
    fontWeight: '600',
  },
});