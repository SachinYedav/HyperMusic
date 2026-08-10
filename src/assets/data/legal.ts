export interface LegalDocument {
  title: string;
  lastUpdated: string;
  sections: {
    title: string;
    paragraphs: string[];
  }[];
}

export const termsData: LegalDocument = {
  title: "Terms of Service",
  lastUpdated: "August 9, 2026",
  sections: [
    {
      title: "1. Acceptance of Terms & Age Restriction",
      paragraphs: [
        "By downloading, installing, or operating the HyperMusic software application, you enter into a binding agreement governed by these Terms of Service. You must be at least 13 years of age (or the minimum legal age in your jurisdiction) to use this software. If you do not agree to be bound by every provision contained herein, you must immediately cease all use of the software and remove it from your device.",
      ]
    },
    {
      title: "2. Nature of the Software & Scope of License",
      paragraphs: [
        "HyperMusic functions strictly as an independent, locally executed client-side software tool. The application acts as a decentralized user agent that structures, requests, and presents publicly accessible media streams and metadata directly upon the user's explicit command.",
        "Subject to your compliance with these Terms, you are granted a personal, non-exclusive, non-transferable, revocable license to operate the software solely for personal, non-commercial media consumption."
      ]
    },
    {
      title: "3. Disclaimer of Affiliation & Trademarks",
      paragraphs: [
        "HyperMusic is an independent, open-source project. The software is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Google LLC, YouTube, YouTube Music, or any of their subsidiaries or affiliates.",
        "All product and company names are the registered trademarks of their original owners. The use of any trade name or trademark within this software is strictly for identification and reference purposes only, and does not imply any association with the trademark holder of their product brand."
      ]
    },
    {
      title: "4. Third-Party Platform Terms & Compliance",
      paragraphs: [
        "HyperMusic initiates direct client-side network requests to third-party platforms. You acknowledge that the Terms of Service of these third-party platforms may prohibit the extraction, downloading, caching, or bypassing of their normal access interfaces.",
        "By using HyperMusic, you assume full personal legal responsibility for ensuring your usage complies with the terms and conditions of any third-party services accessed through this software. The developers of HyperMusic do not condone, encourage, or promote the violation of any third-party agreements."
      ]
    },
    {
      title: "5. Prohibited Circumvention & Interoperability Research",
      paragraphs: [
        "You agree not to utilize the software for any commercial distribution, mass automated archiving, unauthorized rebroadcasting, or piracy of copyrighted material.",
        "HyperMusic interacts exclusively with unencrypted, publicly accessible web endpoints. It does not circumvent, decrypt, or break Widevine or any other Digital Rights Management (DRM) protocols. The underlying reverse-engineering mechanics and source code are published strictly for interoperability research and educational purposes."
      ]
    },
    {
      title: "6. Content Source & Copyright (DMCA) Policy",
      paragraphs: [
        "HyperMusic does not host, upload, retransmit, license, or store any proprietary third-party audio or video streams on any proprietary servers. All digital content is retrieved in real-time from external Content Delivery Networks (CDNs).",
        "If you are a copyright holder and believe your content is being infringed upon, please note that HyperMusic exercises no control over third-party servers. Takedown notices must be directed to the host CDNs. To report issues with the HyperMusic client code itself, file an issue on the official GitHub repository."
      ]
    },
    {
      title: "7. Disclaimer of Warranties & Limitation of Liability",
      paragraphs: [
        "THE SOFTWARE IS PROVIDED STRICTLY ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS, WITHOUT WARRANTIES OF ANY KIND. WE EXPRESSLY DISCLAIM ANY GUARANTEE THAT THE SOFTWARE WILL FUNCTION UNINTERRUPTED, OR THAT THIRD-PARTY ENDPOINTS WILL REMAIN ACCESSIBLE.",
        "IN NO EVENT SHALL THE DEVELOPERS OR CONTRIBUTORS BE HELD LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO OPERATE THE SOFTWARE, INCLUDING CLAIMS RELATED TO THIRD-PARTY ACCOUNT TERMINATION."
      ]
    },
    {
      title: "8. User Indemnification",
      paragraphs: [
        "By operating this software, you agree to defend, indemnify, and hold harmless the developers, contributors, and maintainers of HyperMusic from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney's fees) arising from your use of the software, or your violation of any third-party Terms of Service or intellectual property laws."
      ]
    },
    {
      title: "9. Governing Law & Termination",
      paragraphs: [
        "The developers reserve the right to terminate your license to use the software if you violate these Terms. These Terms are intended to operate to the maximum extent permitted by applicable law; if any provision is found unenforceable, the remaining provisions will continue in effect."
      ]
    }
  ]
};

export const privacyData: LegalDocument = {
  title: "Privacy Policy",
  lastUpdated: "August 9, 2026",
  sections: [
    {
      title: "1. Zero Data Collection Architecture",
      paragraphs: [
        "HyperMusic is engineered around an absolute zero-tracking, offline-first structural paradigm. We maintain zero centralized data harvesting infrastructures, telemetry servers, or user tracking databases.",
        "We explicitly declare the absolute absence of third-party analytics SDKs, crash logging trackers (such as Crashlytics), and telemetry mechanisms. No personally identifiable information (PII), biometric profiles, device identification hashes, or private account credentials are ever collected or transmitted by the software."
      ]
    },
    {
      title: "2. Localized Storage & SQLite Execution",
      paragraphs: [
        "All operational configurations, personalized taste preferences, user-generated playlists, saved artists, playback history logs, and downloaded media files (including batch downloads for albums and playlists) are securely written directly to your local device filesystem utilizing highly optimized SQLite databases and MMKV key-value stores.",
        "You retain absolute ownership over your local data. You may permanently erase your entire library, offline downloads, and operational history at any time directly through the application's configuration menus."
      ]
    },
    {
      title: "3. Client-Side Network Requests & Third-Party CDNs",
      paragraphs: [
        "To successfully resolve digital audio streams and metadata, HyperMusic initiates direct HTTPS network interactions from your physical device to third-party Content Delivery Networks (CDNs), including servers operated by YouTube and Google LLC.",
        "As an inherent functional requirement of standard internet networking protocols, your public IP address, user-agent string, and specific query headers are communicated directly to these external servers during real-time extraction. We encourage you to review the privacy policies of these third-party network providers (e.g., Google Privacy Policy)."
      ]
    },
    {
      title: "4. Device Permissions & Background Services",
      paragraphs: [
        "HyperMusic requests operating system permissions strictly limited to the absolute technical minimum required for basic media playback and offline functionality.",
        "• Notification Permission: Required to display media playback controls and download progress in your system tray.\n• Foreground Service (Media Playback & Data Sync) & Wake Lock: Required by the Android operating system to keep music playing in the background and to ensure batch media downloads continue successfully while the screen is off.\n• Microphone (Audio Recording): Requested strictly for the Native Voice Search (Speech-to-Text) functionality. Audio processing is handled by your device's native speech recognition engine; we do not record, transmit, or store your audio on any remote servers.\n• Local App Storage: Used within the app sandbox to maintain your offline media cache, saved library, playback history, and preferences."
      ]
    },
    {
      title: "5. Policy Revisions & Notice",
      paragraphs: [
        "We reserve the right to amend or update this Privacy Policy at our discretion to reflect evolving statutory requirements or App Store compliance updates. All modifications will be updated directly within this localized data document."
      ]
    }
  ]
};
