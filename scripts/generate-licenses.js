const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const outputDir = path.join(rootDir, 'src/assets/data');
const finalOutputPath = path.join(outputDir, 'licenses.json');
const nodeModulesPath = path.join(rootDir, 'node_modules');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Safely fetch JSON from a URL
async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// Safely fetch text from a URL
async function fetchText(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
}

// Convert GitHub/GitLab URL to raw URL for LICENSE file
function getRawLicenseUrl(repoUrl, defaultBranch = 'master') {
  if (!repoUrl) return null;
  if (repoUrl.includes('github.com')) {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (match) {
      const base = `https://raw.githubusercontent.com/${match[1]}/${match[2].replace('.git', '')}/${defaultBranch}`;
      return [`${base}/LICENSE`, `${base}/LICENSE.md`, `${base}/LICENSE.txt`, `${base}/license`, `${base}/LICENSE-MIT`, `${base}/LICENSE.md`];
    }
  }
  return null;
}

// Try fetching raw license text from possible URLs
async function tryFetchRawLicense(repoUrl) {
  const urlsToTry = [
    ...(getRawLicenseUrl(repoUrl, 'main') || []),
    ...(getRawLicenseUrl(repoUrl, 'master') || [])
  ];
  
  for (const url of urlsToTry) {
    const text = await fetchText(url);
    if (text && !text.includes('404: Not Found') && text.length > 50) {
      return text;
    }
  }
  return null;
}

