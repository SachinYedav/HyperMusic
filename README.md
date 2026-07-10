# HyperMusic

[![React Native](https://img.shields.io/badge/React%20Native-0.85.3-0284c7?style=flat-square&logo=react)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-v56-000020?style=flat-square&logo=expo)](https://expo.dev)
[![Nitro Modules](https://img.shields.io/badge/Nitro%20Modules-C%2B%2B%20%7C%20HybridObject-brightgreen?style=flat-square)](https://github.com/mrousavy/react-native-nitro)
[![Platform](https://img.shields.io/badge/Platform-Android-blue?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

HyperMusic is an elite, ultra-high-performance music streaming client designed to deliver uncompromising audio playback, high-fidelity user interfaces, and direct zero-overhead streaming resolution exclusively for Android.

Unlike traditional React Native streaming applications that suffer from JavaScript bridge serialization bottlenecks and heavy web-scraping overhead, HyperMusic implements a bespoke native C++ HybridObject extraction engine (`react-native-hyper-extractor`). This allows direct native thread-pool execution for deep InnerTube JSON traversal, real-time taxonomy resolution, and multi-tier audio unboxing.

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

- **Background Playback & Lockscreen Controls:** Seamless native background audio persistence powered by a bleeding-edge Alpha build of `react-native-track-player`.
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

### 🌐 2. Dynamic Real-Time Taxonomy Scraping
HyperMusic rejects static, fragile fallback mapping tables.
- **`DynamicChipResolver`:** Dynamically scrapes InnerTube explore landing pages (`FEmusic_moods_and_genres`) and home feed chip clouds (`FEmusic_home`) to unbox real-time `browseIds` and parameter tuples on the fly.
- **`Parsers` Suite:** An extensive native JSON unboxing engine capable of deeply traversing complex flex-columns, immersive headers, microformats, and section list renderers into strongly typed TypeScript interfaces.

### 🎨 3. High-Fidelity Premium Aesthetics
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

## 🤖 Built with an Agentic Workflow

> **Note on Project Genesis:**
> This entire codebase—spanning the React Native frontend, the C++ Nitro Module bindings, the resilient OkHttp network layer, and the native Kotlin extraction engine—was architected and engineered via an advanced **Agentic Workflow** in pair-programming collaboration with **Antigravity** (Google DeepMind). It stands as a testament to the power of state-of-the-art AI-assisted software architecture and engineering governance.

---

## 📄 License

The original HyperMusic source code is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

HyperMusic also includes third-party open-source components under their own licenses. In particular, Android builds include NewPipe Extractor under GPL-3.0, so redistribution of built app binaries must satisfy the applicable GPL-3.0 source and notice obligations. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the in-app licenses screen for details.
