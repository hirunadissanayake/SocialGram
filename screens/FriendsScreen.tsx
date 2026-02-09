import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Surface from '../components/ui/Surface';
import StateView from '../components/ui/StateView';
import { auth, db } from '../services/firebase';
import { palette, spacing } from '../theme/tokens';
import { RootStackParamList } from '../types/navigation';

type AppUser = {
  uid: string;
  username?: string;
  email?: string;
  photoUrl?: string;
};

const FriendsScreen: React.FC = () => {
  const currentUser = auth.currentUser;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [people, setPeople] = useState<AppUser[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const usersRef = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const list: AppUser[] = snapshot.docs
          .filter((docSnap) => docSnap.id !== currentUser.uid)
          .map((docSnap) => {
            const data = docSnap.data() as Omit<AppUser, 'uid'>;
            return { ...data, uid: docSnap.id };
          });
        setPeople(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching users', error);
        Alert.alert('Error', 'Unable to load people right now.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const friendsRef = collection(db, 'users', currentUser.uid, 'friends');
    const unsubscribe = onSnapshot(
      friendsRef,
      (snapshot) => {
        const next: Record<string, boolean> = {};
        snapshot.forEach((docSnap) => {
          next[docSnap.id] = true;
        });
        setFollowingMap(next);
      },
      (error) => console.error('Error subscribing to friends', error)
    );

    return unsubscribe;
  }, [currentUser]);

  const addFriend = useCallback(
    async (friendId: string) => {
      if (!currentUser || followingMap[friendId]) {
        return;
      }

      try {
        const friendRef = doc(db, 'users', currentUser.uid, 'friends', friendId);
        await setDoc(friendRef, {
          friendId,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error adding friend', error);
        Alert.alert('Error', 'Could not add friend. Please try again.');
      }
    },
    [currentUser, followingMap]
  );

  const emptyState = useMemo(() => !loading && people.length === 0, [loading, people.length]);

  const insetStyle = {
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.safeArea, insetStyle]} edges={['top', 'right', 'bottom', 'left']}>
        <StateView title="Please sign in" description="Create an account to discover friends." />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, insetStyle]} edges={['top', 'right', 'bottom', 'left']}>
        <StateView title="Loading friends" loading />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, insetStyle]} edges={['top', 'right', 'bottom', 'left']}>
      <View style={[styles.container, { paddingBottom: spacing.lg + insets.bottom }]}>
        <FlatList
          data={people}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => {
            const isFollowing = !!followingMap[item.uid];
            return (
              <Surface style={styles.card} padding="lg">
                <View style={styles.cardLeft}>
                  <Avatar label={item.username || item.email || 'U'} uri={item.photoUrl} size={48} />
                  <View>
                    <Text style={styles.username}>{item.username || 'Unknown user'}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Button
                    label={isFollowing ? 'Following' : 'Follow'}
                    variant={isFollowing ? 'secondary' : 'primary'}
                    onPress={() => addFriend(item.uid)}
                    disabled={isFollowing}
                    style={styles.followButton}
                    icon={isFollowing ? 'checkmark-circle' : 'person-add'}
                  />
                  <Button
                    label="Chat"
                    variant="ghost"
                    onPress={() =>
                      navigation.navigate('Chat', {
                        friendId: item.uid,
                        friendName: item.username || 'Friend',
                      })
                    }
                    icon="chatbubble-outline"
                  />
                </View>
              </Surface>
            );
          }}
          ListEmptyComponent={emptyState ? <Text style={styles.emptyText}>No other users yet.</Text> : null}
          contentContainerStyle={people.length === 0 ? styles.flexGrow : undefined}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  username: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 16,
  },
  email: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  emptyText: {
    color: palette.textMuted,
    textAlign: 'center',
  },
  flexGrow: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
  followButton: {
    minWidth: 120,
  },
});

export default FriendsScreen;
