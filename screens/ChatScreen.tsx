import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	SafeAreaView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import {
	addDoc,
	collection,
	doc,
	limit,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	Timestamp,
	Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';

type ChatRouteParams = {
	Chat: {
		friendId: string;
		friendName: string;
	};
};

type Message = {
	id: string;
	senderId: string;
	type?: 'text' | 'audio' | 'video';
	text?: string;
	createdAt?: Timestamp;
};

const buildChatId = (a: string, b: string) => [a, b].sort().join('_');

const ChatScreen: React.FC = () => {
	const route = useRoute<RouteProp<ChatRouteParams, 'Chat'>>();
	const { friendId, friendName } = route.params ?? { friendId: '', friendName: 'Friend' };
	const currentUser = auth.currentUser;
	const [messages, setMessages] = useState<Message[]>([]);
	const [text, setText] = useState('');
	const [allowed, setAllowed] = useState(false);
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);

	const chatId = useMemo(() => {
		if (!currentUser || !friendId) {
			return '';
		}
		return buildChatId(currentUser.uid, friendId);
	}, [currentUser, friendId]);

	useEffect(() => {
		if (!currentUser || !friendId) {
			setAllowed(false);
			setLoading(false);
			return;
		}

		const myFriendRef = doc(db, 'users', currentUser.uid, 'friends', friendId);
		const theirFriendRef = doc(db, 'users', friendId, 'friends', currentUser.uid);

		const unsubscribers: Unsubscribe[] = [];
		let iAmFollowing = false;
		let theyFollowMe = false;

		unsubscribers.push(
			onSnapshot(myFriendRef, (snap) => {
				iAmFollowing = snap.exists();
				setAllowed(iAmFollowing && theyFollowMe);
			})
		);

		unsubscribers.push(
			onSnapshot(theirFriendRef, (snap) => {
				theyFollowMe = snap.exists();
				setAllowed(iAmFollowing && theyFollowMe);
			})
		);

		return () => {
			unsubscribers.forEach((unsub) => unsub());
		};
	}, [currentUser, friendId]);

	useEffect(() => {
		if (!chatId) {
			setLoading(false);
			return;
		}

		const messagesRef = collection(db, 'chats', chatId, 'messages');
		const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));
		const unsubscribe = onSnapshot(q, (snapshot) => {
			const data = snapshot.docs.map((docSnap) => {
				const payload = docSnap.data() as Partial<Message> & {
					audioPath?: string;
					videoPath?: string;
				};
				const inferredType: Message['type'] = payload.type
					? payload.type
					: payload.audioPath
					? 'audio'
					: payload.videoPath
					? 'video'
					: 'text';
				return {
					id: docSnap.id,
					senderId: payload.senderId ?? 'unknown',
					type: inferredType,
					text: payload.text,
					createdAt: payload.createdAt,
				};
			});
			setMessages(data);
			setLoading(false);
		});

		return unsubscribe;
	}, [chatId]);

	const sendTextMessage = useCallback(async () => {
		const trimmed = text.trim();
		if (!trimmed || !currentUser || !chatId || sending || !allowed) {
			return;
		}

		try {
			setSending(true);
			await addDoc(collection(db, 'chats', chatId, 'messages'), {
				senderId: currentUser.uid,
				type: 'text',
				text: trimmed,
				createdAt: serverTimestamp(),
			});
			setText('');
		} catch (error) {
			console.error('Unable to send message', error);
			Alert.alert('Error', 'Could not send your message.');
		} finally {
			setSending(false);
		}
	}, [allowed, chatId, currentUser, sending, text]);

	const renderItem = ({ item }: { item: Message }) => {
		const isMine = item.senderId === currentUser?.uid;
		const messageText = item.text?.trim().length
			? item.text
			: item.type && item.type !== 'text'
			? 'Media message not supported'
			: 'Message unavailable';
		return (
			<View style={[styles.bubbleRow, isMine ? styles.rowEnd : styles.rowStart]}>
				<View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleFriend]}>
					<Text style={[styles.bubbleText, !isMine && styles.bubbleTextFriend]}>{messageText}</Text>
				</View>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>{friendName}</Text>
					<Text style={styles.headerSubtitle}>{allowed ? 'You are connected' : 'Add each other as friends to chat'}</Text>
				</View>

				{loading ? (
					<View style={styles.loader}>
						<ActivityIndicator size="large" />
					</View>
				) : (
					<FlatList
						data={messages}
						inverted
						keyExtractor={(item) => item.id}
						renderItem={renderItem}
						contentContainerStyle={styles.listContent}
						ListEmptyComponent={<Text style={styles.emptyText}>Start the conversation</Text>}
					/>
				)}

				<View style={styles.inputWrapper}>
					<View style={styles.inputRow}>
						<TextInput
							style={styles.input}
							placeholder="Message..."
							placeholderTextColor="#8c8c8c"
							value={text}
							onChangeText={setText}
							editable={allowed && !sending}
						/>
						<TouchableOpacity
							style={[styles.sendButton, (!allowed || sending) && styles.disabledButton]}
							onPress={sendTextMessage}
							disabled={!allowed || sending}
						>
							<Text style={styles.sendLabel}>Send</Text>
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
			</SafeAreaView>
		);
	};

	const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#0f1419',
	},
	flex: {
		flex: 1,
	},
	header: {
		padding: 16,
	},
	headerTitle: {
		color: '#fff',
		fontSize: 22,
		fontWeight: '600',
	},
	headerSubtitle: {
		color: '#73859b',
		marginTop: 4,
	},
	loader: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	emptyText: {
		color: '#73859b',
		textAlign: 'center',
	},
	bubbleRow: {
		marginBottom: 12,
		flexDirection: 'row',
	},
	rowEnd: {
		justifyContent: 'flex-end',
	},
	rowStart: {
		justifyContent: 'flex-start',
	},
	bubble: {
		maxWidth: '80%',
		borderRadius: 18,
		paddingVertical: 10,
		paddingHorizontal: 14,
	},
	bubbleMine: {
		backgroundColor: '#2dd4bf',
		borderBottomRightRadius: 4,
	},
	bubbleFriend: {
		backgroundColor: '#151f28',
		borderBottomLeftRadius: 4,
	},
	bubbleText: {
		color: '#0f1419',
	},
	bubbleTextFriend: {
		color: '#d8e3f0',
	},
	inputWrapper: {
		padding: 16,
		gap: 8,
	},
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	input: {
		flex: 1,
		backgroundColor: '#151f28',
		borderRadius: 999,
		paddingHorizontal: 16,
		paddingVertical: 12,
		color: '#fff',
	},
	sendButton: {
		backgroundColor: '#2dd4bf',
		borderRadius: 999,
		paddingHorizontal: 18,
		paddingVertical: 12,
	},
	disabledButton: {
		opacity: 0.4,
	},
	sendLabel: {
		color: '#0f1419',
		fontWeight: '600',
	},
});

export default ChatScreen;
