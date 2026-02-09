import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../services/firebase';
import AuthStack from './AuthStack';
import AppTabs from './AppTabs';
import ChatScreen from '../screens/ChatScreen';
import { RootStackParamList } from '../types/navigation';
import { palette } from '../theme/tokens';
import LottieView from 'lottie-react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe; // Unsubscribe on component unmount
  }, []);

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <LottieView
          source={require('../assets/animations/SocialGram Animated Logo.json')}
          autoPlay
          loop
          style={styles.splashAnimation}
        />
        <Text style={styles.splashText}>Loading your feed…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator
          screenOptions={{
            headerTintColor: palette.text,
            headerStyle: { backgroundColor: palette.background },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="AppTabs" component={AppTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({ title: route.params.friendName })}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: palette.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  splashAnimation: {
    width: 220,
    height: 220,
  },
  splashText: {
    marginTop: 24,
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
