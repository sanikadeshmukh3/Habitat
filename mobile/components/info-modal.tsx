import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

type InfoModalProps = {
  visible: boolean;
  title: string;
  description: string;
  onClose: () => void;
};

export default function InfoModal({
  visible,
  title,
  description,
  onClose,
}: InfoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>

          <Text style={styles.modalText}>{description}</Text>

          <Pressable style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  modalCard: {
    width: '100%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.overlay,
  },

  modalTitle: {
    fontSize: 24,
    color: Colors.primaryGreen,
    fontWeight: '700',
    marginBottom: 12,
  },

  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.darkBrown,
    marginBottom: 12,
  },

  modalButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: Colors.primaryGreen,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 100,
  },

  modalButtonText: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
  },

  helpPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(77,58,45,0.10)',
    marginTop: 1,
  },

  helpText: {
    color: Colors.darkBrown,
    fontSize: 14,
    fontWeight: '700',
  },
});