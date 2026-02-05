import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { palette, spacing } from '../../theme/tokens';

type Props = {
  title: string;
  description?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

const StateView: React.FC<Props> = ({ title, description, loading, actionLabel, onAction }) => {
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator color={palette.primary} size="large" /> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel ? (
        <Button label={actionLabel} onPress={onAction || (() => {})} variant="secondary" />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    color: palette.textMuted,
    textAlign: 'center',
  },
});

export default StateView;
