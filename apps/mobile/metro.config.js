const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Configure Metro for pnpm compatibility
const workspaceRoot = path.resolve(__dirname, "../..");

// Add workspace packages to watch folders
config.watchFolders = [
  workspaceRoot,
  path.resolve(workspaceRoot, "packages/api-client"),
];

// Add workspace package resolution
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Add extra node modules for workspace packages
config.resolver.extraNodeModules = {
  "@workspace/api-client": path.resolve(workspaceRoot, "packages/api-client"),
};

// Enable detailed logging for debugging
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      console.log(`[Metro] ${req.method} ${req.url}`);
      return middleware(req, res, next);
    };
  },
};

// Log configuration for debugging
console.log("[Metro Config] watchFolders:", config.watchFolders);
console.log("[Metro Config] nodeModulesPaths:", config.resolver.nodeModulesPaths);
console.log("[Metro Config] extraNodeModules:", config.resolver.extraNodeModules);

module.exports = config;
