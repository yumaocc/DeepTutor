/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4
 * macrostructure: Long Document (native conversation) · theme: studied-DNA / Keitoto reference
 * genre: modern-minimal · nav: N9 native app bar · footer: persistent composer
 * design-system: DESIGN.md · enrichment: none · tone: quiet and precise / native adaptation
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DrawerActions,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerItem,
  type DrawerContentComponentProps,
  type DrawerNavigationProp,
} from '@react-navigation/drawer';
import {
  Alert,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react-native';
import {
  Button,
  Icon,
  IconButton,
  Surface,
  Text,
  PaperProvider,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {RootStackParamList} from '../app/navigation/types';
import {SafeAreaScreen} from '../components/layout/SafeAreaScreen';
import {ChatProvider, useChat} from './ChatProvider';
import {ChatControls, AskUser} from './ChatControls';
import {MessageContent} from './MessageContent';
import {ChatAtmosphere, ChatOrb} from './ChatVisual';
import {ChatEmptyState} from './ChatEmptyState';
import {AddAttachments, ComposerAttachments} from './ComposerImages';
import {ThinkingIndicator} from './ThinkingIndicator';
import type {ChatMessage as ChatMessageData} from './protocol';
import {chatTheme, chatTokens as tokens} from '../theme/chatTheme';
import {useStartup} from '../app/startup/StartupProvider';

type ChatDrawerParamList = {Conversation: undefined};
const Drawer = createDrawerNavigator<ChatDrawerParamList>();
interface ChatDrawerUiState {
  sessionId?: string;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  modelsOpen: boolean;
  setModelsOpen: (open: boolean) => void;
}
const ChatDrawerUiContext = createContext<ChatDrawerUiState | null>(null);

function useChatDrawerUi(): ChatDrawerUiState {
  const value = useContext(ChatDrawerUiContext);
  if (!value) {
    throw new Error('ChatDrawerUiContext is missing');
  }
  return value;
}

const HelpDrawerIcon = ({color, size}: {color: string; size: number}) => (
  <Icon source="help-circle-outline" color={color} size={size} />
);
const HistoryDrawerIcon = ({color, size}: {color: string; size: number}) => (
  <Icon source="history" color={color} size={size} />
);
const RefreshDrawerIcon = ({color, size}: {color: string; size: number}) => (
  <Icon source="refresh" color={color} size={size} />
);

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
      {assistant ? (
        <View style={styles.assistantMessage}>
          <MessageContent message={message} />
        </View>
      ) : (
        <Surface mode="flat" elevation={0} style={styles.userMessage}>
          <MessageContent message={message} />
        </Surface>
      )}
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
  const route = useRoute<RouteProp<RootStackParamList, 'Main'>>();
  return (
    <PaperProvider theme={chatTheme}>
      <ChatProvider>
        <ChatDrawer sessionId={route.params?.sessionId} />
      </ChatProvider>
    </PaperProvider>
  );
}

function ChatDrawer({sessionId}: {sessionId?: string}): JSX.Element {
  const {width} = useWindowDimensions();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const drawerUi = useMemo(
    () => ({
      sessionId,
      historyOpen,
      setHistoryOpen,
      modelsOpen,
      setModelsOpen,
    }),
    [historyOpen, modelsOpen, sessionId],
  );
  return (
    <ChatDrawerUiContext.Provider value={drawerUi}>
      <Drawer.Navigator
        drawerContent={ChatDrawerContent}
        screenOptions={{
          headerShown: false,
          drawerType: 'front',
          drawerStyle: {
            width: Math.min(Math.max(width * 0.78, 280), 304),
            backgroundColor: tokens.color.surface,
            borderTopRightRadius: tokens.radius.lg,
            borderBottomRightRadius: tokens.radius.lg,
          },
          overlayColor: tokens.color.scrim,
          swipeEdgeWidth: tokens.size.touch,
          swipeMinDistance: tokens.space.lg,
          keyboardDismissMode: 'on-drag',
        }}>
        <Drawer.Screen name="Conversation" component={ChatDrawerScene} />
      </Drawer.Navigator>
    </ChatDrawerUiContext.Provider>
  );
}

function ChatDrawerContent({
  navigation,
}: DrawerContentComponentProps): JSX.Element {
  const {setHistoryOpen, setModelsOpen} = useChatDrawerUi();
  const {client, snapshot, isGuest, trial} = useChat();
  const {showLogin} = useStartup();
  const close = () => navigation.closeDrawer();
  return (
    <SafeAreaView edges={['top', 'bottom', 'left']} style={styles.drawerRoot}>
      <View style={styles.drawerHeader}>
        <View>
          <Text accessibilityRole="header" style={styles.drawerTitle}>
            DeepTutor
          </Text>
          <Text style={styles.drawerSubtitle}>学习菜单</Text>
        </View>
        <IconButton
          icon="close"
          accessibilityLabel="关闭导航菜单"
          size={20}
          onPress={close}
        />
      </View>
      <View style={styles.drawerNavigation}>
        <DrawerItem
          icon={HelpDrawerIcon}
          label="使用帮助"
          inactiveTintColor={tokens.color.body}
          pressColor={tokens.color.primaryMuted}
          onPress={() => {
            close();
            Alert.alert(
              'DeepTutor',
              isGuest
                ? '免费试用支持文字、图片和文件对话。登录后可以使用更多学习能力。'
                : '点击快捷入口填入问题，或直接输入文字。加号可添加图片或文件，发送后可随时停止生成。左上角可查看历史对话。',
            );
          }}
        />
        <DrawerItem
          icon={HistoryDrawerIcon}
          label="历史会话"
          inactiveTintColor={tokens.color.body}
          pressColor={tokens.color.primaryMuted}
          onPress={() => {
            close();
            setHistoryOpen(true);
          }}
        />
        <DrawerItem
          icon={RefreshDrawerIcon}
          label="重新生成"
          inactiveTintColor={tokens.color.body}
          pressColor={tokens.color.primaryMuted}
          onPress={() => {
            if (
              snapshot.running ||
              snapshot.loading ||
              !snapshot.sessionId
            ) {
              return;
            }
            close();
            client.regenerate().catch(() => undefined);
          }}
        />
      </View>
      <View style={styles.drawerFooter}>
        <View style={styles.accountCopy}>
          <Text style={styles.accountTitle}>
            {isGuest ? '免费试用' : '当前账号'}
          </Text>
          <Text style={styles.accountHint} numberOfLines={1}>
            {isGuest
              ? trial?.status === 'exhausted'
                ? '试用次数已用完'
                : `还可对话 ${trial?.turns_remaining ?? 0} 次`
              : '可切换本次对话使用的模型'}
          </Text>
        </View>
        <Button
          icon={isGuest ? 'account-arrow-right-outline' : 'brain'}
          mode={isGuest ? 'contained-tonal' : 'outlined'}
          textColor={
            isGuest ? tokens.color.primaryPressed : tokens.color.ink
          }
          contentStyle={styles.accountButtonContent}
          style={styles.accountButton}
          onPress={() => {
            close();
            if (isGuest) {
              showLogin();
            } else {
              setModelsOpen(true);
            }
          }}>
          {isGuest ? '登录' : '选择模型'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function ChatDrawerScene(): JSX.Element {
  return <ChatWorkspace />;
}

function ChatWorkspace(): JSX.Element {
  const {
    sessionId,
    historyOpen,
    setHistoryOpen,
    modelsOpen,
    setModelsOpen,
  } = useChatDrawerUi();
  const {client, snapshot, isGuest, trial} = useChat();
  const {showLogin} = useStartup();
  const navigation =
    useNavigation<DrawerNavigationProp<ChatDrawerParamList, 'Conversation'>>();
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
            onOpenDrawer={() => navigation.dispatch(DrawerActions.openDrawer())}
            historyOpen={historyOpen}
            onHistoryOpenChange={setHistoryOpen}
            modelsOpen={modelsOpen}
            onModelsOpenChange={setModelsOpen}
            title={
              <View style={styles.brand}>
                <Text style={styles.title}>
                  {snapshot.messages.length
                    ? '\u5b66\u4e60\u5bf9\u8bdd'
                    : '\u65b0\u5bf9\u8bdd'}
                </Text>
                {isGuest ? (
                  <Text style={styles.subtitle}>
                    {trial?.status === 'exhausted'
                      ? '免费试用额度已用完'
                      : `免费试用 · 剩余 ${trial?.turns_remaining ?? 0} 次`}
                  </Text>
                ) : !['idle', 'connected'].includes(snapshot.connection) ? (
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
                <ChatEmptyState isGuest={isGuest} />
              )
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.bottom}>
            <AskUser />
            {isGuest && trial?.status === 'exhausted' ? (
              <View style={styles.trialFinished}>
                <View style={styles.trialFinishedCopy}>
                  <Text style={styles.trialFinishedTitle}>免费试用已完成</Text>
                  <Text style={styles.trialFinishedHint}>
                    登录后继续提问，并使用完整学习能力。
                  </Text>
                </View>
                <Button compact mode="contained" onPress={showLogin}>
                  登录
                </Button>
              </View>
            ) : (
              <Surface
                mode="flat"
                elevation={0}
                style={[
                  styles.composerSurface,
                  Boolean(snapshot.error) && styles.composerError,
                ]}>
                <ComposerPrimitive.Root style={styles.composer}>
                  <ComposerAttachments />
                  <View style={styles.inputRow}>
                    <AddAttachments />
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
              </Surface>
            )}
          </View>
        </ThreadPrimitive.Root>
      </SafeAreaScreen>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: tokens.color.canvas},
  drawerRoot: {flex: 1, backgroundColor: tokens.color.surface},
  drawerHeader: {
    minHeight: 72,
    paddingLeft: tokens.space.lg,
    paddingRight: tokens.space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerTitle: {
    fontSize: tokens.type.title,
    fontWeight: '600',
    color: tokens.color.ink,
  },
  drawerSubtitle: {
    marginTop: tokens.space.xxs,
    fontSize: tokens.type.caption,
    color: tokens.color.muted,
  },
  drawerNavigation: {flex: 1, paddingTop: tokens.space.md},
  drawerFooter: {
    margin: tokens.space.md,
    paddingTop: tokens.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.color.border,
  },
  accountCopy: {paddingHorizontal: tokens.space.xxs},
  accountTitle: {
    fontSize: tokens.type.label,
    fontWeight: '600',
    color: tokens.color.ink,
  },
  accountHint: {
    marginTop: tokens.space.xxs,
    fontSize: tokens.type.caption,
    color: tokens.color.muted,
  },
  accountButton: {
    marginTop: tokens.space.md,
    borderRadius: tokens.radius.full,
    borderColor: tokens.color.border,
  },
  accountButtonContent: {minHeight: tokens.size.touch},
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
  trialFinished: {
    minHeight: tokens.size.touch,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  trialFinishedCopy: {flex: 1},
  trialFinishedTitle: {
    color: tokens.color.ink,
    fontSize: tokens.type.body,
    fontWeight: '600',
  },
  trialFinishedHint: {
    color: tokens.color.muted,
    fontSize: tokens.type.caption,
    marginTop: tokens.space.xxs,
  },
  composerSurface: {
    borderRadius: tokens.size.composer / 2,
    backgroundColor: tokens.color.surface,
    shadowColor: tokens.color.shadowSoft,
    shadowOffset: {width: 0, height: tokens.chat.composerShadowOffset},
    shadowOpacity: tokens.chat.composerShadowOpacity,
    shadowRadius: tokens.chat.composerShadowRadius,
    elevation: tokens.chat.composerElevation,
  },
  composer: {padding: tokens.space.xxs},
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
  actionPressed: {
    opacity: 0.82,
    transform: [{scale: tokens.chat.raisedScale}],
  },
  actionFocused: {borderColor: tokens.color.ink},
});
