const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');
const nodeModulesPath = path.join(__dirname, '../node_modules');
const outputDir = path.join(__dirname, '../src/assets/data');
const outputPath = path.join(outputDir, 'licenses.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const dependencies = { ...packageJson.dependencies };

const INTERNAL_MODULES = [
  {
    id: "react-native-hyper-extractor",
    name: "react-native-hyper-extractor",
    path: path.join(__dirname, '../modules/react-native-hyper-extractor'),
    version: "1.1.0",
    repository: "https://github.com/SachinYedav/HyperMusic/tree/main/modules/react-native-hyper-extractor"
  },
  {
    id: "hyper-downloader",
    name: "hyper-downloader",
    path: path.join(__dirname, '../modules/hyper-downloader'),
    version: "1.0.0",
    repository: "https://github.com/SachinYedav/HyperMusic/tree/main/modules/hyper-downloader"
  }
];

const EXCLUSION_LIST = [
  'expo-build-properties',
  'expo-dev-client'
];

const licenses = [];

for (const dep of Object.keys(dependencies)) {
  if (EXCLUSION_LIST.includes(dep)) continue;
  
  const depPackageJsonPath = path.join(nodeModulesPath, dep, 'package.json');
  if (fs.existsSync(depPackageJsonPath)) {
    const depPackageJson = JSON.parse(fs.readFileSync(depPackageJsonPath, 'utf8'));
    let licenseText = 'License text not found.';

    const possibleLicenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md'];
    for (const file of possibleLicenseFiles) {
      const licenseFilePath = path.join(nodeModulesPath, dep, file);
      if (fs.existsSync(licenseFilePath)) {
        licenseText = fs.readFileSync(licenseFilePath, 'utf8');
        break;
      }
    }

    let licenseType = depPackageJson.license;
    if (typeof licenseType === 'object' && licenseType.type) {
      licenseType = licenseType.type;
    }

    let repository = depPackageJson.repository;
    if (typeof repository === 'object' && repository.url) {
      repository = repository.url;
    }
    if (repository && typeof repository === 'string') {
      if (repository.startsWith('github:')) {
        repository = `https://github.com/${repository.slice(7)}`;
      } else if (!repository.startsWith('http') && !repository.startsWith('git') && repository.split('/').length === 2) {
        repository = `https://github.com/${repository}`;
      }
      if (repository.startsWith('git+')) {
        repository = repository.slice(4);
      }
      if (repository.startsWith('git://')) {
        repository = 'https://' + repository.slice(6);
      }
      if (repository.startsWith('ssh://git@github.com/')) {
        repository = repository.replace('ssh://git@github.com/', 'https://github.com/');
      }
      if (repository.endsWith('.git')) {
        repository = repository.slice(0, -4);
      }
    }

    if (licenseText === 'License text not found.') {
      if (licenseType === 'MIT') {
        licenseText = `MIT License\n\nCopyright (c) ${depPackageJson.author?.name || dep}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;
      } else if (licenseType === 'Apache-2.0') {
        licenseText = `Apache License, Version 2.0\n\nCopyright (c) ${depPackageJson.author?.name || dep}\n\nLicensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at\n\n    http://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.`;
      } else if (licenseType === 'ISC') {
        licenseText = `ISC License\n\nCopyright (c) ${depPackageJson.author?.name || dep}\n\nPermission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.\n\nTHE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;
      } else {
        licenseText = `${licenseType || 'Unknown'} License\n\nCopyright (c) ${depPackageJson.author?.name || dep}\n\nFor full license details, refer to the package repository or documentation at ${repository || dep}.`;
      }
    }

    licenses.push({
      id: dep,
      name: dep,
      version: depPackageJson.version,
      licenseType: licenseType || 'Unknown',
      repository: repository || '',
      licenseText: licenseText,
    });
  }
}

for (const mod of INTERNAL_MODULES) {
  let licenseText = 'License text not found.';
  const licenseFilePath = path.join(mod.path, 'LICENSE');
  if (fs.existsSync(licenseFilePath)) {
    licenseText = fs.readFileSync(licenseFilePath, 'utf8');
  }

  const entry = {
    id: mod.id,
    name: mod.name,
    version: mod.version,
    licenseType: 'MIT',
    repository: mod.repository || '',
    licenseText: licenseText
  };

  const existingIndex = licenses.findIndex(l => l.id === mod.id);
  if (existingIndex >= 0) {
    licenses[existingIndex] = entry;
  } else {
    licenses.push(entry);
  }
}

async function finalizeLicenses() {
  let newPipeLicenseText = "GNU General Public License v3.0\n\nPermissions of this strong copyleft license are conditioned on making available complete source code of licensed works and modifications, which include larger works using a licensed work, under the same license. Copyright and license notices must be preserved. Contributors provide an express grant of patent rights.";

  try {
    console.log("Fetching NewPipeExtractor pristine license text from GitHub...");
    const res = await fetch("https://raw.githubusercontent.com/TeamNewPipe/NewPipeExtractor/dev/LICENSE");
    if (res.ok) {
      newPipeLicenseText = await res.text();
      console.log("Successfully fetched NewPipeExtractor GPL-3.0 license text!");
    } else {
      console.warn("Using fallback NewPipe license text due to non-200 response.");
    }
  } catch (err) {
    console.warn("Using fallback NewPipe license text due to network error:", err.message);
  }

  let okHttpLicenseText = "Apache License 2.0";
  try {
    console.log("Fetching OkHttp license text from GitHub...");
    const res = await fetch("https://raw.githubusercontent.com/square/okhttp/master/LICENSE.txt");
    if (res.ok) okHttpLicenseText = await res.text();
  } catch (err) {}

  let gsonLicenseText = "Apache License 2.0";
  try {
    console.log("Fetching Gson license text from GitHub...");
    const res = await fetch("https://raw.githubusercontent.com/google/gson/master/LICENSE");
    if (res.ok) gsonLicenseText = await res.text();
  } catch (err) {}

  let coroutinesLicenseText = "Apache License 2.0";
  try {
    console.log("Fetching kotlinx.coroutines license text from GitHub...");
    const res = await fetch("https://raw.githubusercontent.com/Kotlin/kotlinx.coroutines/master/LICENSE.txt");
    if (res.ok) coroutinesLicenseText = await res.text();
  } catch (err) {}

  const NATIVE_DEPENDENCIES = [
    {
      id: "newpipe-extractor",
      name: "NewPipe Extractor",
      version: "v0.26.3",
      licenseType: "GPL-3.0",
      repository: "https://github.com/TeamNewPipe/NewPipeExtractor",
      licenseText: newPipeLicenseText
    },
    {
      id: "okhttp",
      name: "OkHttp",
      version: "4.12.0",
      licenseType: "Apache-2.0",
      repository: "https://github.com/square/okhttp",
      licenseText: okHttpLicenseText
    },
    {
      id: "gson",
      name: "Gson",
      version: "2.10.1",
      licenseType: "Apache-2.0",
      repository: "https://github.com/google/gson",
      licenseText: gsonLicenseText
    },
    {
      id: "kotlinx-coroutines-android",
      name: "kotlinx.coroutines",
      version: "1.7.3",
      licenseType: "Apache-2.0",
      repository: "https://github.com/Kotlin/kotlinx.coroutines",
      licenseText: coroutinesLicenseText
    }
  ];

  for (const mod of NATIVE_DEPENDENCIES) {
    const existingIndex = licenses.findIndex(l => l.id === mod.id);
    if (existingIndex >= 0) {
      licenses[existingIndex] = mod;
    } else {
      licenses.push(mod);
    }
  }

  const priorityOrder = [
    "react-native-hyper-extractor",
    "hyper-downloader",
    "NewPipe Extractor",
    "OkHttp",
    "Gson",
    "kotlinx.coroutines"
  ];

  licenses.sort((a, b) => {
    const indexA = priorityOrder.indexOf(a.name);
    const indexB = priorityOrder.indexOf(b.name);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    } else if (indexA !== -1) {
      return -1;
    } else if (indexB !== -1) {
      return 1;
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(licenses, null, 2), 'utf8');
  console.log(`Successfully generated licenses.json with ${licenses.length} packages at ${outputPath}`);
}

finalizeLicenses();
