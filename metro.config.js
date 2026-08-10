const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Crucial: Use realpathSync to resolve the exact OS-level casing of the directory.
// This permanently prevents Metro from failing to match NPM workspace junctions on Windows.
const projectRoot = fs.realpathSync(__dirname);
const config = getDefaultConfig(projectRoot);

// Force Metro to explicitly watch the modules directory
config.watchFolders = [
  path.resolve(projectRoot, 'modules'),
];

// Ensure Metro strictly resolves through the root node_modules to properly handle Workspace symlinks
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// The disableHierarchicalLookup override was removed to satisfy 'expo doctor'.
// Do NOT remove watchFolders or nodeModulesPaths, as they are required for local expo modules (like hyper-downloader) to bundle correctly.

module.exports = config;
