import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../utils/theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

export default function ConfirmDialog({
  visible, title, message, confirmText = 'Ya', cancelText = 'Batal',
  onConfirm, onCancel, destructive = false,
}: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.confirmBtn, destructive && styles.destructiveBtn]} onPress={onConfirm}>
            <Text style={[styles.confirmText, destructive && styles.destructiveText]}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,10,62,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  dialog: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: 24,
    width: '85%',
    maxWidth: 360,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  message: { fontSize: 14, color: COLORS.textGray, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textGray, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.deepPurple, alignItems: 'center' },
  confirmText: { color: COLORS.white, fontWeight: '600' },
  destructiveBtn: { backgroundColor: COLORS.danger },
  destructiveText: { color: COLORS.white },
});
