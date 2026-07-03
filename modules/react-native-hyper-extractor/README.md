# react-native-hyper-extractor

[![Nitro Modules](https://img.shields.io/badge/Nitro%20Modules-C%2B%2B%20%7C%20Kotlin-brightgreen?style=flat-square)](https://github.com/mrousavy/react-native-nitro)
[![Platform](https://img.shields.io/badge/Platform-Android-blue?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)]()

`react-native-hyper-extractor` is a custom internal React Native module built with Nitro Modules for HyperMusic. It bypasses traditional React Native async bridge serialization bottlenecks by utilizing high-performance C++ `HybridObject` bindings to expose native-level scraping and media extraction engines directly to JavaScript.

---

## 📌 Architecture & Key Components

The module splits its responsibilities across three core subsystems:

### 1. Nitro Bridge (`HybridHyperExtractor`)
The native integration layer implementing `HyperExtractorSpec`. It exposes synchronous-like execution bindings to JavaScript/TypeScript while offloading heavy networking and parsing workloads to native thread pools.

### 2. Stream Extraction Engine (`NewPipeExtractor` & `NewPipeDownloader`)
Handles direct audio stream URL unboxing via NewPipe's extractor core.
- **Resilient Fallback Routine:** Attempts to resolve the target user quality (`256kbps` / `128kbps`), falling back to `M4A`, and finally to any available audio track to guarantee playback success.
- **Custom Downloader:** Uses a specialized `NewPipeDownloader` wrapped around OkHttp to handle localized requests, custom localization headers, and InnerTube API validations.

### 3. InnerTube Scraping Suite (`YouTubeMusicEngine`)
Executes direct HTTP payloads against YouTube Music internal endpoints (`/browse`, `/search`, `/next`) to reconstruct structured catalog feeds.
- **`Parsers`:** A robust JSON unboxing suite capable of parsing complex `flexColumns`, `sectionListRenderer`, and `musicCarouselShelfRenderer` structures into clean TypeScript-ready interfaces.
- **`DynamicChipResolver`:** Scrapes explore landing pages and home feed chip clouds (`FEmusic_home`, `FEmusic_moods_and_genres`) to discover real-time taxonomy parameters without relying on static fallback tables.
- **`HeadersInterceptor`:** Configured with specific `User-Agent` headers, automated `visitorData` state persistence, and automatic retry interceptors.

---

## 🚀 Installation & Setup

Since this is an internal custom module within the HyperMusic workspace, it is pre-linked via Nitro Modules.

```bash
# Ensure dependencies are installed and native bridges are generated
npm install
```

---

## 📖 TypeScript API & Usage

Import `HyperExtractor` directly from the package to execute native extraction routines:

```typescript
import { HyperExtractor } from 'react-native-hyper-extractor';

// 1. Resolving Direct Streaming URLs
async function playAudio(videoId: string) {
  try {
    const streamUrl = await HyperExtractor.getStreamUrl(videoId, 'HIGH');
    console.log('Direct Playback URL:', streamUrl);
  } catch (error) {
    console.error('Extraction failed:', error);
  }
}

// 2. Fetching Home Discovery Feed
async function loadHomeFeed() {
  const feed = await HyperExtractor.getHomeFeed();
  console.log('Discovered Shelves:', feed.shelves.length);
}

// 3. Executing Complex Catalog Searches
async function searchMusic(query: string) {
  const results = await HyperExtractor.search(query);
  results.forEach(item => {
    console.log(`[${item.type.toUpperCase()}] ${item.title} - ${item.subtitle}`);
  });
}

// 4. Generating an Automated Radio Queue
async function startRadio(seedVideoId: string) {
  const queue = await HyperExtractor.getRadioQueue(seedVideoId);
  console.log('Radio Queue Loaded:', queue.length, 'tracks');
}
```

---

## 🛡️ Error Handling & Logs

All native execution failures are wrapped in dedicated domain exceptions (`ExtractionException`, `NetworkException`, `ParsingException`) and bubbled up to TypeScript with intact stack traces. 

Underlying native logs can be monitored directly via Logcat or Console.app using the `HyperExtractor` tag:
```bash
adb logcat -s "HyperExtractor" "NewPipeExtractor" "Parsers" "YouTubeMusicEngine"
```

---

## 📄 License
MIT License.
