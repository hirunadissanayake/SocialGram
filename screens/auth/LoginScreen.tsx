import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { AuthStackParamList } from '../../types/navigation';
import Screen from '../../components/ui/Screen';
import Button from '../../components/ui/Button';
import { palette, spacing, typography } from '../../theme/tokens';

const logo = require('../../assets/images/app-logo.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isDisabled = useMemo(() => submitting || !email.trim() || password.length < 6, [submitting, email, password]);

  const handleLogin = useCallback(async () => {
    if (isDisabled) {
      Alert.alert('Missing Info', 'Email and password are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to sign in right now.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, isDisabled]);

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.heroContainer}>
        <View style={styles.hero}>
          <Image source={logo} accessibilityLabel="SocialGram logo" style={styles.logo} />
          <Text style={styles.brand}>SocialGram</Text>
          <Text style={styles.subtitle}>Welcome back! Sign in to continue.</Text>
        </View>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={palette.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={palette.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button label="Sign In" onPress={handleLogin} disabled={isDisabled} loading={submitting} icon="log-in" />
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.secondaryAction}>New here? Create an account</Text>
      </TouchableOpacity>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: spacing.xl,
  },
  heroContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  hero: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  logo: {
    width: 170,
    height: 170,
    borderRadius: 44,
    marginTop: 20,
  },
  brand: {
    ...typography.title,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    ...typography.subtitle,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: palette.text,
    fontSize: 16,
  },
  secondaryAction: {
    textAlign: 'center',
    color: palette.accent,
    fontSize: 15,
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
  },
});

export default LoginScreen;