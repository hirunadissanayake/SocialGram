import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { palette, radii, spacing, typography } from '../../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  icon?: string;
};

const variantStyles: Record<ButtonVariant, { backgroundColor: string; textColor: string; borderColor?: string }> = {
  primary: {
    backgroundColor: palette.primary,
    textColor: '#031418',
  },
  secondary: {
    backgroundColor: palette.surfaceAlt,
    textColor: palette.text,
  },
  ghost: {
    backgroundColor: 'transparent',
    textColor: palette.text,
    borderColor: palette.border,
  },
};

const Button: React.FC<Props> = ({ label, onPress, loading, disabled, variant = 'primary', style, icon }) => {
  const styles = StyleSheet.create({
    base: {
      height: 52,
      borderRadius: radii.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderWidth: variant === 'ghost' ? 1 : 0,
      borderColor: variantStyles[variant].borderColor,
      backgroundColor: variantStyles[variant].backgroundColor,
      opacity: disabled ? 0.5 : 1,
    },
    label: {
      ...typography.body,
      fontWeight: '600',
      color: variantStyles[variant].textColor,
    },
  });

  return (
    <TouchableOpacity style={[styles.base, style]} onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].textColor} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon && <Icon name={icon} size={20} color={variantStyles[variant].textColor} />}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default Button;
