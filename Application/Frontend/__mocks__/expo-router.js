// Project-wide manual mock for expo-router - automatically applied to every
// test file (no explicit jest.mock('expo-router') needed), since this lives
// in a __mocks__ folder adjacent to node_modules.
//
// push/replace/back/canGoBack are shared, stable jest.fn()s (not recreated
// per render) so a test can import them directly and assert on calls:
//   import { __mockPush } from 'expo-router';
//   expect(__mockPush).toHaveBeenCalledWith('/(parent)/chores/123');

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockDismissAll = jest.fn();
const mockCanDismiss = jest.fn(() => true);

const useRouter = jest.fn(() => ({
  push: mockPush,
  replace: mockReplace,
  back: mockBack,
  canGoBack: mockCanGoBack,
  dismissAll: mockDismissAll,
  canDismiss: mockCanDismiss,
}));

const useLocalSearchParams = jest.fn(() => ({}));
const useSegments = jest.fn(() => []);
// Runs the callback via a real useEffect (after mount), not synchronously
// during render - firing it during render starts any async work (e.g. a
// fetchData() call) outside React's act() tracking, so it can resolve
// after the test (and testing-library's cleanup) has already moved on,
// crashing with "trying to require a file after Jest environment has been
// torn down".
const React = require('react');
const useFocusEffect = jest.fn((callback) => {
  React.useEffect(() => {
    if (typeof callback === 'function') return callback();
  }, [callback]);
});

const PassThrough = ({ children }) => children ?? null;

const Stack = PassThrough;
Stack.Screen = () => null;

const Tabs = PassThrough;
Tabs.Screen = () => null;

const Link = ({ children }) => children ?? null;
const Redirect = () => null;

// The static `router` singleton (as opposed to the useRouter() hook) -
// BackButton.tsx imports this directly for its onPress, so it needs to
// resolve to the same shared mock fns the hook returns.
const router = {
  push: mockPush,
  replace: mockReplace,
  back: mockBack,
  canGoBack: mockCanGoBack,
  dismissAll: mockDismissAll,
  canDismiss: mockCanDismiss,
};

module.exports = {
  useRouter,
  useLocalSearchParams,
  useSegments,
  useFocusEffect,
  Stack,
  Tabs,
  Link,
  Redirect,
  router,
  __mockPush: mockPush,
  __mockReplace: mockReplace,
  __mockBack: mockBack,
  __mockCanGoBack: mockCanGoBack,
  __mockDismissAll: mockDismissAll,
  __mockCanDismiss: mockCanDismiss,
  __resetMockRouter: () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    mockCanGoBack.mockClear().mockReturnValue(true);
    mockDismissAll.mockClear();
    mockCanDismiss.mockClear().mockReturnValue(true);
    useLocalSearchParams.mockReset().mockReturnValue({});
    useSegments.mockReset().mockReturnValue([]);
  },
};
