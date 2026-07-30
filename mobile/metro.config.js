const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// socket.io-client/engine.io-client ship Node-only files (*.node.js) that Metro
// misreads as platform extensions when resolving their "exports" map. Falling
// back to main + browser fields resolves the browser-safe transports instead.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
