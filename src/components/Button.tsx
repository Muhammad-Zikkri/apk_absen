import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { COLORS, BORDER_RADIUS } from '../utils/theme';

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'outline' | 'yellow';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: string;
};

const COLORS_MAP: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: COLORS.deepPurple, text: COLORS.white },
  success: { bg: COLORS.success, text: COLORS.white },
  warning: { bg: COLORS.warning, text: COLORS.deepPurpleDark },
  danger: { bg: COLORS.danger, text: COLORS.white },
  outline: { bg: 'transparent', text: COLORS.deepPurple },
  yellow: { bg: COLORS.brightYellow, text: COLORS.deepPurpleDark },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
}: Props) {
  const c = COLORS_MAP[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: c.bg },
        variant === 'outline' && styles.outline,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={c.text} />
      ) : (
        <Text style={[styles.text, { color: c.text }]}>
          {icon ? `${icon} ` : ''}{title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  outline: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
});
