import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	KeyboardAvoidingView,
	Modal,
	PermissionsAndroid,
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
import Icon from 'react-native-vector-icons/Ionicons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Video from 'react-native-video';
import VoiceBubble from '../components/VoiceBubble';
import { Camera, useCameraDevice, type VideoFile } from 'react-native-vision-camera';

type ChatRouteParams = {
	Chat: {
		friendId: string;
		friendName: string;
	};
};

type Message = {
	id: string;
	senderId: string;
	type: 'text' | 'audio' | 'video';
	text?: string;
	audioPath?: string;
	videoPath?: string;
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
	const audioRecorderPlayer = useMemo(() => new AudioRecorderPlayer(), []);
	const [isRecordingAudio, setIsRecordingAudio] = useState(false);
	const [recordingHint, setRecordingHint] = useState<string | null>(null);
	const device = useCameraDevice('back');
	const cameraRef = useRef<Camera | null>(null);
	const [cameraVisible, setCameraVisible] = useState(false);
	const [cameraReady, setCameraReady] = useState(false);
	const [isRecordingVideo, setIsRecordingVideo] = useState(false);

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
				const payload = docSnap.data() as Partial<Message>;
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
					audioPath: payload.audioPath,
					videoPath: payload.videoPath,
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

	const sendAudioMessage = useCallback(
		async (uri: string) => {
			if (!uri || !currentUser || !chatId || !allowed) {
				return;
			}
			try {
				await addDoc(collection(db, 'chats', chatId, 'messages'), {
					senderId: currentUser.uid,
					type: 'audio',
					audioPath: uri,
					createdAt: serverTimestamp(),
				});
			} catch (error) {
				console.error('Unable to send audio message', error);
				Alert.alert('Error', 'Could not send your voice note.');
			}
		},
		[allowed, chatId, currentUser]
	);

	const sendVideoMessage = useCallback(
		async (uri: string) => {
			if (!uri || !currentUser || !chatId || !allowed) {
				return;
			}
			try {
				await addDoc(collection(db, 'chats', chatId, 'messages'), {
					senderId: currentUser.uid,
					type: 'video',
					videoPath: uri,
					createdAt: serverTimestamp(),
				});
			} catch (error) {
				console.error('Unable to send video message', error);
				Alert.alert('Error', 'Could not send your video.');
			}
		},
		[allowed, chatId, currentUser]
	);

	const ensureAudioPermission = useCallback(async () => {
		if (Platform.OS === 'android') {
			const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
				title: 'Microphone permission',
				message: 'SocialGram needs access to your microphone to record voice messages.',
				buttonPositive: 'Allow',
			});
			return granted === PermissionsAndroid.RESULTS.GRANTED;
		}
		const status = await Camera.getMicrophonePermissionStatus();
		if (status === 'authorized') {
			return true;
		}
		const result = await Camera.requestMicrophonePermission();
		return result === 'authorized';
	}, []);

	const ensureCameraPermissions = useCallback(async () => {
		let cameraStatus = await Camera.getCameraPermissionStatus();
		if (cameraStatus !== 'authorized') {
			cameraStatus = await Camera.requestCameraPermission();
		}
		let micStatus = await Camera.getMicrophonePermissionStatus();
		if (micStatus !== 'authorized') {
			micStatus = await Camera.requestMicrophonePermission();
		}
		return cameraStatus === 'authorized' && micStatus === 'authorized';
	}, []);

	const handleAudioLongPress = useCallback(async () => {
		if (!allowed || !chatId || isRecordingAudio) {
			return;
		}
		const permitted = await ensureAudioPermission();
		if (!permitted) {
			Alert.alert('Permission needed', 'Enable microphone access to send voice notes.');
			return;
		}
		try {
			setRecordingHint('Recording voice message…');
			setIsRecordingAudio(true);
			await audioRecorderPlayer.startRecorder();
		} catch (error) {
			console.error('Unable to start audio recording', error);
			setIsRecordingAudio(false);
			setRecordingHint(null);
		}
	}, [allowed, audioRecorderPlayer, chatId, ensureAudioPermission, isRecordingAudio]);

	const handleAudioPressOut = useCallback(async () => {
		if (!isRecordingAudio) {
			return;
		}
		try {
			const uri = await audioRecorderPlayer.stopRecorder();
			audioRecorderPlayer.removeRecordBackListener();
			setIsRecordingAudio(false);
			setRecordingHint(null);
			if (uri) {
				await sendAudioMessage(uri);
			}
		} catch (error) {
			console.error('Unable to stop audio recording', error);
			setIsRecordingAudio(false);
			setRecordingHint(null);
		}
	}, [audioRecorderPlayer, isRecordingAudio, sendAudioMessage]);

	const handleVideoLongPress = useCallback(async () => {
		if (!allowed || !chatId || isRecordingVideo) {
			return;
		}
		if (!device) {
			Alert.alert('Camera unavailable', 'No camera device is available on this phone.');
			return;
		}
		const granted = await ensureCameraPermissions();
		if (!granted) {
			Alert.alert('Permission needed', 'Enable camera permissions to send video messages.');
			return;
		}
		setRecordingHint('Recording video message…');
		setCameraVisible(true);
	}, [allowed, chatId, device, ensureCameraPermissions, isRecordingVideo]);

	const handleVideoPressOut = useCallback(async () => {
		if (isRecordingVideo) {
			try {
				await cameraRef.current?.stopRecording();
			} catch (error) {
				console.error('Unable to stop video recording', error);
				setCameraVisible(false);
				setIsRecordingVideo(false);
				setRecordingHint(null);
			}
		} else if (cameraVisible) {
			setCameraVisible(false);
			setRecordingHint(null);
		}
	}, [cameraVisible, isRecordingVideo]);

	const handleCameraInitialized = useCallback(() => {
		setCameraReady(true);
	}, []);

	useEffect(() => {
		if (!cameraVisible) {
			setCameraReady(false);
		}
	}, [cameraVisible]);

	useEffect(() => {
		if (!cameraVisible || !cameraReady || !device || isRecordingVideo) {
			return;
		}
		let cancelled = false;
		const startRecording = async () => {
			try {
				setIsRecordingVideo(true);
				await cameraRef.current?.startRecording({
					flash: 'off',
					fileType: 'mp4',
					onRecordingFinished: async (video: VideoFile) => {
						if (cancelled) {
							return;
						}
						setIsRecordingVideo(false);
						setCameraVisible(false);
						setRecordingHint(null);
						if (video?.path) {
							await sendVideoMessage(video.path);
						}
					},
					onRecordingError: (error) => {
						if (cancelled) {
							return;
						}
						console.error('Video recording error', error);
						setIsRecordingVideo(false);
						setCameraVisible(false);
						setRecordingHint(null);
						Alert.alert('Camera error', 'Unable to record video right now.');
					},
				});
			} catch (error) {
				if (cancelled) {
					return;
				}
				console.error('Unable to start video recording', error);
				setIsRecordingVideo(false);
				setCameraVisible(false);
				setRecordingHint(null);
				Alert.alert('Camera error', 'Unable to record video right now.');
			}
		};
		startRecording();
		return () => {
			cancelled = true;
		};
	}, [cameraReady, cameraVisible, device, isRecordingVideo, sendVideoMessage]);

	const renderItem = ({ item }: { item: Message }) => {
		const isMine = item.senderId === currentUser?.uid;
		return (
			<View style={[styles.bubbleRow, isMine ? styles.rowEnd : styles.rowStart]}>
				{item.type === 'audio' && item.audioPath ? (
					<VoiceBubble uri={item.audioPath} isMine={isMine} />
				) : item.type === 'video' && item.videoPath ? (
					<VideoBubble uri={item.videoPath} isMine={isMine} />
				) : (
					<View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleFriend]}>
						<Text style={[styles.bubbleText, !isMine && styles.bubbleTextFriend]}>{item.text}</Text>
					</View>
				)}
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
						<TouchableOpacity
							style={[styles.iconAction, (!allowed || sending) && styles.disabledButton]}
							onLongPress={handleAudioLongPress}
							onPressOut={handleAudioPressOut}
							delayLongPress={150}
							disabled={!allowed}
						>
							<Icon name={isRecordingAudio ? 'mic' : 'mic-outline'} size={22} color="#fff" />
						</TouchableOpacity>
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
						<TouchableOpacity
							style={[styles.iconAction, (!allowed || !device) && styles.disabledButton]}
							onLongPress={handleVideoLongPress}
							onPressOut={handleVideoPressOut}
							delayLongPress={150}
							disabled={!allowed || !device}
						>
							<Icon name={isRecordingVideo ? 'videocam' : 'videocam-outline'} size={22} color="#fff" />
						</TouchableOpacity>
					</View>
					{recordingHint ? (
						<View style={styles.recordingHint}>
							<View style={styles.recordDot} />
							<Text style={styles.recordingHintText}>{recordingHint}</Text>
						</View>
					) : null}
				</View>
				<Modal visible={cameraVisible} transparent animationType="fade" onRequestClose={() => setCameraVisible(false)}>
					<View style={styles.cameraModalBackdrop}>
						<View style={styles.cameraModalContent}>
							{device ? (
								<Camera
									ref={(ref) => {
										cameraRef.current = ref;
									}}
									style={styles.cameraPreview}
									device={device}
									isActive={cameraVisible}
									video
									audio
									photo={false}
									preset="medium"
									onInitialized={handleCameraInitialized}
								/>
							) : (
								<View style={styles.cameraFallback}>
									<Text style={styles.cameraFallbackText}>Camera unavailable</Text>
								</View>
							)}
							<Text style={styles.cameraHint}>{isRecordingVideo ? 'Recording…' : 'Preparing camera'}</Text>
						</View>
					</View>
				</Modal>
			</KeyboardAvoidingView>
			</SafeAreaView>
	);
};

