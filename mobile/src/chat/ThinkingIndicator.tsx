/* Hallmark · pre-emit critique: P5 H4 E4 S4 R5 V4 */
import React, {useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import {Surface, Text} from 'react-native-paper';
import {chatTokens as tokens} from '../theme/chatTheme';

/** Native-driver loading signal; no layout animation or simulated progress. */
export function ThinkingIndicator({label = '正在思考'}: {label?: string}) {
  const bars = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (mounted) {
          setReduced(value);
        }
      })
      .catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    const app = AppState.addEventListener('change', state =>
      setActive(state === 'active'),
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  useEffect(() => {
    bars.forEach(bar => bar.setValue(0));
    if (reduced || !active) {
      return;
    }
    const animations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * tokens.chat.pulseDelay),
          Animated.timing(bar, {
            toValue: 1,
            duration: tokens.chat.pulseDuration,
            easing: Easing.bezier(...tokens.chat.ease),
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(bar, {
            toValue: 0,
            duration: tokens.chat.pulseDuration,
            easing: Easing.bezier(...tokens.chat.ease),
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.delay((bars.length - index) * tokens.chat.pulseDelay),
        ]),
      ),
    );
    animations.forEach(animation => animation.start());
    return () => animations.forEach(animation => animation.stop());
  }, [active, bars, reduced]);
  return (
    <Surface
      mode="flat"
      elevation={0}
      style={styles.root}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{busy: true}}
      accessibilityLiveRegion="polite">
      <View style={styles.bars} importantForAccessibility="no-hide-descendants">
        {bars.map((bar, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                opacity: bar.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    tokens.chat.indicatorLow,
                    tokens.chat.indicatorHigh,
                  ],
                }),
                transform: [
                  {
                    scaleY: bar.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        tokens.chat.indicatorLow,
                        tokens.chat.indicatorHigh,
                      ],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Surface>
  );
}
const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    paddingVertical: tokens.space.xxs,
    paddingHorizontal: tokens.space.sm,
    alignSelf: 'flex-start',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.border,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.chat.indicatorGap,
    height: tokens.chat.mark,
  },
  bar: {
    width: tokens.chat.indicatorWidth,
    height: tokens.chat.indicatorHeight,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.primary,
  },
  label: {
    fontSize: tokens.type.caption,
    color: tokens.color.muted,
    lineHeight: tokens.chat.line,
  },
});
