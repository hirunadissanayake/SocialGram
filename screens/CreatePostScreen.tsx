import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import Video from 'react-native-video';
import axios from 'axios';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { cloudinaryUploadPreset, cloudinaryUrl } from '../services/cloudinary';
import Screen from '../components/ui/Screen';
import Button from '../components/ui/Button';
import Surface from '../components/ui/Surface';
import { palette, spacing, typography } from '../theme/tokens';

type MediaAsset = Asset & { mediaType?: 'photo' | 'video' };

const CreatePostScreen: React.FC = ({ navigation }: any) => {
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

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

      setMedia(null);
      setCaption('');
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
        label={uploading ? 'Uploading...' : 'Share'}
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