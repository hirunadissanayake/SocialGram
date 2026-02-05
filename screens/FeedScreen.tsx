import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
  increment,
  Unsubscribe,
  orderBy,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import Surface from '../components/ui/Surface';
import Avatar from '../components/ui/Avatar';
import StateView from '../components/ui/StateView';
import { palette, spacing } from '../theme/tokens';

type Post = {
  id: string;
  userId: string;
  username?: string;
  userPhotoUrl?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  caption?: string;
  createdAt?: Timestamp;
  likesCount?: number;
  commentsCount?: number;
};

type PostComment = {
  id: string;
  text: string;
  userId: string;
  createdAt?: Timestamp;
};

const chunk = (input: string[], size = 10) => {
  const result: string[][] = [];
  for (let i = 0; i < input.length; i += size) {
    result.push(input.slice(i, i + size));
  }
  return result;
};

const formatRelativeTime = (timestamp?: Timestamp) => {
  if (!timestamp) {
    return 'Just now';
  }
  const diff = Date.now() - timestamp.toMillis();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const FeedScreen: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { username?: string; photoUrl?: string }>>({});
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const friendsRef = collection(db, 'users', currentUser.uid, 'friends');
    const unsubscribe = onSnapshot(
      friendsRef,
      (snapshot) => {
        const ids = snapshot.docs.map((docSnap) => docSnap.id);
        setFriendIds(ids);
      },
      (error) => console.error('Error loading friends', error)
    );

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setPosts([]);
      setProfiles({});
      setLoading(false);
      return;
    }

    const lookup = new Map<string, Post>();
    const subscriptions: Unsubscribe[] = [];
    const ids = Array.from(new Set([currentUser.uid, ...friendIds]));

    if (ids.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    chunk(ids).forEach((bucket) => {
      const postsQuery = query(collection(db, 'posts'), where('userId', 'in', bucket));
      const unsub = onSnapshot(
        postsQuery,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              lookup.delete(change.doc.id);
              return;
            }
            const data = change.doc.data() as Omit<Post, 'id'>;
            lookup.set(change.doc.id, {
              ...data,
              id: change.doc.id,
            });
          });

          const ordered = Array.from(lookup.values()).sort((a, b) => {
            const first = b.createdAt?.toMillis() ?? 0;
            const second = a.createdAt?.toMillis() ?? 0;
            return first - second;
          });
          setPosts(ordered);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading posts', error);
          Alert.alert('Error', 'Unable to load feed right now.');
          setLoading(false);
        }
      );

      subscriptions.push(unsub);
    });

    return () => {
      subscriptions.forEach((unsub) => unsub());
    };
  }, [friendIds, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setProfiles({});
      return;
    }

    const ids = Array.from(new Set([currentUser.uid, ...friendIds]));
    if (ids.length === 0) {
      setProfiles({});
      return;
    }

    const subscriptions: Unsubscribe[] = [];
    chunk(ids).forEach((bucket) => {
      const profilesQuery = query(collection(db, 'users'), where(documentId(), 'in', bucket));
      const unsub = onSnapshot(
        profilesQuery,
        (snapshot) => {
          setProfiles((prev) => {
            const next = { ...prev };
            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data() as { username?: string; photoUrl?: string };
              next[docSnap.id] = {
                username: data.username,
                photoUrl: data.photoUrl,
              };
            });
            return next;
          });
        },
        (error) => console.error('Error loading profile info', error)
      );
      subscriptions.push(unsub);
    });

    return () => {
      subscriptions.forEach((unsub) => unsub());
    };
  }, [friendIds, currentUser]);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        currentUserId={currentUser?.uid ?? ''}
        profile={profiles[item.userId]}
        profiles={profiles}
      />
    ),
    [currentUser?.uid, profiles]
  );

  if (loading) {
    return <StateView title="Loading feed" loading />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>Follow friends to fill your feed.</Text>}
        contentContainerStyle={[styles.listContent, posts.length === 0 && styles.flexGrow]}
      />
    </View>
  );
};

