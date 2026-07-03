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
  lastUpdated: "July 1, 2026",
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
      title: "3. Third-Party Platform Terms & Compliance",
      paragraphs: [
        "HyperMusic initiates direct client-side network requests to third-party platforms (e.g., YouTube, Google LLC). You acknowledge that the Terms of Service of these third-party platforms may prohibit the extraction, downloading, caching, or bypassing of their normal access interfaces.",
        "By using HyperMusic, you assume full personal legal responsibility for ensuring your usage complies with the terms and conditions of any third-party services accessed through this software. The developers of HyperMusic do not condone, encourage, or promote the violation of any third-party agreements or the unauthorized downloading of copyrighted material."
      ]
    },
    {
      title: "4. Prohibited Circumvention & Permissible Use",
      paragraphs: [
        "You agree not to utilize the software for any commercial distribution, mass automated archiving, unauthorized rebroadcasting, or piracy of copyrighted material. HyperMusic is designed as an alternative UI and must not be used as a tool for Digital Rights Management (DRM) circumvention or mass-scale media piracy."
      ]
    },
    {
      title: "5. Content Source & Copyright (DMCA) Policy",
      paragraphs: [
        "HyperMusic does not host, upload, retransmit, license, or store any proprietary third-party audio or video streams on any proprietary servers. All digital content is retrieved in real-time from external Content Delivery Networks (CDNs).",
        "If you are a copyright holder and believe your content is being infringed upon, please note that HyperMusic exercises no control over third-party servers. Takedown notices must be directed to the host CDNs (e.g., YouTube). However, to report issues with the HyperMusic client itself, please file an issue on the official GitHub repository."
      ]
    },
    {
      title: "6. Disclaimer of Warranties & Limitation of Liability",
      paragraphs: [
        "THE SOFTWARE IS PROVIDED STRICTLY ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS, WITHOUT WARRANTIES OF ANY KIND. WE EXPRESSLY DISCLAIM ANY GUARANTEE THAT THE SOFTWARE WILL FUNCTION UNINTERRUPTED, OR THAT THIRD-PARTY ENDPOINTS WILL REMAIN ACCESSIBLE.",
        "IN NO EVENT SHALL THE DEVELOPERS OR CONTRIBUTORS BE HELD LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO OPERATE THE SOFTWARE, INCLUDING CLAIMS RELATED TO THIRD-PARTY ACCOUNT TERMINATION."
      ]
    },
    {
      title: "7. Governing Law & Termination",
      paragraphs: [
        "The developers reserve the right to terminate your license to use the software if you violate these Terms. These Terms are intended to operate to the maximum extent permitted by applicable law; if any provision is found unenforceable, the remaining provisions will continue in effect."
      ]
    }
  ]
};

export const privacyData: LegalDocument = {
  title: "Privacy Policy",
  lastUpdated: "July 1, 2026",
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
        "All operational configurations, personalized taste preferences, user-generated playlists, playback history logs, and downloaded media files are securely written directly to your local device filesystem utilizing highly optimized SQLite databases and MMKV key-value stores.",
        "You retain absolute ownership over your local data. You may permanently erase your entire library and operational history at any time directly through the application's configuration menus."
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
        "HyperMusic requests operating system permissions strictly limited to the absolute technical minimum required for basic media playback functionality.",
        "• Notification Permission: Required to display media playback controls in your system tray.\n• Foreground Service & Wake Lock: Required by the Android operating system to keep music playing in the background while the screen is off.\n• Local App Storage: Used within the app sandbox to maintain your offline media cache, saved library, playback history, and preferences."
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
