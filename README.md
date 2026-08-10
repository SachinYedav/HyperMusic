# HyperMusic 2.0

[![React Native](https://img.shields.io/badge/React%20Native-0.86.0-0284c7?style=flat-square&logo=react)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-v57-000020?style=flat-square&logo=expo)](https://expo.dev)
[![Nitro Modules](https://img.shields.io/badge/Nitro%20Modules-C%2B%2B%20%7C%20HybridObject-brightgreen?style=flat-square)](https://github.com/mrousavy/react-native-nitro)
[![Platform](https://img.shields.io/badge/Platform-Android-blue?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

HyperMusic is an elite, ultra-high-performance music streaming client designed to deliver uncompromising audio playback, high-fidelity user interfaces, and direct zero-overhead streaming resolution exclusively for Android.

Unlike traditional React Native streaming applications that suffer from JavaScript bridge serialization bottlenecks and heavy web-scraping overhead, HyperMusic implements bespoke native C++ HybridObject engines for both extraction and playback. This allows direct native thread-pool execution for deep InnerTube JSON traversal, real-time taxonomy resolution, multi-tier audio unboxing, and gapless media playback—all without a single byte of data ever touching the legacy async bridge.

---

## 📥 Download & Quick Start

The fastest way to experience HyperMusic is to download the pre-compiled APK directly.

1. Go to the [Releases](../../releases/latest) page.
2. Download the **Universal APK** (`app-universal-release-signed.apk`) which works on all Android devices.
   *(Optional: You can also download architecture-specific splits like `arm64-v8a` if you know your device's architecture and want a smaller app size).*
3. Install the APK on your Android device and enjoy zero-overhead streaming!

---
## 📱 Key Features

HyperMusic is engineered from the ground up for power-users, prioritizing a purely local-first, premium experience.

- **Background Playback & Lockscreen Controls:** Powered by a fully custom native media engine (`react-native-hyper-player`) built on AndroidX Media3 (ExoPlayer), with deep `MediaSessionService` integration for Android 13/14+ foreground services, system notification controls, and hardware media key interception.
- **Zero-Click Offline Library:** Download your favorite tracks instantly as `.m4a` files for purely offline playback, fully indexed locally using Expo SQLite and MMKV for sub-millisecond retrieval.
- **Dynamic Real-Time Discovery:** Unlike static apps, the `Home` and `Explore` feeds scrape live InnerTube chip clouds and shelves dynamically, ensuring the catalog is always fresh.
- **High-Speed Robust Downloading:** Features a bespoke concurrent downloading engine (`hyper-downloader`) bounded by strict Kotlin Semaphores, ensuring parallel bulk downloads never crash or exhaust Android OS resources.
- **No Ads, Zero Telemetry:** A completely private, local-first streaming architecture.

---

## ✨ Core Engineering Architecture

### ⚡ 1. Zero-Serialization Extraction (`react-native-hyper-extractor`)
HyperMusic is powered by a custom internal native module built on top of **React Native Nitro Modules**.
- **C++ `HybridObject` Specs:** Exposes synchronous-like native Kotlin execution bindings directly to JavaScript/TypeScript.
- **Bulletproof Fallback Engine:** Features a highly resilient audio stream resolver utilizing NewPipe extraction cores. It dynamically shifts between target high-bitrate quality (`256kbps` / `128kbps`), M4A containers, and fallback audio streams to guarantee uninterrupted playback.
- **Custom Downloader & Network Layer:** Leverages a specialized OkHttp implementation with localized request headers, automated `visitorData` state persistence, and robust retry interceptors.

### 🎵 2. Native Media Engine (`react-native-hyper-player`)
A completely custom media playback engine—replacing all third-party player libraries—built with Nitro Modules and AndroidX Media3.
- **JSI Bridge:** Direct memory-access bindings from TypeScript to a native Singleton ExoPlayer instance. No JSON serialization, no async bridge overhead.
- **JIT Preloading:** Automatically resolves `hyper://` URIs, extracts stream URLs on a background IO thread, replaces them in the ExoPlayer playlist, and prefills 2MB into a local `SimpleCache` for gapless transitions.
- **Hot Stream Swapping:** Dynamically switches between audio-only and video streams at the exact millisecond marker without resetting the player queue.
- **Smart Logging:** Centralized `Logger.kt` utility that automatically silences all debug and info logs in production APKs via `BuildConfig.DEBUG`, preventing URL leakage and saving CPU cycles.

### 🌐 3. Dynamic Real-Time Taxonomy Scraping
HyperMusic rejects static, fragile fallback mapping tables.
- **`DynamicChipResolver`:** Dynamically scrapes InnerTube explore landing pages (`FEmusic_moods_and_genres`) and home feed chip clouds (`FEmusic_home`) to unbox real-time `browseIds` and parameter tuples on the fly.
- **`Parsers` Suite:** An extensive native JSON unboxing engine capable of deeply traversing complex flex-columns, immersive headers, microformats, and section list renderers into strongly typed TypeScript interfaces.

### 🎨 4. High-Fidelity Premium Aesthetics
The presentation layer is crafted with state-of-the-art modern interface standards:
- **Glassmorphic Surface Hierarchies:** Clean, translucent overlays with rich dark mode color tailoring.
- **Micro-Animations & Fluid Physics:** Responsive gesture handling, custom player bottom sheets, and seamless layout transitions.
- **Absolute Type Safety:** 100% strict TypeScript architecture across both application logic and native module contracts via Zustand global state.

---

## 🚀 Getting Started

### Prerequisites

Because HyperMusic utilizes deep C++ native bindings (Nitro Modules), a complete Android development environment is strictly required.

- **Node.js**: v22.13.x or higher
- **Package Manager**: NPM or Yarn
- **Android Studio & SDK**: API Level 34+
- **Android NDK & CMake**: Required for compiling Nitro C++ bindings on Windows/macOS.

### Installation & Build

```bash
# 1. Clone the repository
git clone https://github.com/SachinYedav/HyperMusic.git
cd HyperMusic

# 2. Install dependencies (including custom Nitro submodules)
npm install

# 3. Start the metro bundler
npm start

# 4. Build native binaries and run on Android
npm run android
```

---

## 🛠️ Crafted with Passion & Precision

This entire codebase—spanning the custom React Native frontend, the C++ Nitro Module bindings, the resilient OkHttp network layer, and the native Kotlin extraction engine—is the result of relentless hard work, countless iterations, and a deep passion for building an elite music client. We have heavily leveraged modern AI-assisted engineering tools to accelerate our development and push boundaries, but the core architecture, design decisions, and final polish come from dedicated human craftsmanship.

## 🐛 Maintenance & Future Roadmap

HyperMusic 2.0 represents a massive architectural shift and a complete rewrite of our core engines. Because this is an exceptionally large and complex codebase, there is always a chance of encountering hidden bugs or edge-case inconsistencies that we haven't noticed yet. 

If you encounter any issues, please report them! We are fully committed to continuously upgrading, debugging, and polishing this app. Our ultimate goal is to evolve HyperMusic into one of the most robust, advanced, and reliable streaming systems available, and we won't stop until we achieve that perfection.

---

## 📄 License

The original HyperMusic source code is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

HyperMusic also includes third-party open-source components under their own licenses. In particular, Android builds include NewPipe Extractor under GPL-3.0, so redistribution of built app binaries must satisfy the applicable GPL-3.0 source and notice obligations. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the in-app licenses screen for details.
