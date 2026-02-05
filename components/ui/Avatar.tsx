import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { palette } from '../../theme/tokens';

type Props = {
  uri?: string | null;
  label?: string;
  size?: number;
};

const getGradientForLabel = (label: string): [string, string] => {
  const gradients: [string, string][] = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#30cfd0', '#330867'],
  ];
  const index = label.charCodeAt(0) % gradients.length;
  return gradients[index];
};

const Avatar: React.FC<Props> = ({ uri, label = '?', size = 48 }) => {
  const initials = useMemo(() => label.trim().slice(0, 2).toUpperCase(), [label]);
  const [startColor, endColor] = useMemo(() => getGradientForLabel(label), [label]);

  if (uri) {
    return (
      <Image 
        source={{ uri }} 
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} 
      />
    );
  }

  return (
    <LinearGradient
      colors={[startColor, endColor]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}
    > 
      <Text style={[styles.initials, { fontSize: size / 2.5 }]}>{initials}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.borderLight,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.borderLight,
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default Avatar;
