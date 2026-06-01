import '@testing-library/jest-native/extend-expect';
import { AccessibilityInfo } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('expo-localization', () => ({
  locale: 'en-US',
  getLocales: () => [{ languageTag: 'en-US', languageCode: 'en' }],
}));

jest.mock('expo-router', () => ({
  usePathname: () => '/test',
}));

jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(jest.fn());

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
