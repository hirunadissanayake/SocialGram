import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View, ViewProps } from 'react-native';
import { palette, spacing } from '../../theme/tokens';

type Props = ViewProps & {
  scrollable?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

const Screen: React.FC<Props> = ({ children, scrollable, style, contentContainerStyle, ...rest }) => {
  if (scrollable) {
    return (
      <ScrollView
        style={[styles.base, style]}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        {...rest}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.base, styles.content, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
});

export default Screen;
