import React, {useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import {useStartup} from './StartupProvider';
import {tokens} from '../../theme/tokens';

/** One cold-start reveal; authentication and network work continue underneath. */
export function LaunchExperience({
  children,
}: React.PropsWithChildren): JSX.Element {
  const {state} = useStartup();
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(true);
  const started = useRef(Date.now()).current;
  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (alive) {
          setReduced(value);
        }
      })
      .catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      alive = false;
      listener.remove();
    };
  }, []);
  useEffect(() => {
    if (reduced || !visible) {
      scale.setValue(1);
      return;
    }
    scale.setValue(tokens.launch.initialScale);
    const animation = Animated.timing(scale, {
      toValue: 1,
      duration: tokens.launch.arriveDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, scale, visible]);
  useEffect(() => {
    if (!visible || state.phase === 'booting') {
      return;
    }
    const animation = Animated.sequence([
      Animated.delay(
        Math.max(0, tokens.launch.minimumDuration - (Date.now() - started)),
      ),
      Animated.timing(fade, {
        toValue: 0,
        duration: reduced ? 120 : tokens.launch.exitDuration,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({finished}) => {
      if (finished) {
        setVisible(false);
      }
    });
    return () => animation.stop();
  }, [fade, reduced, started, state.phase, visible]);
  return (
    <View style={styles.root}>
      <View
        style={styles.root}
        accessibilityElementsHidden={visible}
        importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      {visible ? (
        <Animated.View
          style={[styles.cover, {opacity: fade}]}
          accessible
          accessibilityLabel="DeepTutor 正在启动">
          <Animated.View style={{transform: [{scale}]}}>
            <Image
              source={require('../../chat/assets/chat-orb.png')}
              style={styles.orb}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: tokens.color.canvas},
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {width: tokens.launch.orbSize, height: tokens.launch.orbSize},
});
