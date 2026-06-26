import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

type Props = {
  message: string;
  icon?: string;
};

export default function EmptyState({ message, icon = '📭' }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
