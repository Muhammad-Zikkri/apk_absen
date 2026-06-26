import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../utils/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
};

export default function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: 16,
    marginBottom: 10,
    shadowColor: COLORS.deepPurple,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
