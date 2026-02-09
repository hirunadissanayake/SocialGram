<div align="center">
  <h1>SocialGram</h1>
	<p>A React Native CLI social app with sharp UI, Firebase-first backend, Cloudinary-powered media.</p>
</div>

## Overview

SocialGram is a lightweight social network experience that demonstrates production-style patterns: secure email/password authentication, profile onboarding, friend graph construction, Cloudinary media uploads, and real-time Firestore reads for feed, likes, comments, and chat.

## Tech Stack

- React Native CLI (TypeScript) + React Navigation
- Firebase Authentication & Cloud Firestore (v9 modular SDK)
- Cloudinary for media storage, `axios` for uploads
- `react-native-image-picker`, `react-native-video`, Animated API
- `react-native-audio-recorder-player` for voice notes
- `react-native-vision-camera` for in-app video capture

## Features

- Email/password login & registration with Firestore user profiles
- Discover and follow friends (`users/{uid}/friends/{friendId}`)
- Feed with posts from self + friends, Cloudinary media, animated cards
- Create posts with mixed media, captions, real-time likes & comments counts
- One-to-one friend chat with live Firestore listeners, voice notes, and video replies
- Instagram-style Stories tray with captions, per-user slides, and real-time Firestore sync
- Tap/hold mic to record & send audio clips (using `react-native-audio-recorder-player`)
- Hold the camera button to capture/share square video messages (VisionCamera + `react-native-video` playback)
- Like button micro-interactions + card fade/scale animations
- Minimalist original UI crafted for both Android & iOS

## Firestore Data Model

- `users/{uid}` → `{ uid, email, username, createdAt }`
- `users/{uid}/friends/{friendId}` → `{ friendId, createdAt }`
- `posts/{postId}` → `{ userId, username, mediaUrl, mediaType, caption, createdAt, likesCount, commentsCount }`
- `posts/{postId}/likes/{userId}` → `{ userId, createdAt }`
- `posts/{postId}/comments/{commentId}` → `{ userId, text, createdAt }`
- `chats/{chatId}/messages/{messageId}` → `{ senderId, text, createdAt }`

## Setup (Android)

1. **Requirements**: Android Studio + SDK 34, Java 17, Node 18+, Watchman (macOS), Yarn or npm.
2. **Install dependencies**:
	```sh
	yarn install
	```
3. **Environment**: copy `.env.example` → `.env` and fill Firebase + Cloudinary values (see below).
4. **Start Metro**:
	```sh
	yarn start
	```
5. **Run on device / emulator**:
	```sh
	yarn android
	```
6. Use `adb reverse tcp:8081 tcp:8081` if running on a physical device without USB debugging helpers.

## Environment Variables

Create `.env` in the project root:

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
CLOUDINARY_URL=https://api.cloudinary.com/v1_1/<cloudName>/auto/upload
CLOUDINARY_UPLOAD_PRESET=
```

> Load env vars via `react-native-config` or Babel inline; `services/firebase.ts` and `services/cloudinary.ts` already consume these exports.

## Screenshots


## Original UI Notes

- Dark palette with teal + coral accents for clear brand identity.
- Layouts avoid Instagram clones: rounded cards, breathable spacing, and simple typography.
- Animations kept subtle (card fade/scale, like bounce) to remain performant on low-end Android devices.

## Useful Scripts

| Script | Description |
| --- | --- |
| `yarn start` | Start Metro bundler |
| `yarn android` | Build & launch on Android |
| `yarn test` | Run Jest suite |
| `npx react-native start --reset-cache --port 8082` | Useful when port 8081 is taken |

## Media Messaging Notes

- **Permissions**: Voice/video recording request microphone + camera. On Android 12+, accept prompts or enable manually in Settings.
- **Voice notes**: Long-press the mic icon beside the composer, release to send. Playback uses a custom `VoiceBubble` component with waveform + timer.
- **Video clips**: Long-press the cam icon to open VisionCamera, hold to capture a square MP4, tap bubble to play in-place inside a circular preview.

## Stories How-To

- Stories live under `stories/{storyId}` documents containing `userId`, `imageUrl`, `caption`, `createdAt`, and `expiresAt`.
- Users can toggle Post/Story inside Create Post; Story uploads expire after 24h and immediately show in the horizontal tray with modal playback.
- Tapping your own story reveals a menu to delete it from Firestore.

Ready for review! PRs welcome for performance tweaks or additional features (stories, push notifications, etc.).