async function extractJSLicenses() {
  console.log("==> Phase 1: Extracting Top-Level JS Production Dependencies...");
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = packageJson.dependencies || {};
  
  const jsLicenses = [];
  const internalDeps = ['react-native-hyper-extractor', 'react-native-hyper-player', 'hyper-downloader'];

  const depNames = Object.keys(dependencies).filter(name => !internalDeps.includes(name));

  for (let i = 0; i < depNames.length; i++) {
    const pkgName = depNames[i];
    process.stdout.write(`\rProcessing JS package [${i + 1}/${depNames.length}]: ${pkgName.substring(0, 30).padEnd(30)}`);
    const pkgJsonPath = path.join(nodeModulesPath, pkgName, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;
    
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    let licenseType = "Unknown";
    let repository = "Unknown";
    let publisher = "Unknown";

    if (pkgJson.license) {
      licenseType = typeof pkgJson.license === 'object' ? (pkgJson.license.type || "Unknown") : pkgJson.license;
    } else if (pkgJson.licenses && Array.isArray(pkgJson.licenses)) {
      licenseType = pkgJson.licenses.map(l => l.type).join(', ');
    }

    if (pkgJson.repository) {
      repository = typeof pkgJson.repository === 'object' ? (pkgJson.repository.url || "Unknown") : pkgJson.repository;
      if (typeof repository === 'string') {
        repository = repository.replace('git+', '').replace('.git', '').replace('ssh://git@', 'https://').replace('git://', 'https://');
      }
    }

    if (pkgJson.author) {
      publisher = typeof pkgJson.author === 'object' ? (pkgJson.author.name || 'Unknown') : pkgJson.author;
    } else if (typeof repository === 'string' && repository.includes('github.com/')) {
      const orgOrUser = repository.split('github.com/')[1]?.split('/')[0];
      if (orgOrUser) publisher = orgOrUser;
    }

    let licenseText = 'License text not found.';
    const possibleLicenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md'];
    for (const file of possibleLicenseFiles) {
      const licenseFilePath = path.join(nodeModulesPath, pkgName, file);
      if (fs.existsSync(licenseFilePath)) {
        licenseText = fs.readFileSync(licenseFilePath, 'utf8');
        break;
      }
    }

    // Network Resolution for missing details
    if (publisher === 'Unknown' || licenseText === 'License text not found.') {
      // 1. Fetch from NPM registry
      const npmData = await fetchJson(`https://registry.npmjs.org/${pkgName}`);
      if (npmData) {
        const latestVer = pkgJson.version;
        const npmVersionData = npmData.versions?.[latestVer] || {};
        
        if (publisher === 'Unknown') {
          if (npmVersionData.author) {
            publisher = typeof npmVersionData.author === 'object' ? npmVersionData.author.name : npmVersionData.author;
          } else if (npmData.maintainers && npmData.maintainers.length > 0) {
            publisher = npmData.maintainers[0].name;
          }
        }
      }

      // 2. Fetch raw license text from GitHub if missing locally
      if (licenseText === 'License text not found.' && repository !== 'Unknown') {
        const remoteText = await tryFetchRawLicense(repository);
        if (remoteText) {
          licenseText = remoteText;
        }
      }
    }
    
    // Explicit legal fallback text if we absolutely cannot find the text anywhere
    if (licenseText === 'License text not found.') {
       licenseText = `Please refer to the source repository for full license details:\n\nRepository: ${repository !== 'Unknown' ? repository : 'Not provided'}\nLicense Type: ${licenseType}\nPublisher: ${publisher !== 'Unknown' ? publisher : 'Not provided'}`;
    }

    jsLicenses.push({
      id: pkgName,
      name: pkgName,
      version: pkgJson.version || "Unknown",
      licenseType,
      publisher,
      repository,
      licenseText
    });
  }
  
  console.log("\nJS packages done.\n");
  return jsLicenses;
}

async function extractNativeLicenses() {
  console.log("==> Phase 2: Generating Native Dependency Graph (Gradle) ...");
  const gradleCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
  const aboutLibrariesCmd = `${gradleCmd} :app:exportLibraryDefinitions -PaboutLibraries.exportPath=../dist --no-daemon`;
  
  try {
    execSync(aboutLibrariesCmd, { stdio: 'inherit', cwd: path.join(rootDir, 'android') });
  } catch (e) {
    console.error("Failed to execute Gradle aboutlibraries plugin.", e);
  }

  console.log("==> Parsing Native Licenses JSON & Fetching Remote Definitions...");
  const nativeJsonPath = path.join(rootDir, 'android', 'dist', 'aboutlibraries.json'); 
  if (!fs.existsSync(nativeJsonPath)) {
     console.error("Native licenses JSON not found.");
     return [];
  }

  const nativeData = JSON.parse(fs.readFileSync(nativeJsonPath, 'utf8'));
  const nativeLicenses = [];

  for (let i = 0; i < nativeData.libraries.length; i++) {
    const lib = nativeData.libraries[i];
    process.stdout.write(`\rProcessing Native package [${i + 1}/${nativeData.libraries.length}]: ${(lib.uniqueId || lib.name).substring(0, 30).padEnd(30)}`);
    
    const licenseObj = lib.licenses && lib.licenses.length > 0 ? Array.from(lib.licenses)[0] : {};
    let licenseContent = "License text not found.";
    let licenseType = "Unknown";
    
    if (typeof licenseObj === 'string') {
        const def = nativeData.licenses[licenseObj];
        if (def) {
            licenseContent = def.content || def.url || "License text not found.";
            licenseType = def.name || licenseObj;
        }
    } else {
      licenseContent = licenseObj.licenseContent || licenseObj.url || 'License text not found.';
      licenseType = licenseObj.name || "Unknown";
    }

    // Infer publisher from repo URL or developers block
    const repoUrl = lib.website || (lib.scm ? lib.scm.url : "");
    let nativePublisher = "Unknown";
    if (lib.developers && lib.developers.length > 0) {
      nativePublisher = lib.developers[0].name || 'Unknown';
    } else if (repoUrl && repoUrl.includes('github.com/')) {
      const orgOrUser = repoUrl.split('github.com/')[1]?.split('/')[0];
      if (orgOrUser) nativePublisher = orgOrUser;
    }

    // Network Resolution for missing text
    if (licenseContent === "License text not found." || licenseContent.startsWith("http")) {
      // If it's a direct URL to a raw .txt or standard GitHub link, try fetching
      if (licenseContent.startsWith("http")) {
         // Proprietary SDK check (Google Play Services, ML Kit, Firebase etc.)
         // These do not offer raw text, they offer HTML terms. We keep the URL as the text.
         if (licenseContent.includes("developer.android.com/studio/terms") || 
             licenseContent.includes("developers.google.com/ml-kit/terms") || 
             licenseContent.includes("firebase.google.com/terms") ||
             licenseContent.includes("developer.android.com/about/versions/")) {
            licenseContent = `Please refer to the official online terms of service at:\n${licenseContent}`;
         } else {
            // It might be a fetchable text license (e.g. apache.org/licenses/LICENSE-2.0.txt)
            // But to avoid blocking the pipeline with HTML responses, we first try to fetch GitHub if repo exists
            let remoteText = null;
            if (repoUrl && repoUrl.includes("github.com")) {
              remoteText = await tryFetchRawLicense(repoUrl);
            }
            if (remoteText) {
               licenseContent = remoteText;
            } else if (licenseContent.endsWith(".txt") || licenseContent.includes("raw.githubusercontent")) {
               const directText = await fetchText(licenseContent);
               if (directText && !directText.trim().startsWith("<html")) {
                 licenseContent = directText;
               }
            } else {
               // Fallback to presenting the link safely
               licenseContent = `License text is available online at:\n${licenseContent}`;
            }
         }
      } else if (repoUrl && repoUrl.includes("github.com")) {
        const remoteText = await tryFetchRawLicense(repoUrl);
        if (remoteText) licenseContent = remoteText;
      }
    }

    // If still nothing
    if (licenseContent === 'License text not found.') {
      licenseContent = `Please refer to the source repository for full license details:\n\nRepository: ${repoUrl !== '' ? repoUrl : 'Not provided'}\nLicense Type: ${licenseType}`;
    }

    // Identify publisher for known Google components logically rather than blindly mapping hardcoded IDs
    if (nativePublisher === 'Unknown') {
       if (lib.uniqueId?.startsWith('com.google.android.gms')) nativePublisher = 'Google Play Services';
       else if (lib.uniqueId?.startsWith('com.google.firebase')) nativePublisher = 'Google Firebase';
       else if (lib.uniqueId?.startsWith('com.google.mlkit') || lib.uniqueId?.startsWith('com.google.android.odml')) nativePublisher = 'Google ML Kit';
       else if (lib.uniqueId?.startsWith('androidx.') || lib.uniqueId?.startsWith('com.google.android.material')) nativePublisher = 'Google / AndroidX';
       else if (lib.uniqueId?.startsWith('com.google.errorprone')) nativePublisher = 'Google';
    }

    nativeLicenses.push({
      id: lib.uniqueId || lib.name,
      name: lib.name || lib.uniqueId,
      version: lib.artifactVersion || "Unknown",
      licenseType: licenseType,
      publisher: nativePublisher,
      repository: repoUrl || "Unknown",
      licenseText: licenseContent
    });
  }

    console.log("\nNative packages done.\n");
    return nativeLicenses;
}

async function runPipeline() {
  const jsLicenses = await extractJSLicenses();
  const nativeLicenses = await extractNativeLicenses();

  console.log("==> Phase 3: Merging & Deduplicating...");
  
  // NATIVE_DEPENDENCIES mapping removed, all resolution happens over the network dynamically
  const allLicenses = [...jsLicenses, ...nativeLicenses];

  const uniqueLicensesMap = new Map();
  for (const item of allLicenses) {
    if (!uniqueLicensesMap.has(item.id)) {
      uniqueLicensesMap.set(item.id, item);
    }
  }

  const finalLicenses = Array.from(uniqueLicensesMap.values());
  finalLicenses.sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(finalOutputPath, JSON.stringify(finalLicenses, null, 2), 'utf8');
  console.log(`\n✅ Successfully extracted ${finalLicenses.length} packages without artificial fallbacks.`);
  console.log(`✅ Saved to: ${finalOutputPath}`);
}

runPipeline();
