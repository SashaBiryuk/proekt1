const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// pnpm workspace: let Metro see the root node_modules for symlink resolution
config.watchFolders = [workspaceRoot];

// pnpm uses symlinked packages — Metro must follow symlinks
config.resolver.unstable_enableSymlinks = true;

// Make sure both local and root node_modules are in the module resolution path
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Ensure font files are treated as assets
if (!config.resolver.assetExts.includes("ttf")) {
  config.resolver.assetExts.push("ttf", "otf");
}

module.exports = config;
