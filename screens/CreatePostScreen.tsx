import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import Video from 'react-native-video';
import axios from 'axios';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { cloudinaryUploadPreset, cloudinaryUrl } from '../services/cloudinary';
import Screen from '../components/ui/Screen';
import Button from '../components/ui/Button';
import Surface from '../components/ui/Surface';
import { palette, spacing, typography } from '../theme/tokens';

type MediaAsset = Asset & { mediaType?: 'photo' | 'video' };

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

const CreatePostScreen: React.FC = ({ navigation }: any) => {
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [shareTarget, setShareTarget] = useState<'post' | 'story'>('post');

  const currentUser = auth.currentUser;

  const resolvedType = useMemo(() => {
    if (!media) {
      return 'image';
    }
    return media.type?.startsWith('video') || media.mediaType === 'video' ? 'video' : 'image';
  }, [media]);

  const handleSelectMedia = useCallback(async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'mixed', selectionLimit: 1 });
      if (result.didCancel) {
        return;
      }
      const asset = result.assets?.[0];
      if (asset) {
        setMedia(asset);
      }
    } catch (error) {
      console.error('Image picker error', error);
      Alert.alert('Error', 'Unable to access media library.');
    }
  }, []);

  const handleCreatePost = useCallback(async () => {
    if (!currentUser) {
      Alert.alert('Authentication required', 'Please sign in to create a post.');
      return;
    }
    if (!media || !media.uri) {
      Alert.alert('Select media', 'Pick an image or video to continue.');
      return;
    }
    if (!cloudinaryUrl || !cloudinaryUploadPreset) {
      Alert.alert('Missing configuration', 'Cloudinary credentials are not set.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      const file = {
        uri: media.uri,
        type: media.type ?? (resolvedType === 'video' ? 'video/mp4' : 'image/jpeg'),
        name: media.fileName ?? `upload-${Date.now()}`,
      } as any;
      formData.append('file', file);
      formData.append('upload_preset', cloudinaryUploadPreset);

      const cloudinaryResponse = await axios.post(cloudinaryUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const mediaUrl: string = cloudinaryResponse.data?.secure_url;
      if (!mediaUrl) {
        throw new Error('Missing media URL');
      }

      if (shareTarget === 'story') {
        await addDoc(collection(db, 'stories'), {
          userId: currentUser.uid,
          username: currentUser.displayName || 'Anonymous',
          userPhotoUrl: currentUser.photoURL || null,
          imageUrl: mediaUrl,
          mediaUrl,
          caption: caption.trim() || null,
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + STORY_TTL_MS),
        });
        Alert.alert('Story posted', 'Your story will be visible for 24 hours.');
      } else {
        await addDoc(collection(db, 'posts'), {
          userId: currentUser.uid,
          username: currentUser.displayName || 'Anonymous',
          mediaUrl,
          mediaType: resolvedType,
          caption: caption.trim(),
          createdAt: serverTimestamp(),
          likesCount: 0,
          commentsCount: 0,
        });
      }

      setMedia(null);
      setCaption('');
      setShareTarget('post');
      navigation?.goBack?.();
    } catch (error: any) {
      console.error('Error creating post', error);
      Alert.alert('Upload failed', error?.message ?? 'Could not upload media.');
    } finally {
      setUploading(false);
    }
  }, [caption, currentUser, media, navigation, resolvedType]);

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Post</Text>
      <View style={styles.modeSwitcher}>
        {(['post', 'story'] as const).map((option) => {
          const active = shareTarget === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.modeButton, active && styles.modeButtonActive]}
              onPress={() => setShareTarget(option)}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                {option === 'post' ? 'Post' : 'Story'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Button 
        label={media ? 'Change media' : 'Pick image / video'} 
        variant="secondary" 
        onPress={handleSelectMedia}
        icon={media ? 'swap-horizontal' : 'images'}
      />

      <Surface style={styles.previewWrapper} padding="md">
        {media?.uri ? (
          resolvedType === 'video' ? (
            <Video source={{ uri: media.uri }} style={styles.preview} resizeMode="cover" muted repeat />
          ) : (
            <Image source={{ uri: media.uri }} style={styles.preview} />
          )
        ) : (
          <View style={styles.previewPlaceholder}>
            <Text style={styles.placeholderText}>Your selection will appear here</Text>
          </View>
        )}
      </Surface>

      <TextInput
        style={styles.caption}
        placeholder="Say something about this moment"
        placeholderTextColor={palette.textMuted}
        value={caption}
        onChangeText={setCaption}
        multiline
      />

      <Button
        label={uploading ? (shareTarget === 'story' ? 'Posting story...' : 'Uploading...') : shareTarget === 'story' ? 'Share story' : 'Share post'}
        onPress={handleCreatePost}
        disabled={uploading}
        loading={uploading}
        icon="paper-plane"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.title,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceAlt,
    borderRadius: 999,
    padding: 4,
    alignSelf: 'flex-start',
  },
  modeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
  },
  modeButtonActive: {
    backgroundColor: palette.primary,
  },
  modeLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: palette.text,
  },
  modeLabelActive: {
    color: '#031418',
  },
  previewWrapper: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: palette.border,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: palette.surfaceAlt,
  },
  previewPlaceholder: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: palette.textMuted,
  },
  caption: {
    minHeight: 80,
    borderRadius: 16,
    padding: 16,
    backgroundColor: palette.surfaceAlt,
    color: palette.text,
    textAlignVertical: 'top',
  },
});

export default CreatePostScreen;