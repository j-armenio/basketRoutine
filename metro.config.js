// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Drizzle's generated migrations are .sql files bundled with the app.
config.resolver.sourceExts.push('sql');

module.exports = config;