type PostCardProps = {
  post: Post;
  currentUserId: string;
  profile?: { username?: string; photoUrl?: string };
  profiles?: Record<string, { username?: string; photoUrl?: string }>;
};

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, profile, profiles }) => {
  const [liked, setLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(post.caption ?? '');
  const [updatingCaption, setUpdatingCaption] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    const likeRef = doc(db, 'posts', post.id, 'likes', currentUserId);
    const unsubscribe = onSnapshot(likeRef, (snap) => setLiked(snap.exists()));
    return unsubscribe;
  }, [post.id, currentUserId]);

  useEffect(() => {
    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(3));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<PostComment, 'id'>;
        return { ...data, id: docSnap.id };
      });
      setComments(items);
    });
    return unsubscribe;
  }, [post.id]);

  useEffect(() => {
    setCaptionDraft(post.caption ?? '');
  }, [post.caption]);

  const toggleLike = useCallback(async () => {
    if (!currentUserId || likePending) {
      return;
    }

    setLikePending(true);
    try {
      await runTransaction(db, async (transaction) => {
        const likeRef = doc(db, 'posts', post.id, 'likes', currentUserId);
        const postRef = doc(db, 'posts', post.id);
        const likeDoc = await transaction.get(likeRef);

        if (likeDoc.exists()) {
          transaction.delete(likeRef);
          transaction.update(postRef, { likesCount: increment(-1) });
        } else {
          transaction.set(likeRef, {
            userId: currentUserId,
            createdAt: serverTimestamp(),
          });
          transaction.update(postRef, { likesCount: increment(1) });
        }
      });

      Animated.sequence([
        Animated.timing(likeScale, { toValue: 1.2, duration: 120, useNativeDriver: true }),
        Animated.spring(likeScale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } catch (error) {
      console.error('Error toggling like', error);
      Alert.alert('Error', 'Unable to update like right now.');
    } finally {
      setLikePending(false);
    }
  }, [currentUserId, likePending, likeScale, post.id]);

  const submitComment = useCallback(async () => {
    const trimmed = commentText.trim();
    if (!currentUserId || !trimmed || sendingComment) {
      return;
    }

    setSendingComment(true);

    try {
      const commentRef = doc(collection(db, 'posts', post.id, 'comments'));
      await runTransaction(db, async (transaction) => {
        transaction.set(commentRef, {
          text: trimmed,
          userId: currentUserId,
          createdAt: serverTimestamp(),
        });
        transaction.update(doc(db, 'posts', post.id), {
          commentsCount: increment(1),
        });
      });
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment', error);
      Alert.alert('Error', 'Unable to post comment right now.');
    } finally {
      setSendingComment(false);
    }
  }, [commentText, currentUserId, post.id, sendingComment]);

  const animatedCardStyle = useMemo(
    () => ({
      opacity: cardAnim,
      transform: [
        {
          scale: cardAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.95, 1],
          }),
        },
      ],
    }),
    [cardAnim]
  );

  const handleDeletePost = useCallback(async () => {
    if (post.userId !== currentUserId) {
      return;
    }
    setDeletingPost(true);
    try {
      await deleteDoc(doc(db, 'posts', post.id));
    } catch (error) {
      console.error('Failed to delete post', error);
      Alert.alert('Delete failed', 'Unable to delete this post right now.');
    } finally {
      setDeletingPost(false);
    }
  }, [currentUserId, post.id, post.userId]);

  const confirmDelete = useCallback(() => {
    Alert.alert('Delete post?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: handleDeletePost },
    ]);
  }, [handleDeletePost]);

  const handleSaveCaption = useCallback(async () => {
    if (post.userId !== currentUserId) {
      return;
    }
    const trimmed = captionDraft.trim();
    setUpdatingCaption(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        caption: trimmed,
        updatedAt: serverTimestamp(),
      });
      setEditModalVisible(false);
    } catch (error) {
      console.error('Failed to update caption', error);
      Alert.alert('Update failed', 'Unable to save your caption right now.');
    } finally {
      setUpdatingCaption(false);
    }
  }, [captionDraft, currentUserId, post.id, post.userId]);

  const openPostMenu = useCallback(() => {
    if (post.userId !== currentUserId) {
      Alert.alert('Not available', 'You can only manage your own posts.');
      return;
    }

    Alert.alert('Post options', undefined, [
      { text: 'Edit caption', onPress: () => setEditModalVisible(true) },
      { text: 'Delete post', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [confirmDelete, currentUserId, post.userId]);

  const displayName = profile?.username || post.username || 'Unknown user';
  const avatarUri = profile?.photoUrl || post.userPhotoUrl;

  return (
    <Animated.View style={animatedCardStyle}>
      <Surface style={styles.postCard} padding="lg">
        <View style={styles.postHeader}>
          <View style={styles.headerLeft}>
            <Avatar label={displayName} uri={avatarUri} size={42} />
            <View>
              <Text style={styles.postAuthor}>{displayName}</Text>
              <Text style={styles.timestamp}>{formatRelativeTime(post.createdAt)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={openPostMenu} disabled={deletingPost}>
            <Icon name="ellipsis-horizontal" size={20} color={palette.textMuted} />
          </TouchableOpacity>
        </View>

        {post.mediaUrl ? (
          post.mediaType === 'video' ? (
            <Video source={{ uri: post.mediaUrl }} style={styles.media} resizeMode="cover" />
          ) : (
            <Image source={{ uri: post.mediaUrl }} style={styles.media} />
          )
        ) : null}

        {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

        <View style={styles.postActions}>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <TouchableOpacity style={styles.actionRow} onPress={toggleLike} disabled={likePending}>
              <Icon 
                name={liked ? 'heart' : 'heart-outline'} 
                size={24} 
                color={liked ? palette.danger : palette.textMuted} 
              />
              <Text style={styles.countText}>{post.likesCount ?? 0}</Text>
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity style={styles.actionRow}>
            <Icon name="chatbubble-outline" size={22} color={palette.textMuted} />
            <Text style={styles.countText}>{post.commentsCount ?? 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow}>
            <Icon name="paper-plane-outline" size={22} color={palette.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment"
            placeholderTextColor={palette.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            editable={!sendingComment}
          />
          <TouchableOpacity onPress={submitComment} disabled={sendingComment} style={styles.sendButton}>
            <Icon name="send" size={18} color={sendingComment ? palette.textDisabled : palette.primary} />
          </TouchableOpacity>
        </View>

        {comments.map((comment) => (
          <View key={comment.id} style={styles.commentRow}>
            <Text style={styles.commentAuthor}>
              {comment.userId === currentUserId
                ? 'You'
                : profiles?.[comment.userId]?.username || 'Unknown user'}
            </Text>
            <Text style={styles.commentBody}>{comment.text}</Text>
          </View>
        ))}
      </Surface>

      <Modal visible={editModalVisible} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit caption</Text>
            <TextInput
              value={captionDraft}
              onChangeText={setCaptionDraft}
              multiline
              style={styles.modalInput}
              placeholder="Update your caption"
              placeholderTextColor={palette.textMuted}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} disabled={updatingCaption}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveCaption} disabled={updatingCaption}>
                <Text style={[styles.modalSave, updatingCaption && styles.disabledSend]}>
                  {updatingCaption ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  flexGrow: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: palette.textMuted,
  },
  postCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  postAuthor: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 16,
  },
  timestamp: {
    color: palette.textMuted,
    fontSize: 12,
  },
  media: {
    width: '100%',
    borderRadius: 14,
    aspectRatio: 1,
    backgroundColor: palette.surface,
  },
  caption: {
    color: palette.text,
    fontSize: 15,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionLabel: {
    color: palette.textMuted,
    fontSize: 18,
  },
  activeAction: {
    color: palette.primary,
  },
  countText: {
    color: palette.textMuted,
    fontSize: 14,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: palette.surfaceAlt,
    color: palette.text,
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledSend: {
    opacity: 0.5,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commentAuthor: {
    color: palette.accent,
    fontWeight: '600',
  },
  commentBody: {
    color: palette.text,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '600',
  },
  modalInput: {
    minHeight: 120,
    borderRadius: 12,
    backgroundColor: palette.surfaceAlt,
    padding: spacing.md,
    color: palette.text,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  modalCancel: {
    color: palette.textMuted,
    fontSize: 16,
  },
  modalSave: {
    color: palette.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FeedScreen;