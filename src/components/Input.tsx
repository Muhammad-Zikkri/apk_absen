import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { COLORS, BORDER_RADIUS } from '../utils/theme';

type Props = TextInputProps & {
  label?: string;
};

export default function Input({ label, style, ...props }: Props) {
  return (
    <View style={styles.group}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={COLORS.textLight}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    backgroundColor: COLORS.inputBg,
    fontSize: 15,
    color: COLORS.textDark,
  },
});
