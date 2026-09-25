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

### 3. Native History Tracker (`NativeHistoryTracker`)
A native-side playback history system that guarantees history recording even when the app is backgrounded or the JS bridge is throttled by the OS.
- **Event-Driven Architecture:** Uses a native `Handler` on the main thread to measure 30 seconds of cumulative active playback per track. When the threshold is met, it fires a callback event that the JS side catches via `DeviceEventEmitter`.
- **Synchronous JSI Database Writes:** The JS listener (`PlayerEngineManager`) receives the native event and writes to SQLite using `db.runSync()` / `db.withTransactionSync()` through Expo SQLite's JSI layer. This bypasses the async bridge entirely, preventing history loss when Android suspends background JS promises.
- **Why Native?** The previous approach used `setInterval` on the JS side which stopped firing when Android suspended the JS thread in the background. By moving the timer to native, the interval runs on the Android main looper and is never affected by the React Native bridge lifecycle.

### 4. Background Services (`HyperMediaSessionService`)
Handles Android 13/14+ background execution and OS-level lock-screen controls.
- **MediaSession Binding:** Fully integrates with `MediaSessionService` to keep playback alive when the app is backgrounded.
- **Custom System UI:** We use official Google Material XML drawables and `SessionCommand` bindings to force custom buttons (Shuffle, Repeat) to appear perfectly in the Android system notification tray.
- **ForwardingPlayer:** Wraps ExoPlayer to intercept hardware media keys and route them to JS.

### 5. Home Screen Widgets (`widget/`)
A high-performance, battery-conscious native widget subsystem offering 5 distinct presentation variants:

| Variant | Layout | Description | Dynamic Colors |
|---------|:------:|-------------|:--------------:|
| **Classic** | 4×2 Card | Left-aligned 120×120dp artwork thumbnail, dynamic palette background bleed, adaptive text contrast, full controls | ✅ |
| **Pill** | 4×1 Lozenge | Ultra-compact floating pill with 48×48dp circular artwork, marquee title, palette capsule tint, play/pause action | ✅ |
| **Material You** | 4×2 Card | Full-bleed edge-to-edge album artwork, subtle rounded protective scrim overlay, brand badging, floating controls | ❌ |
| **Blurred Immersive** | 4×2 Card | Full-bleed Gaussian-blurred artwork backdrop, deep contrast scrimming, bold typography, compact controls | ❌ |
| **Search** | 4×2 Card | Compact now-playing media bar combined with an embedded interactive search bar that deep-links into in-app search | ✅ |

#### Architectural Rendering Strategy

- **Aspect Ratio & Edge-to-Edge Rounding:** Layout XMLs enforce `scaleType="centerCrop"` on artwork `ImageView`s to preserve native aspect ratios without horizontal distortion. Containers establish a strict 16dp Material curvature (`@drawable/widget_bg_rounded_dark` / `@drawable/widget_bg_rounded_tintable`) via `clipToOutline="true"` and `outlineProvider="background"`.
- **Graceful Fallback for OEM Launchers:** To guarantee smooth corner rounding on custom launchers (e.g., MIUI) that ignore outline clipping on `RemoteViews`, `WidgetArtworkPipeline.roundedCrop` bakes 16dp transparent corners directly into the bitmap pixel data via `BitmapShader` and `Canvas.drawRoundRect`.
- **Zero-Overhead Default State:** Idle playback states pass `artwork = null`, clearing the image icon to reveal lightweight, XML-native rounded placeholder shapes (`widget_artwork_placeholder_classic`, `circle_transparent_white`, `widget_artwork_placeholder_search`). This completely bypasses the bitmap decoding pipeline and disk I/O when player state is idle.
- **Conflated Asynchronous Queue:** `WidgetUpdateCoordinator` processes all system and playback triggers through a `Channel.CONFLATED` queue with a 150ms coalescing window, merging rapid back-to-back player events into single atomic render passes.
- **Hoisted Palette Extraction:** Palette generation via `androidx.palette` is hoisted outside the per-widget loop and cached across matching widget instances, executing at most once per render cycle.
- **Deterministic Swipe-Kill Teardown:** `HyperMediaSessionService.onTaskRemoved` resets the in-memory `WidgetStateRepository` and broadcasts `ACTION_RESET_WIDGETS`, triggering a synchronous `renderImmediately` pass to guarantee widgets return to idle defaults before process termination.
- **Ashmem IPC Transfer:** Bitmaps are compressed as WebP (`.webp`) to disk and transferred to `RemoteViews` using memory-mapped Ashmem via `Icon.createWithBitmap`, preventing `TransactionTooLargeException` failures.

#### Subsystem Components

- **`WidgetUpdateCoordinator`** — Application-scoped conflated rendering queue managing debounce intervals, style iteration, and teardown execution.
- **`WidgetRenderers`** — Deterministic renderers: in-memory state in, `RemoteViews` out. Each style implements `BaseRenderer` providing shared primitives (`setArtwork`, `setPlaybackIcon`, `attachControls`, `applyDynamicBackground`, `applyAdaptiveTextColors`).
- **`WidgetArtworkPipeline`** — Bounded bitmap pipeline with a 12MB LRU memory cache, SHA-256 keyed disk cache, and format decoding for HTTP, `content://`, and `file://` sources.
- **`WidgetPaletteExtractor`** — Extracts contrast-safe color swatches from artwork bitmaps using `androidx.palette`, ensuring WCAG AA readability for text on tinted cards.
- **`WidgetControlReceiver`** — Internal `BroadcastReceiver` that routes widget button taps to the active `MediaSession` via `MediaController`, falling back to app launch when idle.
- **`WidgetSizePolicy`** — Computes target pixel dimensions per widget style, dynamically adapting full-bleed cards to launcher horizontal widths while preserving fixed bounds for thumbnails.
- **`WidgetStateRepository`** — Single in-memory state holder (`MutableStateFlow<WidgetPlaybackSnapshot>`) that naturally resets on process death.

### 6. UI Layer (`HyperVideoViewManager`)
A React Native UI Component that safely injects ExoPlayer's `SurfaceView` into the React layout tree for video playback.

### 7. Smart Logging (`Logger.kt`)
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
- **Native-First Background Work:** Critical tasks (history tracking, widget rendering) run on native threads, never relying on the JS bridge staying alive.

---
