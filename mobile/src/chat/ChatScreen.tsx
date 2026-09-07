/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4
 * macrostructure: Long Document (native conversation) · theme: studied-DNA / Keitoto reference
 * genre: modern-minimal · nav: N9 native app bar · footer: persistent composer
 * design-system: DESIGN.md · enrichment: none · tone: quiet and precise / native adaptation
 */
import React, {useEffect, useState} from 'react';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {StatusBar, StyleSheet, View} from 'react-native';
import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react-native';
import {Icon, Text, PaperProvider} from 'react-native-paper';
import type {RootStackParamList} from '../app/navigation/types';
import {SafeAreaScreen} from '../components/layout/SafeAreaScreen';
import {ChatProvider, useChat} from './ChatProvider';
import {ChatControls, AskUser} from './ChatControls';
import {MessageContent} from './MessageContent';
import {ChatAtmosphere, ChatOrb} from './ChatVisual';
import {ChatEmptyState} from './ChatEmptyState';
import {AddImages, ComposerImages} from './ComposerImages';
import {ThinkingIndicator} from './ThinkingIndicator';
import type {ChatMessage as ChatMessageData} from './protocol';
import {chatTheme, chatTokens as tokens} from '../theme/chatTheme';

function ChatMessage(): JSX.Element {
  const role = useAuiState(state => state.message.role);
  const assistant = role !== 'user';
  const message = useAuiState(
    state => state.message.metadata.custom.deeptutor,
  ) as ChatMessageData;
  return (
    <MessagePrimitive.Root
      style={[
        styles.messageRow,
        assistant ? styles.assistantRow : styles.userRow,
        !assistant && message.attachments.length > 0 && styles.userImageRow,
      ]}>
      {assistant ? (
        <View style={styles.role}>
          <Icon
            source="creation"
            size={tokens.type.reading}
            color={tokens.color.primary}
          />
          <Text style={styles.roleLabel}>{'\u56de\u7b54'}</Text>
        </View>
      ) : null}
      <View style={assistant ? styles.assistantMessage : styles.userMessage}>
        <MessageContent message={message} />
      </View>
    </MessagePrimitive.Root>
  );
}
function ComposerAction(): JSX.Element {
  const running = useAuiState(state => state.thread.isRunning);
  const hasText = useAuiState(
    state =>
      Boolean(state.composer.text.trim()) ||
      state.composer.attachments.length > 0,
  );
  const [focused, setFocused] = useState(false);
  const label = running ? '停止生成' : '发送消息';
  const Primitive = running ? ComposerPrimitive.Cancel : ComposerPrimitive.Send;
  return (
    <Primitive
      accessibilityLabel={label}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={styles.actionHit}>
      {({pressed}) => (
        <View
          style={[
            styles.action,
            !hasText && !running && styles.actionDisabled,
            pressed && styles.actionPressed,
            focused && styles.actionFocused,
          ]}>
          <Icon
            source={running ? 'stop' : 'arrow-up'}
            size={tokens.chat.icon}
            color={tokens.color.onPrimary}
          />
        </View>
      )}
    </Primitive>
  );
}
export function ChatScreen(): JSX.Element {
  return (
    <PaperProvider theme={chatTheme}>
      <ChatProvider>
        <ChatWorkspace />
      </ChatProvider>
    </PaperProvider>
  );
}
function ChatWorkspace(): JSX.Element {
  const {client, snapshot} = useChat();
  const route = useRoute<RouteProp<RootStackParamList, 'Main'>>();
  const sessionId = route.params?.sessionId;
  useEffect(() => {
    if (sessionId) {
      client.loadSession(sessionId).catch(() => undefined);
    }
  }, [client, sessionId]);
  const status = {
    idle: '随时开始',
    connected: '已连接',
    connecting: '连接中',
    reconnecting: '正在重连',
    offline: '离线',
    suspended: '连接已暂停',
    closed: '连接已断开',
  }[snapshot.connection];
  return (
    <View style={styles.screen}>
      <ChatAtmosphere />
      <SafeAreaScreen>
        <StatusBar
          backgroundColor="transparent"
          translucent
          barStyle="dark-content"
        />
        <ThreadPrimitive.Root style={styles.thread}>
          <ChatControls
            title={
              <View style={styles.brand}>
                <Text style={styles.title}>
                  {snapshot.messages.length
                    ? '\u5b66\u4e60\u5bf9\u8bdd'
                    : '\u65b0\u5bf9\u8bdd'}
                </Text>
                {!['idle', 'connected'].includes(snapshot.connection) ? (
                  <Text style={styles.subtitle}>{status}</Text>
                ) : null}
              </View>
            }
          />
          <ThreadPrimitive.MessagesFlatList
            style={styles.messages}
            contentContainerStyle={[
              styles.messagesContent,
              !snapshot.messages.length && styles.emptyContent,
            ]}
            components={{Message: ChatMessage}}
            ListHeaderComponent={
              snapshot.messages.length ? (
                <View style={styles.conversationOrb}>
                  <ChatOrb size={80} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              snapshot.loading ? (
                <ThinkingIndicator label="正在载入对话" />
              ) : (
                <ChatEmptyState />
              )
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.bottom}>
            <AskUser />
            <ComposerPrimitive.Root
              style={[
                styles.composer,
                Boolean(snapshot.error) && styles.composerError,
              ]}>
              <ComposerImages />
              <View style={styles.inputRow}>
                <AddImages />
                <ComposerPrimitive.Input
                  style={styles.input}
                  accessibilityLabel="消息"
                  placeholder="写下你的问题…"
                  placeholderTextColor={tokens.color.muted}
                  multiline
                />
                <ComposerAction />
              </View>
            </ComposerPrimitive.Root>
          </View>
        </ThreadPrimitive.Root>
      </SafeAreaScreen>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: tokens.color.canvas},
  thread: {flex: 1},
  conversationOrb: {alignItems: 'center', paddingVertical: tokens.space.lg},
  brand: {flex: 1, minWidth: 0, alignItems: 'center'},
  title: {
    color: tokens.color.ink,
    fontSize: tokens.chat.brandSize,
    letterSpacing: tokens.chat.brandTracking,
    fontWeight: '600',
  },
  subtitle: {
    color: tokens.color.muted,
    fontSize: tokens.type.caption,
    marginTop: tokens.space.xxs,
  },
  messages: {flex: 1},
  messagesContent: {
    paddingHorizontal: tokens.chat.gutter,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
    gap: tokens.chat.messageGap,
    width: '100%',
    maxWidth: tokens.chat.maxWidth,
    alignSelf: 'center',
  },
  emptyContent: {flexGrow: 1},
  messageRow: {maxWidth: '100%'},
  assistantRow: {alignSelf: 'flex-start', width: '100%'},
  userRow: {alignSelf: 'flex-end', maxWidth: '85%'},
  userImageRow: {width: '75%', maxWidth: 280},
  role: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    marginBottom: tokens.space.xs,
  },
  roleLabel: {
    color: tokens.color.muted,
    fontSize: tokens.type.caption,
    fontWeight: '600',
  },
  assistantMessage: {width: '100%'},
  userMessage: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
  },
  bottom: {
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.md,
    paddingTop: tokens.space.sm,
    width: '100%',
    maxWidth: tokens.chat.maxWidth,
    alignSelf: 'center',
    backgroundColor: tokens.color.canvas,
  },
  inputRow: {flexDirection: 'row', alignItems: 'center'},
  composer: {
    padding: tokens.space.xxs,
    shadowColor: tokens.color.ink,
    shadowOffset: {width: 0, height: tokens.chat.composerShadowOffset},
    shadowOpacity: tokens.composer.shadowOpacity,
    shadowRadius: tokens.chat.composerShadowRadius,
    elevation: tokens.composer.elevation,
    borderRadius: tokens.size.composer / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
  },
  composerError: {backgroundColor: tokens.color.errorSoft},
  input: {
    flex: 1,
    minHeight: tokens.size.touch,
    maxHeight: tokens.size.composer * 2,
    paddingHorizontal: tokens.space.xxs,
    paddingVertical: tokens.space.sm,
    color: tokens.color.ink,
    fontSize: tokens.type.label,
    lineHeight: tokens.chat.line,
  },
  actionHit: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    width: tokens.composer.action,
    height: tokens.composer.action,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.ink,
    borderWidth: tokens.chat.focusRule,
    borderColor: 'transparent',
  },
  actionDisabled: {
    opacity: tokens.chat.disabledOpacity,
  },
  actionPressed: {opacity: 0.65},
  actionFocused: {borderColor: tokens.color.ink},
});
