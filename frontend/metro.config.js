const { getDefaultConfig } = require('expo/metro-config');
// All logo assets are committed; builds never depend on a developer's local files.
module.exports = getDefaultConfig(__dirname);
