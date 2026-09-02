import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Keyboard,
  type KeyboardEvent,
  Platform,
  useWindowDimensions,
} from 'react-native';

export interface KeyboardMetrics {
  visible: boolean;
  height: number;
  screenY: number;
  duration: number;
  easing?: string;
}

const HIDDEN_KEYBOARD: KeyboardMetrics = {
  visible: false,
  height: 0,
  screenY: 0,
  duration: 0,
};

const KeyboardMetricsContext = createContext<KeyboardMetrics | null>(null);

export function keyboardMetricsFromEvent(
  event: KeyboardEvent,
  viewportHeight: number,
): KeyboardMetrics {
  const screenY = event.endCoordinates.screenY;
  const overlap = Math.max(0, viewportHeight - screenY);
  const height = Math.min(
    viewportHeight,
    Math.max(event.endCoordinates.height, overlap),
  );

  return {
    visible: height > 0,
    height,
    screenY,
    duration: event.duration || 250,
    easing: event.easing,
  };
}

export function KeyboardMetricsProvider({
  children,
}: React.PropsWithChildren): JSX.Element {
  const {height: viewportHeight} = useWindowDimensions();
  const [metrics, setMetrics] = useState<KeyboardMetrics>(HIDDEN_KEYBOARD);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, event => {
      setMetrics(keyboardMetricsFromEvent(event, viewportHeight));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, event => {
      setMetrics({
        ...HIDDEN_KEYBOARD,
        screenY: event.endCoordinates.screenY,
        duration: event.duration || 200,
        easing: event.easing,
      });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [viewportHeight]);

  const value = useMemo(() => metrics, [metrics]);
  return (
    <KeyboardMetricsContext.Provider value={value}>
      {children}
    </KeyboardMetricsContext.Provider>
  );
}

export function useKeyboardMetrics(): KeyboardMetrics {
  const value = useContext(KeyboardMetricsContext);
  if (!value) {
    throw new Error(
      'useKeyboardMetrics must be used inside KeyboardMetricsProvider',
    );
  }
  return value;
}
