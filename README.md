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

## Features

- Email/password login & registration with Firestore user profiles
- Discover and follow friends (`users/{uid}/friends/{friendId}`)
- Feed with posts from self + friends, Cloudinary media, animated cards
- Create posts with mixed media, captions, real-time likes & comments counts
- One-to-one friend chat with live Firestore listeners
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

| Login | Feed | Chat |
| --- | --- | --- |
| _Add `screenshots/login.png`_ | _Add `screenshots/feed.png`_ | _Add `screenshots/chat.png`_ |

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

Ready for review! PRs welcome for performance tweaks or additional features (stories, push notifications, etc.).

