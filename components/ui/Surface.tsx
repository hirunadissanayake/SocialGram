import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { palette, radii, spacing, shadows } from '../../theme/tokens';

type Props = ViewProps & {
  padding?: keyof typeof spacing;
  elevated?: boolean;
};

const Surface: React.FC<Props> = ({ children, style, padding = 'lg', elevated = false, ...rest }) => {
  return (
    <View
      style={[
        styles.base,
        elevated && shadows.soft,
        { padding: spacing[padding] },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 0.5,
    borderColor: palette.borderLight,
  },
});

export default Surface;
