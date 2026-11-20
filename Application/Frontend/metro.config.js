// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro defaults to one worker per CPU core. On machines with many cores
// (e.g. 32) on Windows, that many workers reading the cache at once runs out
// of file handles ("EMFILE: too many open files"), and the dev server then
// fails every page. A handful of workers is plenty for this app.
config.maxWorkers = 4;

module.exports = config;
