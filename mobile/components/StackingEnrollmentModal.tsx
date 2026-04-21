import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const colors = {
  bg:           '#F7FAF5',
  card:         '#FFFFFF',
  sage:         '#7BAE7F',
  sageMid:      '#A8C5A0',
  sagePale:     '#E3F0E1',
  yellow:       '#F5E6A3',
  yellowDeep:   '#E8C84A',
  indigo:       '#3D3B8E',
  indigoPale:   '#EEEDF8',
  indigoMid:    '#6C63FF',
  textPrimary:  '#2B2D42',
  textSecondary:'#6B7280',
  border:       '#E4EDE2',
  shadow:       'rgba(61, 59, 142, 0.08)',
};

type Props = {
  visible: boolean;
  triggeringHabitNames: string[];
  onEnroll: () => void;
  onDismiss: () => void;
};

export default function StackingEnrollmentModal({
  visible,
  triggeringHabitNames,
  onEnroll,
  onDismiss,
}: Props) {
  const formatHabitNames = (names: string[]) => {
    if (names.length === 0) return 'some of your habits';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    const last = names[names.length - 1];
    const rest = names.slice(0, -1).join(', ');
    return `${rest}, and ${last}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      {/* dimmed backdrop */}
      <View style={styles.backdrop}>

        {/* modal card */}
        <View style={styles.card}>

          {/* yellow accent bar at top of card */}
          <View style={styles.accentBar} />

          <View style={styles.content}>

            {/* headline */}
            <Text style={styles.headline}>
              Ready to build better habits?
            </Text>

            {/* personalized subtext naming the struggling habits */}
            <Text style={styles.subtext}>
              It looks like you've been having some trouble staying consistent with{' '}
              <Text style={styles.habitNameHighlight}>
                {formatHabitNames(triggeringHabitNames)}
              </Text>
              . Habit stacking can help you focus on one habit at a time to build real consistency.
            </Text>

            {/* primary button */}
            <TouchableOpacity
              style={styles.enrollButton}
              onPress={onEnroll}
              activeOpacity={0.85}
            >
              <Text style={styles.enrollButtonText}>Let's do it</Text>
            </TouchableOpacity>

            {/* secondary dismiss button */}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissButtonText}>Not right now</Text>
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
    backgroundColor: colors.yellow,
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
  enrollButton: {
    backgroundColor: colors.sage,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  enrollButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissButtonText: {
    color: colors.indigoMid,
    fontSize: 15,
    fontWeight: '600',
  },
});