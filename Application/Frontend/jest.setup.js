// Runs once before each test file. jest-expo's preset already mocks most
// native modules; this resets the shared expo-router mock between test
// files in case a previous file left it with stale call history.
const { __resetMockRouter } = require('expo-router');

beforeEach(() => {
  __resetMockRouter();
});
