# hyper-downloader

[![Expo Modules](https://img.shields.io/badge/Expo%20Modules-Kotlin-brightgreen?style=flat-square)](https://docs.expo.dev/modules/)
[![Platform](https://img.shields.io/badge/Platform-Android-blue?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)]()

`hyper-downloader` is a dedicated, internal Expo Native Module engineered specifically for the HyperMusic client. It bypasses standard JavaScript background transfer bottlenecks and rigid OS throttling by utilizing high-performance native OkHttp network interceptors and Kotlin Coroutines, bound directly to the Expo Modules runtime engine.

---

## 📌 Architecture & Core Mechanics

The module is divided into three highly optimized native subsystems, designed to ensure fault-tolerant media extraction from complex CDNs:

### 1. Expo Modules Bridge (`HyperDownloaderModule.kt`)
The native integration layer implements the modern Expo Modules API definition. It exposes high-performance asynchronous execution bindings to JavaScript/TypeScript while strictly offloading heavy disk I/O and network transfer workloads to a dedicated `Dispatchers.IO` background thread pool.

### 2. Resilient Transfer Engine (`OkHttpNetworkInterceptor`)
Handles direct audio chunk retrieval via specialized OkHttp configurations.
- **Bot-Throttling Bypass:** Employs a custom OkHttp `NetworkInterceptor` to ensure legitimate desktop headers (`User-Agent`, `Referer: https://www.youtube.com/`, `Connection: keep-alive`) are dynamically preserved across complex HTTP 301/302 redirect hops common in media CDNs.
- **Fault-Tolerant Resumption:** Before initiating a transfer, the engine inspects local storage (`targetFile.exists()`). If a partial file is found, it automatically calculates `bytesWritten` to resume the download safely, saving bandwidth and recovery time.

### 3. Concurrency & Throttling Controller
Prevents OS resource exhaustion, network starvation, and React Native bridge congestion during high-frequency bulk download operations (e.g., saving an entire playlist offline).
- **`Semaphore(2)` Concurrency Cap:** Kotlin's `Semaphore` is explicitly utilized to bound active concurrent background file transfers to exactly 2 jobs. Excess tasks remain securely in a `QUEUED` state until bandwidth frees up.
- **Event Throttling:** Buffers native progress calculations and sends aggregated `onDownloadProgress` and `onDownloadStateChanged` events to the JavaScript runtime, keeping the Metro bridge completely clear of micro-congestion.

---

## 🚀 Installation & Build

Because this is a bespoke internal module within the HyperMusic workspace, it relies on Expo Autolinking (`expo-module.config.json`) and does not require external NPM publication.

```bash
# Ensure dependencies are installed and native Android bridges are registered
npm install

# Rebuild native Android binaries
npx expo run:android
```

---

## 📖 TypeScript API & Execution Flow

Import the wrapper functions directly from the source to execute native download routines.

### 1. Initiating & Managing Downloads
```typescript
import {
  startNativeDownload,
  pauseNativeDownload,
  resumeNativeDownload,
  cancelNativeDownload
} from '../../../../modules/hyper-downloader/src';

// Initiate a robust native download task
startNativeDownload(
  'track_123',
  'https://rr1---sn-cx5vx...googlevideo.com/videoplayback?...',
  'Epic Orchestral Suite',
  'track_123.m4a'
);

// Manage execution state safely
pauseNativeDownload('track_123');
resumeNativeDownload('track_123', null);
cancelNativeDownload('track_123');
```

### 2. State & Progress Monitoring
The module emits strictly typed states (`QUEUED`, `DOWNLOADING`, `PAUSED`, `COMPLETED`, `FAILED`) to ensure the JavaScript UI remains perfectly synchronized with the native thread.

```typescript
import {
  addDownloadProgressListener,
  addDownloadStateListener
} from '../../../../modules/hyper-downloader/src';

// Monitor exact byte transfers
addDownloadProgressListener((event) => {
  const { id, bytesWritten, totalBytes } = event;
  console.log(`[PROGRESS] ${id}: ${bytesWritten} / ${totalBytes} bytes`);
});

// React to lifecycle events
addDownloadStateListener((event) => {
  const { id, state, error, finalUri } = event;
  console.log(`[STATE] ${id} transitioned to ${state}`, error || finalUri);
});
```

> **Note on Persistence:** Downloaded `.m4a` audio files are flushed directly to the device's persistent storage layer. The exact path is returned in the `finalUri` payload upon the `COMPLETED` state emission, making it immediately available for local SQLite indexing and offline playback.

---

## 🛡️ Error Handling & Telemetry

All native execution failures are wrapped in descriptive payloads and emitted safely to TypeScript via `onDownloadStateChanged`.

Underlying native execution logs can be monitored directly via Logcat using the `HyperDownloaderModule` tag for deep debugging:
```bash
adb logcat -s "HyperDownloaderModule"
```

---

## 📄 License
MIT License.
