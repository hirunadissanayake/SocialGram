<div align="center">
	<img src="assets/images/app-logo.png" width="220" alt="SocialGram logo" />
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
- Lottie for branded loading moments

## Features

- Email/password login & registration with Firestore user profiles
- Discover and follow friends (`users/{uid}/friends/{friendId}`)
- Feed with posts from self + friends, Cloudinary media, animated cards
- Create posts with mixed media, captions, real-time likes & comments counts
- One-to-one friend chat with live Firestore listeners and lightweight text messaging
- Instagram-style Stories tray with captions, per-user slides, and real-time Firestore sync
- Like button micro-interactions + card fade/scale animations
- Animated SocialGram splash while authentication state loads
- Minimalist original UI crafted for both Android & iOS

## Loading Experience

- Root navigator shows the SocialGram animated logo (Lottie) while Firebase auth initializes, giving users a branded splash before tabs mount.
- Feed screen reuses the same animation during feed refreshes for a cohesive loading story.

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

<div align="center">
	<table>
		<tr>
			<td><img src="assets/mobile%20ui%20ss/photo_2_2026-02-10_04-00-36.jpg" width="220" alt="Login screen" /><br /><sub>Login</sub></td>
			<td><img src="assets/mobile%20ui%20ss/photo_1_2026-02-10_04-00-36.jpg" width="220" alt="Register screen" /><br /><sub>Register</sub></td>
			<td><img src="assets/mobile%20ui%20ss/photo_7_2026-02-10_04-00-36.jpg" width="220" alt="Feed screen one" /><br /><sub>Feed 1</sub></td>
			<td><img src="assets/mobile%20ui%20ss/photo_8_2026-02-10_04-00-36.jpg" width="220" alt="Feed screen two" /><br /><sub>Feed 2</sub></td>
		</tr>
		<tr>
			<td><img src="assets/mobile%20ui%20ss/photo_2026-02-10_04-20-36.jpg" width="220" alt="Story modal one" /><br /><sub>Stories 1</sub></td>
			<td><img src="assets/mobile%20ui%20ss/photo_2026-02-10_04-20-57.jpg" width="220" alt="Story modal two" /><br /><sub>Stories 2</sub></td>
			<td><img src="assets/mobile%20ui%20ss/photo_6_2026-02-10_04-00-36.jpg" width="220" alt="Friends screen" /><br /><sub>Friends</sub></td>
			<td><img src="assets/mobile%20ui%20ss/photo_5_2026-02-10_04-00-36.jpg" width="220" alt="Chat screen" /><br /><sub>Chat</sub></td>
		</tr>
		<tr>
			<td><img src="assets/mobile%20ui%20ss/photo_3_2026-02-10_04-00-36.jpg" width="220" alt="Create post screen" /><br /><sub>Create Post</sub></td>
			<td><img src="assets/mobile%20ui%20ss/photo_4_2026-02-10_04-00-36.jpg" width="220" alt="Profile screen" /><br /><sub>Profile</sub></td>
		</tr>
	</table>
</div>

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



