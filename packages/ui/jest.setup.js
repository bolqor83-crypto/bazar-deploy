/**
 * Настройка Jest для дизайн-системы Bazar.
 * Моки тяжёлых нативных модулей.
 */

// Reanimated: статичный мок, useReducedMotion → true (без анимаций в тестах).
// withTiming/withSpring вызывают колбэк завершения — Dialog успевает размонтироваться.
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const NOOP = () => {};
  const createAnimatedComponent = (component) => component;
  const Animated = {
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    createAnimatedComponent,
  };
  return {
    __esModule: true,
    default: Animated,
    Animated,
    useSharedValue: (initial) => ({ value: initial }),
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedStyle: (fn) => ({}),
    useAnimatedReaction: NOOP,
    useAnimatedProps: (fn) => ({}),
    withTiming: (to, _options, callback) => {
      if (typeof callback === 'function') callback(true);
      return to;
    },
    withSpring: (to, _options, callback) => {
      if (typeof callback === 'function') callback(true);
      return to;
    },
    withDelay: (_delay, animation) => animation,
    withRepeat: (animation) => animation,
    withSequence: (...animations) => animations[0],
    cancelAnimation: NOOP,
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    Easing: {
      linear: {},
      ease: {},
      quad: () => ({}),
      cubic: () => ({}),
      out: (e) => e,
      in: (e) => e,
      inOut: (e) => e,
      bezier: () => ({}),
    },
    useReducedMotion: () => true,
  };
});

// AsyncStorage: официальный мок из пакета
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Haptics: без нативных вызовов
jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// SafeAreaProvider: официальный мок (children рендерятся всегда, insets = 0)
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);
