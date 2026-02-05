import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import Screen from '../components/ui/Screen';
import Surface from '../components/ui/Surface';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { auth, db } from '../services/firebase';
import { cloudinaryUploadPreset, cloudinaryUrl } from '../services/cloudinary';
import { palette, spacing, typography } from '../theme/tokens';

const ProfileScreen: React.FC = () => {
  const user = auth.currentUser;
  const [username, setUsername] = useState(user?.displayName || 'Explorer');
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.photoURL ?? null);
  const [bio, setBio] = useState('');
  const [stats, setStats] = useState({ posts: 0, friends: 0 });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      if (!user) {
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, 'users', user.uid));
        if (snapshot.exists() && mounted) {
          setUsername(snapshot.data()?.username || user.displayName || 'Explorer');
          setPhotoUrl(snapshot.data()?.photoUrl || null);
          setBio(snapshot.data()?.bio || '');
        }
      } catch (error) {
        console.error('Failed to load profile', error);
      }
    };

    const fetchStats = async () => {
      if (!user) {
        return;
      }
      try {
        const [postsCount, friendsCount] = await Promise.all([
          getCountFromServer(query(collection(db, 'posts'), where('userId', '==', user.uid))),
          getCountFromServer(collection(db, 'users', user.uid, 'friends')),
        ]);
        if (mounted) {
          setStats({
            posts: postsCount.data().count,
            friends: friendsCount.data().count,
          });
        }
      } catch (error) {
        console.error('Failed to load stats', error);
      }
    };

    fetchProfile();
    fetchStats();
    return () => {
      mounted = false;
    };
  }, [user]);

  const initials = useMemo(() => username?.charAt(0) ?? '?', [username]);

  const handleSelectAvatar = useCallback(async () => {
    if (!user) {
      return;
    }

    if (!cloudinaryUrl || !cloudinaryUploadPreset) {
      Alert.alert('Missing configuration', 'Cloudinary credentials are not set.');
      return;
    }

    try {
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
      if (result.didCancel) {
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Selection error', 'Unable to read the selected image.');
        return;
      }

      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type ?? 'image/jpeg',
        name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
      } as any);
      formData.append('upload_preset', cloudinaryUploadPreset);

      const response = await axios.post(cloudinaryUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const nextUrl: string | undefined = response.data?.secure_url;
      if (!nextUrl) {
        throw new Error('Upload succeeded but no URL was returned.');
      }

      await updateDoc(doc(db, 'users', user.uid), { photoUrl: nextUrl });
      setPhotoUrl(nextUrl);
    } catch (error) {
      console.error('Avatar upload failed', error);
      Alert.alert('Upload failed', 'Unable to update your profile photo right now.');
    } finally {
      setUploadingPhoto(false);
    }
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) {
      return;
    }
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { bio: bio.trim() });
      Alert.alert('Profile updated', 'Your bio has been saved.');
    } catch (error) {
      console.error('Failed to save profile', error);
      Alert.alert('Save failed', 'Unable to save your changes right now.');
    } finally {
      setSavingProfile(false);
    }
  }, [bio, user]);

  if (!user) {
    return (
      <Screen>
        <Text style={{ color: palette.text }}>Sign in to view your profile.</Text>
      </Screen>
    );
  }

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <Surface elevated padding="xl" style={styles.headerCard}>
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            onPress={handleSelectAvatar}
            activeOpacity={0.8}
            style={styles.avatarTap}
            disabled={uploadingPhoto}
          >
            <Avatar label={initials} uri={photoUrl} size={96} />
            {uploadingPhoto ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </TouchableOpacity>
          <Text style={styles.changePhoto}>{uploadingPhoto ? 'Uploading…' : 'Change photo'}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{username}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </Surface>

      <Surface padding="lg" style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.posts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.friends}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Icon name="heart" size={24} color={palette.danger} />
          <Text style={styles.statLabel}>Activity</Text>
        </View>
      </Surface>

      <Surface padding="lg" style={styles.aboutCard}>
        <Text style={styles.sectionTitle}>About you</Text>
        <TextInput
          style={styles.bioInput}
          placeholder="Share a short bio"
          placeholderTextColor={palette.textMuted}
          value={bio}
          onChangeText={setBio}
          multiline
        />
        <Button
          label={savingProfile ? 'Saving…' : 'Save profile'}
          onPress={handleSaveProfile}
          disabled={savingProfile}
        />
      </Surface>

      <Button label="Log out" variant="secondary" onPress={() => signOut(auth)} icon="log-out-outline" />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
  },
  changePhoto: {
    marginTop: spacing.xs,
    color: palette.accent,
    fontSize: 13,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headerText: {
    flex: 1,
  },
  name: {
    ...typography.title,
    fontSize: 24,
  },
  email: {
    ...typography.caption,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '600',
  },
  statLabel: {
    color: palette.textMuted,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: palette.border,
    marginHorizontal: spacing.lg,
  },
  aboutCard: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '600',
  },
  bioInput: {
    ...typography.body,
    minHeight: 100,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 14,
    padding: spacing.md,
    color: palette.text,
    textAlignVertical: 'top',
  },
});

export default ProfileScreen;
