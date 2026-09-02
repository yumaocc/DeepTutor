import {Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useKeyboardMetrics} from '../platform/keyboard/KeyboardMetricsProvider';

interface KeyboardInsetOptions {
  includeOnResizePlatforms?: boolean;
}

export function useKeyboardInsets(options: KeyboardInsetOptions = {}) {
  const keyboard = useKeyboardMetrics();
  const safeArea = useSafeAreaInsets();
  const windowAlreadyResizes = Platform.OS === 'android';
  const shouldApplyInset =
    keyboard.visible &&
    (options.includeOnResizePlatforms || !windowAlreadyResizes);

  return {
    ...keyboard,
    bottomInset: shouldApplyInset
      ? Math.max(0, keyboard.height - safeArea.bottom)
      : 0,
  };
}
