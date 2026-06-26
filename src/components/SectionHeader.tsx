import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

type Props = {
  title: string;
  onBack: () => void;
};

export default function SectionHeader({ title, onBack }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backBtn}>← Kembali</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    fontSize: 16,
    color: COLORS.deepPurple,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
});
