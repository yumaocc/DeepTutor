import React, {useEffect, useRef} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {Icon, Surface, Text, TouchableRipple} from 'react-native-paper';
import {useAui} from '@assistant-ui/react-native';
import {chatTokens as tokens} from '../theme/chatTheme';
import {ChatOrb} from './ChatVisual';
const prompts = [
  {
    icon: 'chat-processing',
    title: '自由提问',
    color: '#8850EB',
    draft: '我想了解：',
  },
  {
    icon: 'image-outline',
    title: '看图解题',
    color: '#27B964',
    draft: '请帮我分析图片中的题目：',
  },
  {
    icon: 'code-tags',
    title: '编程',
    color: '#416DF0',
    draft: '请帮我理解这段代码：',
  },
  {
    icon: 'chart-bar',
    title: '深入分析',
    color: '#CD45DE',
    draft: '请深入分析这个问题：',
  },
  {
    icon: 'lightbulb',
    title: '探索思路',
    color: '#D89C14',
    draft: '请帮我探索解决这个问题的不同思路：',
  },
];
const guestPrompts = [
  prompts[0],
  {
    icon: 'lightbulb-outline',
    title: '讲清概念',
    color: '#D89C14',
    draft: '请帮我讲清楚这个概念：',
  },
  {
    icon: 'pencil-outline',
    title: '拆解问题',
    color: '#416DF0',
    draft: '请一步一步帮我理解这个问题：',
  },
];
export function ChatEmptyState({isGuest = false}: {isGuest?: boolean}) {
  const aui = useAui();
  const visiblePrompts = isGuest ? guestPrompts : prompts;
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduced => {
        if (!mounted) {
          return;
        }
        if (reduced) {
          entrance.setValue(1);
          return;
        }
        animation = Animated.timing(entrance, {
          toValue: 1,
          duration: tokens.chat.entranceDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
          isInteraction: false,
        });
        animation.start();
      })
      .catch(() => entrance.setValue(1));
    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [entrance]);
  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.welcome,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [tokens.chat.entranceDistance, 0],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.orb}>
          <ChatOrb />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {'你好，今天有什么\n可以帮你？'}
        </Text>
        <View style={styles.prompts}>
          {visiblePrompts.map(p => (
            <Surface
              key={p.title}
              mode="elevated"
              elevation={tokens.chat.surfaceElevation}
              style={styles.pillSurface}>
              <TouchableRipple
                borderless
                style={styles.hit}
                hitSlop={tokens.space.xxs}
                accessibilityRole="button"
                accessibilityLabel={p.title}
                onPress={() => aui.composer.setText(p.draft)}>
                <View style={styles.pill}>
                  <Icon
                    source={p.icon}
                    color={p.color}
                    size={tokens.chat.promptIcon}
                  />
                  <Text style={styles.label}>{p.title}</Text>
                </View>
              </TouchableRipple>
            </Surface>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingBottom: tokens.space.xl,
  },
  welcome: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    alignItems: 'center',
  },
  orb: {marginBottom: tokens.space.md},
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    lineHeight: 33,
    fontWeight: '500',
    color: tokens.color.ink,
    textAlign: 'center',
  },
  prompts: {
    marginTop: tokens.space.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: tokens.space.xs,
    width: '100%',
  },
  hit: {
    height: tokens.chat.promptHeight,
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
  },
  pillSurface: {
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.surface,
    shadowColor: tokens.color.shadowSoft,
    shadowOffset: {width: 0, height: tokens.chat.surfaceShadowOffset},
    shadowOpacity: tokens.chat.surfaceShadowOpacity,
    shadowRadius: tokens.chat.surfaceShadowRadius,
    elevation: tokens.chat.surfaceElevation,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.surface,
  },
  label: {fontSize: tokens.type.caption, color: tokens.color.ink},
});
