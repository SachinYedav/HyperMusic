# 🎧 react-native-hyper-player

[![Nitro Modules](https://img.shields.io/badge/Nitro%20Modules-C%2B%2B%20%7C%20Kotlin-brightgreen?style=flat-square)](https://github.com/mrousavy/react-native-nitro)
[![Platform](https://img.shields.io/badge/Platform-Android-blue?style=flat-square)]()

A heavily optimized, custom internal media engine for **HyperMusic**. 

We built this module to completely bypass the traditional React Native async bridge bottlenecks. By leveraging [Nitro Modules](https://github.com/mrousavy/react-native-nitro), we expose the native **AndroidX Media3 (ExoPlayer)** engine directly to JavaScript via high-performance C++ `HybridObject` bindings. 

The result? Zero-latency UI interactions, gapless playback, and a true native feel.

---

## 🏗️ System Architecture

To keep the codebase maintainable and scalable, the native Android module is split into several distinct domain-driven layers:

### 1. The Bridge (`HybridHyperPlayer`)
This is the JSI orchestration layer. It implements our `HyperPlayerSpec` and provides synchronous-like execution bindings to TypeScript (`play`, `pause`, `loadQueue`). 
- **SSOT (Single Source of Truth):** JS remains the absolute source of truth. Any hardware actions (like pressing next on Bluetooth headphones) are intercepted natively and bounced back to JS before state changes occur.
- **Queue Revisions:** Uses an epoch timestamp `queueRevision` to ensure the native queue and React state never drift out of sync.

### 2. The Engine (`PlayerControllerSingleton`)
The absolute core of the module. It manages a strict Singleton instance of `androidx.media3.exoplayer.ExoPlayer`.
- **Advanced JIT Preloading:** When the next track in the queue is a `hyper://` URI, the engine silently resolves the actual stream URL via `YouTubeMusicEngine` on a background IO thread, swaps the URI in the ExoPlayer playlist, and buffers 2MB of the track into the `SimpleCache`—guaranteeing gapless playback.
- **Infinite-Scroll Lookahead:** Evaluates the timeline (calculating `next`, `nextNext`, and `thirdIdx`) on every track transition to notify JS when it's time to fetch paginated data.
- **Hot Stream Swapping:** Allows dynamic swapping from an audio-only stream to a video stream (and vice versa) at the exact millisecond marker without resetting the queue.

### 3. Background Services (`HyperMediaSessionService`)
Handles Android 13/14+ background execution and OS-level lock-screen controls.
- **MediaSession Binding:** Fully integrates with `MediaSessionService` to keep playback alive when the app is backgrounded.
- **Custom System UI:** We use official Google Material XML drawables and `SessionCommand` bindings to force custom buttons (Shuffle, Repeat) to appear perfectly in the Android system notification tray.
- **ForwardingPlayer:** Wraps ExoPlayer to intercept hardware media keys and route them to JS.

### 4. UI Layer (`HyperVideoViewManager`)
A React Native UI Component that safely injects ExoPlayer's `SurfaceView` into the React layout tree for video playback.

### 5. Smart Logging (`Logger.kt`)
A centralized logging utility that automatically silences `Info` and `Debug` logs in production APKs (using `BuildConfig.DEBUG`), protecting against URL leakage and saving CPU cycles, while keeping critical stack traces intact for crash reporting.

---

## 🚀 Installation & Setup

Since this is an internal workspace module, it is pre-linked via Nitro.

```bash
# From the project root
npm install
```

---

## 📖 TypeScript API Usage

Import `HyperPlayer` directly to issue native commands:

```typescript
import { HyperPlayer } from 'react-native-hyper-player';

// 1. Queue Management
HyperPlayer.loadQueue([
  { id: '123', url: 'hyper://videoID?type=audio', title: 'Song', artist: 'Artist', artworkUrl: '...' }
], 0, 'off', false, Date.now());

// 2. Playback Control
HyperPlayer.play();
HyperPlayer.pause();
HyperPlayer.skipToNext();
HyperPlayer.seekTo(120000); // Seek to 2:00

// 3. Dynamic Hot-Swapping
HyperPlayer.switchToVideo();
HyperPlayer.switchToAudio();
```

---

## 🛠️ Design Philosophy

- **Zero Guesswork:** Native code never assumes state. It blindly follows JS commands and emits status back.
- **Performance First:** No JSON serialization. Direct memory access via JSI.
- **Fail-Safe:** Swipe-to-kill teardowns and Audio Focus loss are handled natively so the app never leaves ghost audio playing.

---
