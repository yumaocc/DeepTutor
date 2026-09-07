import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {Icon, Text, TouchableRipple} from 'react-native-paper';
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
export function ChatEmptyState() {
  const aui = useAui();
  return (
    <View style={styles.root}>
      <View style={styles.welcome}>
        <View style={styles.orb}>
          <ChatOrb />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {'你好，今天有什么\n可以帮你？'}
        </Text>
        <View style={styles.prompts}>
          {prompts.map(p => (
            <TouchableRipple
              key={p.title}
              borderless
              style={styles.hit}
              accessibilityRole="button"
              accessibilityLabel={p.title}
              onPress={() => aui.composer.setText(p.draft)}>
              <View style={styles.pill}>
                <Icon source={p.icon} color={p.color} size={15} />
                <Text style={styles.label}>{p.title}</Text>
              </View>
            </TouchableRipple>
          ))}
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  welcome: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    alignItems: 'center',
  },
  orb: {marginBottom: tokens.space.lg},
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    lineHeight: 33,
    fontWeight: '500',
    color: tokens.color.ink,
    textAlign: 'center',
  },
  prompts: {
    marginTop: tokens.space.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: tokens.space.xs,
    width: '100%',
  },
  hit: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.border,
  },
  label: {fontSize: 12, color: tokens.color.ink},
});
