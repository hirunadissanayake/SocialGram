import React, { useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { AuthStackParamList } from '../../types/navigation';
import Screen from '../../components/ui/Screen';
import Button from '../../components/ui/Button';
import { palette, spacing, typography } from '../../theme/tokens';

const logo = require('../../assets/images/app-logo.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isDisabled = useMemo(() => {
    return (
      submitting ||
      !username.trim() ||
      !email.trim() ||
      password.length < 6 ||
      confirmPassword !== password
    );
  }, [username, email, password, confirmPassword, submitting]);

  const handleRegister = useCallback(async () => {
    if (isDisabled) {
      setError('Please fill all fields and ensure passwords match.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = credential.user;

      await updateProfile(user, { displayName: username.trim() });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        username: username.trim(),
        bio: '',
        photoUrl: '',
        createdAt: serverTimestamp(),
      });

      navigation.replace('Login');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, username, navigation, isDisabled]);

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.heroContainer}>
        <View style={styles.hero}>
          <Image source={logo} accessibilityLabel="SocialGram logo" style={styles.logo} />
          <Text style={styles.brand}>Join SocialGram</Text>
          <Text style={styles.subtitle}>Create an account to start sharing moments.</Text>
        </View>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={palette.textMuted}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={palette.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={palette.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={palette.textMuted}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button label="Create Account" onPress={handleRegister} disabled={isDisabled} loading={submitting} icon="person-add" />
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.secondaryAction}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: spacing.xl,
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

export default RegisterScreen;