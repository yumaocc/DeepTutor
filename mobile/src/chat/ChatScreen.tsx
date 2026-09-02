import React from 'react';
import {StyleSheet, View} from 'react-native';
import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react-native';
import {Surface, Text} from 'react-native-paper';
import Animated, {FadeIn} from 'react-native-reanimated';

import {SafeAreaScreen} from '../components/layout/SafeAreaScreen';
import {tokens} from '../theme/tokens';

function ChatMessage(): JSX.Element {
  const role = useAuiState(state => state.message.role);
  const assistant = role === 'assistant';

  return (
    <MessagePrimitive.Root
      style={[
        styles.messageRow,
        assistant ? styles.assistantRow : styles.userRow,
      ]}>
      {assistant ? <Text style={styles.roleLabel}>DeepTutor</Text> : null}
      <Surface
        elevation={assistant ? 0 : 1}
        style={[
          styles.messageSurface,
          assistant ? styles.assistantMessage : styles.userMessage,
        ]}>
        <MessagePrimitive.Content
          renderText={({part}) => (
            <Text style={assistant ? styles.assistantText : styles.userText}>
              {part.text}
            </Text>
          )}
        />
      </Surface>
    </MessagePrimitive.Root>
  );
}

function ComposerAction(): JSX.Element {
  const running = useAuiState(state => state.thread.isRunning);
  const label = running ? '停止' : '发送';
  const Primitive = running ? ComposerPrimitive.Cancel : ComposerPrimitive.Send;

  return (
    <Primitive style={styles.actionHit} accessibilityLabel={label}>
      {({pressed}) => (
        <Surface
          elevation={0}
          style={[
            styles.action,
            running ? styles.stopAction : styles.sendAction,
            pressed && styles.actionPressed,
          ]}>
          <Text style={styles.actionText}>{label}</Text>
        </Surface>
      )}
    </Primitive>
  );
}

export function ChatScreen(): JSX.Element {
  return (
    <SafeAreaScreen style={styles.screen}>
      <ThreadPrimitive.Root style={styles.thread}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.header}>
          <View>
            <Text variant="titleLarge" style={styles.title}>
              DeepTutor
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              RN + Paper + Assistant UI + RNOH
            </Text>
          </View>
          <Surface elevation={0} style={styles.statusBadge}>
            <Text variant="labelSmall" style={styles.statusText}>
              PoC
            </Text>
          </Surface>
        </Animated.View>

        <ThreadPrimitive.MessagesFlatList
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          components={{Message: ChatMessage}}
          keyboardShouldPersistTaps="handled"
        />

        <ComposerPrimitive.Root style={styles.composer}>
          <ComposerPrimitive.Input
            style={styles.input}
            placeholder="问一个具体问题…"
            placeholderTextColor={tokens.color.muted}
            multiline
          />
          <ComposerAction />
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: tokens.color.canvas},
  thread: {flex: 1},
  header: {
    minHeight: 76,
    paddingTop: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {color: tokens.color.ink, fontWeight: '700'},
  subtitle: {marginTop: 2, color: tokens.color.muted},
  statusBadge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.primaryMuted,
  },
  statusText: {color: tokens.color.primaryPressed, fontWeight: '700'},
  messages: {flex: 1},
  messagesContent: {padding: tokens.space.md, gap: tokens.space.md},
  messageRow: {maxWidth: '88%'},
  assistantRow: {alignSelf: 'flex-start'},
  userRow: {alignSelf: 'flex-end'},
  roleLabel: {
    marginBottom: 4,
    color: tokens.color.muted,
    fontSize: tokens.type.caption,
    fontWeight: '600',
  },
  messageSurface: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  assistantMessage: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
  },
  userMessage: {
    borderRadius: tokens.radius.lg,
    borderBottomRightRadius: 4,
    backgroundColor: tokens.color.primary,
  },
  assistantText: {
    color: tokens.color.ink,
    fontSize: tokens.type.reading,
    lineHeight: 25,
  },
  userText: {
    color: tokens.color.onPrimary,
    fontSize: tokens.type.body,
    lineHeight: 22,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
  },
  input: {
    flex: 1,
    minHeight: tokens.size.composer,
    maxHeight: 132,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surfaceMuted,
    color: tokens.color.ink,
    fontSize: tokens.type.reading,
    lineHeight: 24,
  },
  actionHit: {
    width: tokens.size.composer,
    height: tokens.size.composer,
    marginLeft: tokens.space.sm,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.lg,
  },
  sendAction: {backgroundColor: tokens.color.primary},
  stopAction: {backgroundColor: tokens.color.error},
  actionPressed: {opacity: 0.82},
  actionText: {color: tokens.color.onPrimary, fontWeight: '700'},
});
