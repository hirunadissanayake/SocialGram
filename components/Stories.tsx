import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Avatar from './ui/Avatar';
import { palette, spacing } from '../theme/tokens';

export type StoryItem = {
  id: string;
  imageUrl: string;
  caption?: string;
  createdAtMs?: number;
};

export type StoryAuthor = {
  userId: string;
  username: string;
  avatar?: string | null;
  stories: StoryItem[];
};

type Props = {
  authors: StoryAuthor[];
  currentUserId?: string | null;
  onDeleteStory?: (storyId: string) => Promise<void> | void;
};

const STORY_DURATION_MS = 5000;

const Stories: React.FC<Props> = ({ authors, currentUserId, onDeleteStory }) => {
  const [activeAuthorIndex, setActiveAuthorIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [deletingStory, setDeletingStory] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const activeAuthor = useMemo(
    () => (activeAuthorIndex !== null ? authors[activeAuthorIndex] : null),
    [activeAuthorIndex, authors]
  );
  const activeStory = useMemo(() => activeAuthor?.stories[activeStoryIndex] ?? null, [activeAuthor, activeStoryIndex]);

  const closeStory = useCallback(() => {
    setActiveAuthorIndex(null);
    setActiveStoryIndex(0);
  }, []);

  const advanceStory = useCallback(() => {
    if (activeAuthorIndex === null) {
      return;
    }

    const author = authors[activeAuthorIndex];
    if (!author) {
      closeStory();
      return;
    }

    const nextStoryIndex = activeStoryIndex + 1;
    if (nextStoryIndex < author.stories.length) {
      setActiveStoryIndex(nextStoryIndex);
      return;
    }

    const nextAuthorIndex = activeAuthorIndex + 1;
    if (nextAuthorIndex >= authors.length) {
      closeStory();
      return;
    }

    setActiveAuthorIndex(nextAuthorIndex);
    setActiveStoryIndex(0);
  }, [activeAuthorIndex, activeStoryIndex, authors, closeStory]);

  useEffect(() => {
    if (!activeStory) {
      progress.stopAnimation();
      progress.setValue(0);
      setImageLoading(false);
      setImageFailed(false);
      setDeletingStory(false);
      return;
    }

    setImageFailed(false);
    setImageLoading(true);
    setDeletingStory(false);

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION_MS,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        advanceStory();
      }
    });

    return () => {
      animation.stop();
    };
  }, [activeStory?.id, advanceStory, progress]);

  useEffect(() => {
    if (activeAuthorIndex === null) {
      return;
    }
    if (activeAuthorIndex >= authors.length) {
      closeStory();
      return;
    }
    const author = authors[activeAuthorIndex];
    if (!author || author.stories.length === 0) {
      closeStory();
    }
  }, [activeAuthorIndex, authors, closeStory]);

  const handleClose = useCallback(() => {
    closeStory();
  }, [closeStory]);

  const confirmDelete = useCallback(() => {
    if (!activeStory || !activeAuthor) {
      return;
    }
    if (!onDeleteStory || activeAuthor.userId !== currentUserId || deletingStory) {
      return;
    }

    Alert.alert('Delete story?', 'This will remove it for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setDeletingStory(true);
          Promise.resolve(onDeleteStory(activeStory.id))
            .then(() => closeStory())
            .catch((error) => console.error('Failed to delete story', error))
            .finally(() => setDeletingStory(false));
        },
      },
    ]);
  }, [activeAuthor, activeStory, closeStory, currentUserId, deletingStory, onDeleteStory]);

  const openStory = useCallback((index: number) => {
    setActiveAuthorIndex(index);
    setActiveStoryIndex(0);
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  const renderItem: ListRenderItem<StoryAuthor> = useCallback(
    ({ item, index }) => (
      <TouchableOpacity style={styles.storyItem} onPress={() => openStory(index)} activeOpacity={0.8}>
        <Avatar uri={item.avatar ?? undefined} label={item.username} size={64} />
        <Text numberOfLines={1} style={styles.storyName}>
          {item.username}
        </Text>
      </TouchableOpacity>
    ),
    [openStory]
  );

  if (!authors.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={authors}
        renderItem={renderItem}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={activeAuthorIndex !== null && !!activeStory}
        animationType="fade"
        onRequestClose={handleClose}
        transparent
      >
        <View style={styles.modalBackdrop}>
          {activeStory ? (
            <View style={styles.modalContent}> 
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <View style={styles.modalHeader}>
                <View style={styles.modalUser}>
                  <Avatar
                    uri={activeAuthor?.avatar ?? undefined}
                    label={activeAuthor?.username || '?'}
                    size={40}
                  />
                  <View>
                    <Text style={styles.modalUsername}>{activeAuthor?.username}</Text>
                    <Text style={styles.modalMeta}>
                      {activeStoryIndex + 1} / {activeAuthor?.stories.length ?? 1}
                    </Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  {activeAuthor?.userId === currentUserId && onDeleteStory ? (
                    <TouchableOpacity
                      onPress={confirmDelete}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={deletingStory}
                      style={styles.iconButton}
                    >
                      <Icon name="ellipsis-horizontal" size={26} color="#fff" />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={styles.storyBody} activeOpacity={1} onPress={advanceStory}>
                <Image
                  key={`${activeStory.id}-${activeStory.imageUrl}`}
                  source={{ uri: activeStory.imageUrl }}
                  style={styles.storyImage}
                  resizeMode="cover"
                  onLoad={() => setImageLoading(false)}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageFailed(true);
                  }}
                />
                {imageLoading ? (
                  <View style={styles.loaderOverlay}>
                    <ActivityIndicator color="#fff" size="large" />
                  </View>
                ) : null}
                {imageFailed ? (
                  <View style={styles.loaderOverlay}>
                    <Text style={styles.errorText}>Story failed to load</Text>
                  </View>
                ) : null}
                {activeStory.caption ? (
                  <View style={styles.captionContainer}>
                    <Text style={styles.captionText}>{activeStory.caption}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  storyItem: {
    alignItems: 'center',
    width: 76,
    gap: spacing.xs,
  },
  storyName: {
    color: palette.text,
    fontSize: 12,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-start',
  },
  modalContent: {
    flex: 1,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  modalHeader: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  modalUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  storyBody: {
    flex: 1,
    marginTop: spacing.xl,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  storyImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  captionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  captionText: {
    color: '#fff',
    fontSize: 16,
  },
});
export default Stories;