type VideoBubbleProps = {
	uri: string;
	isMine: boolean;
};

const VideoBubble: React.FC<VideoBubbleProps> = ({ uri, isMine }) => {
	const [playing, setPlaying] = useState(false);

	return (
		<TouchableOpacity
			style={[styles.videoBubble, isMine ? styles.videoBubbleMine : styles.videoBubbleFriend]}
			onPress={() => setPlaying((prev) => !prev)}
			activeOpacity={0.85}
		>
			<Video
				source={{ uri }}
				style={styles.videoBubbleVideo}
				resizeMode="cover"
				repeat
				paused={!playing}
			/>
			{!playing ? (
				<View style={styles.videoOverlay}>
					<Icon name="play" size={28} color="#fff" />
					<Text style={styles.videoOverlayText}>Tap to play</Text>
				</View>
			) : null}
		</TouchableOpacity>
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
	iconAction: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#151f28',
		alignItems: 'center',
		justifyContent: 'center',
	},
	disabledButton: {
		opacity: 0.4,
	},
	sendLabel: {
		color: '#0f1419',
		fontWeight: '600',
	},
	recordingHint: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 6,
	},
	recordDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#ef4444',
	},
	recordingHintText: {
		color: '#ef4444',
		fontSize: 12,
		fontWeight: '600',
	},
	cameraModalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	cameraModalContent: {
		width: '80%',
		aspectRatio: 1,
		borderRadius: 24,
		overflow: 'hidden',
		backgroundColor: '#000',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
	cameraPreview: {
		width: '100%',
		height: '85%',
	},
	cameraHint: {
		color: '#fff',
		fontSize: 14,
	},
	cameraFallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cameraFallbackText: {
		color: '#fff',
	},
	videoBubble: {
		width: 96,
		height: 96,
		borderRadius: 48,
		overflow: 'hidden',
		position: 'relative',
	},
	videoBubbleMine: {
		backgroundColor: '#2dd4bf',
	},
	videoBubbleFriend: {
		backgroundColor: '#151f28',
	},
	videoBubbleVideo: {
		width: '100%',
		height: '100%',
	},
	videoOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 6,
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	videoOverlayText: {
		color: '#fff',
		fontWeight: '600',
	},
});

export default ChatScreen;
