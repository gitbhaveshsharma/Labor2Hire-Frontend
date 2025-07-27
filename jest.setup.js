/**
 * Jest Setup for React Native Testing
 * Mocks for AsyncStorage and other React Native modules
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      canOpenURL: jest.fn(() => Promise.resolve(true)),
      openURL: jest.fn(() => Promise.resolve()),
    },
    Share: {
      share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
      dismissedAction: 'dismissedAction',
    },
    Vibration: {
      vibrate: jest.fn(),
    },
  };
});

// Mock Socket.io client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  })),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  }),
  NavigationContainer: ({ children }) => children,
}));

// Global test timeout
jest.setTimeout(30000);
