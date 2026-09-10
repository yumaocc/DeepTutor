/* Hallmark · component: navigation drawer · genre: modern-minimal · theme: DeepTutor locked system
 * critique: P5 H5 E4 S5 R5 V4 · contrast: pass · mobile: 320 / 375 / 414 / 768
 */
import React, {useEffect, useState} from 'react';
import {
  AccessibilityInfo,
  Alert,
  FlatList,
  Modal,
  StatusBar,
  View,
  StyleSheet,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  IconButton,
  List,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import {chatTokens as tokens} from '../theme/chatTheme';
import {withMinimumDuration} from './minimumDuration';
import {ChatAtmosphere} from './ChatVisual';
import {SafeAreaScreen} from '../components/layout/SafeAreaScreen';
import {useChat} from './ChatProvider';
import {useAui} from '@assistant-ui/react-native';
import {record} from './protocol';
import type {LlmOption} from './ChatClient';
import {useInfiniteQuery} from '@tanstack/react-query';
const HistoryIcon = () => (
  <List.Icon icon="message-outline" color={tokens.color.primary} />
);
const HistoryChevron = () => (
  <List.Icon icon="chevron-right" color={tokens.color.muted} />
);
const HistoryLoading = () => (
  <ActivityIndicator
    size="small"
    color={tokens.color.primary}
    style={{marginHorizontal: tokens.space.md}}
  />
);
const SelectedModelIcon = () => (
  <List.Icon icon="check-circle" color={tokens.color.primary} />
);
const UnselectedModelIcon = () => (
  <List.Icon icon="circle-outline" color={tokens.color.muted} />
);
function HeaderAction({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Surface
      mode="elevated"
      elevation={tokens.chat.surfaceElevation}
      style={styles.iconSurface}>
      <IconButton
        icon={icon}
        accessibilityLabel={label}
        disabled={disabled}
        size={tokens.chat.icon}
        style={styles.iconButton}
        hitSlop={tokens.space.xxs}
        onPress={onPress}
      />
    </Surface>
  );
}
interface ChatControlsProps {
  title: React.ReactNode;
  onOpenDrawer: () => void;
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  modelsOpen: boolean;
  onModelsOpenChange: (open: boolean) => void;
}

export function ChatControls({
  title,
  onOpenDrawer,
  historyOpen,
  onHistoryOpenChange,
  modelsOpen,
  onModelsOpenChange,
}: ChatControlsProps) {
  const aui = useAui();
  const {client, snapshot, server, identity} = useChat();
  const [reducedMotion, setReducedMotion] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [models, setModels] = useState<LlmOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (alive) {
          setReducedMotion(value);
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (opening && !snapshot.loading) {
      if (snapshot.sessionId === opening && !snapshot.error) {
        aui.composer.reset();
        onHistoryOpenChange(false);
      } else if (snapshot.error) {
        Alert.alert('无法打开对话', snapshot.error);
      }
      setOpening(null);
    }
  }, [
    opening,
    snapshot.loading,
    snapshot.sessionId,
    snapshot.error,
    aui,
    onHistoryOpenChange,
  ]);
  useEffect(() => {
    if (!modelsOpen) {
      return;
    }
    setModelsLoading(true);
    client
      .listLlmOptions()
      .then(setModels)
      .catch(() => Alert.alert('无法加载模型', '请稍后再试。'))
      .finally(() => setModelsLoading(false));
  }, [client, modelsOpen]);
  const query = useInfiniteQuery({
    queryKey: ['mobile-chat-sessions', server, identity],
    initialPageParam: 0,
    queryFn: ({pageParam}) =>
      withMinimumDuration(
        () => client.listSessions(pageParam),
        tokens.motion.loadingMinimum,
      ),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 30
        ? pages.reduce((count, page) => count + page.length, 0)
        : undefined,
    enabled: historyOpen,
  });
  const sessions = query.data?.pages.flat() ?? [];
  return (
    <View>
      <View style={styles.actions}>
        <HeaderAction
          icon="menu"
          label="导航菜单"
          onPress={onOpenDrawer}
        />
        {title}
        <HeaderAction
          icon="square-edit-outline"
          label="新建对话"
          disabled={snapshot.running || snapshot.loading}
          onPress={() => {
            aui.composer.reset();
            client.newSession();
          }}
        />
      </View>
      {snapshot.error ? (
        <View style={styles.notice}>
          <Text accessibilityRole="alert">{snapshot.error}</Text>
          <Button
            onPress={() => {
              client.reconnect().catch(() => undefined);
            }}>
            恢复连接
          </Button>
        </View>
      ) : null}
      <Modal
        visible={modelsOpen}
        statusBarTranslucent
        animationType={reducedMotion ? 'none' : 'fade'}
        onRequestClose={() => onModelsOpenChange(false)}>
        <View style={styles.historyScreen}>
          <ChatAtmosphere />
          <SafeAreaScreen>
            <StatusBar
              translucent
              backgroundColor="transparent"
              barStyle="dark-content"
            />
            <View style={styles.actions}>
              <HeaderAction
                icon="chevron-left"
                label="返回聊天"
                onPress={() => onModelsOpenChange(false)}
              />
              <Text accessibilityRole="header" style={styles.historyTitle}>
                对话模型
              </Text>
              <View style={styles.headerSpacer} />
            </View>
            {modelsLoading ? (
              <View style={styles.modelLoading}>
                <ActivityIndicator color={tokens.color.primary} />
              </View>
            ) : (
              <FlatList
                data={models}
                keyExtractor={item => `${item.profile_id}:${item.model_id}`}
                contentContainerStyle={styles.historyContent}
                renderItem={({item}) => {
                  const selected =
                    snapshot.llmSelection?.profile_id === item.profile_id &&
                    snapshot.llmSelection?.model_id === item.model_id;
                  return (
                    <List.Item
                      title={item.model_name}
                      description={`${item.provider_label || item.profile_name} · ${item.profile_name}`}
                      left={
                        selected ? SelectedModelIcon : UnselectedModelIcon
                      }
                      style={[
                        styles.sessionRow,
                        selected && styles.currentSession,
                      ]}
                      onPress={() => {
                        client.selectLlm({
                          profile_id: item.profile_id,
                          model_id: item.model_id,
                        });
                        onModelsOpenChange(false);
                      }}
                    />
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>没有可用模型</Text>
                    <Text style={styles.emptyHint}>
                      请联系管理员为你的账号分配模型。
                    </Text>
                  </View>
                }
              />
            )}
          </SafeAreaScreen>
        </View>
      </Modal>
      <Modal
        visible={historyOpen}
        statusBarTranslucent
        animationType={reducedMotion ? 'none' : 'fade'}
        onRequestClose={() => onHistoryOpenChange(false)}>
        <View style={styles.historyScreen}>
          <ChatAtmosphere />
          <SafeAreaScreen>
            <StatusBar
              translucent
              backgroundColor="transparent"
              barStyle="dark-content"
            />
            <View style={styles.actions}>
              <HeaderAction
                icon="chevron-left"
                label="返回聊天"
                onPress={() => onHistoryOpenChange(false)}
              />
              <Text accessibilityRole="header" style={styles.historyTitle}>
                历史会话
              </Text>
              <HeaderAction
                icon="plus"
                label="新建对话"
                onPress={() => {
                  onHistoryOpenChange(false);
                  aui.composer.reset();
                  client.newSession();
                }}
              />
            </View>
            <FlatList
              data={sessions}
              keyExtractor={item => item.id}
              style={styles.historyList}
              contentContainerStyle={[
                styles.historyContent,
                !sessions.length && styles.historyEmptyContent,
              ]}
              showsVerticalScrollIndicator={false}
              refreshing={
                sessions.length > 0 &&
                query.isRefetching &&
                !query.isFetchingNextPage &&
                !opening
              }
              onRefresh={() => {
                if (!query.isFetching && !opening) {
                  query.refetch().catch(() => undefined);
                }
              }}
              onEndReachedThreshold={0.3}
              onEndReached={() => {
                if (
                  query.hasNextPage &&
                  !query.isFetching &&
                  !query.isError &&
                  !opening
                ) {
                  query.fetchNextPage().catch(() => undefined);
                }
              }}
              renderItem={({item}) => (
                <List.Item
                  title={item.title || '未命名对话'}
                  titleNumberOfLines={2}
                  titleStyle={styles.sessionTitle}
                  description={
                    item.id === snapshot.sessionId ? '当前对话' : undefined
                  }
                  descriptionStyle={styles.sessionDescription}
                  left={HistoryIcon}
                  right={opening === item.id ? HistoryLoading : HistoryChevron}
                  disabled={Boolean(opening)}
                  style={[
                    styles.sessionRow,
                    item.id === snapshot.sessionId && styles.currentSession,
                  ]}
                  accessibilityLabel={item.title || '未命名对话'}
                  onPress={() => {
                    if (opening || query.isFetching) {
                      return;
                    }
                    setOpening(item.id);
                    client.loadSession(item.id).catch(() => setOpening(null));
                  }}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  {query.isPending || (query.isFetching && !sessions.length) ? (
                    <ActivityIndicator color={tokens.color.primary} />
                  ) : (
                    <>
                      <List.Icon
                        icon={
                          query.isError
                            ? 'cloud-off-outline'
                            : 'message-outline'
                        }
                        color={tokens.color.primary}
                      />
                      <Text style={styles.emptyTitle}>
                        {query.isError ? '暂时无法加载' : '还没有历史会话'}
                      </Text>
                      <Text style={styles.emptyHint}>
                        {query.isError
                          ? '检查网络后，再试一次。'
                          : '从一个问题开始，对话会保存在这里。'}
                      </Text>
                      <Button
                        mode="contained-tonal"
                        style={styles.emptyAction}
                        onPress={() => {
                          if (query.isError) {
                            query.refetch().catch(() => undefined);
                          } else {
                            onHistoryOpenChange(false);
                          }
                        }}>
                        {query.isError ? '重新加载' : '开始提问'}
                      </Button>
                    </>
                  )}
                </View>
              }
              ListFooterComponent={
                sessions.length && !opening && !query.isRefetching ? (
                  <View style={styles.historyFooter}>
                    {query.isFetchingNextPage ? (
                      <ActivityIndicator color={tokens.color.primary} />
                    ) : query.isError ? (
                      <Button
                        onPress={() => {
                          (query.isFetchNextPageError
                            ? query.fetchNextPage()
                            : query.refetch()
                          ).catch(() => undefined);
                        }}>
                        加载失败，点击重试
                      </Button>
                    ) : query.hasNextPage ? (
                      <Button
                        onPress={() => {
                          query.fetchNextPage().catch(() => undefined);
                        }}>
                        加载更多
                      </Button>
                    ) : (
                      <Text style={styles.emptyHint}>已显示全部对话</Text>
                    )}
                  </View>
                ) : null
              }
            />
          </SafeAreaScreen>
        </View>
      </Modal>
    </View>
  );
}
export function AskUser() {
  const {client, snapshot} = useChat();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  useEffect(() => {
    setAnswers({});
  }, [snapshot.waiting]);
  const event = snapshot.waiting;
  if (!event) {
    return null;
  }
  const meta = event.metadata;
  const payload = record(
    meta.ask_user ?? record(meta.tool_metadata).ask_user ?? meta,
  );
  let raw = payload.questions;
  if (!Array.isArray(raw)) {
    try {
      raw = record(JSON.parse(event.content)).questions;
    } catch {
      /* Plain-text pause */
    }
  }
  const questions = Array.isArray(raw)
    ? raw.map(record)
    : [{id: 'reply', question: event.content}];
  return (
    <View>
      <Text>需要你的回复</Text>
      {questions.map((q, i) => {
        const id = String(q.id || i);
        return (
          <View key={id}>
            <Text>{String(q.question || q.prompt || '')}</Text>
            {Array.isArray(q.options)
              ? q.options.map((o, j) => {
                  const option = record(o);
                  const label =
                    typeof o === 'string'
                      ? o
                      : String(option.label || option.text || '');
                  return (
                    <Button
                      key={j}
                      onPress={() =>
                        setAnswers(old => {
                          const selected = (old[id] || '')
                            .split('、')
                            .filter(Boolean);
                          return {
                            ...old,
                            [id]: q.multi_select
                              ? (selected.includes(label)
                                  ? selected.filter(v => v !== label)
                                  : [...selected, label]
                                ).join('、')
                              : label,
                          };
                        })
                      }>
                      {label}
                    </Button>
                  );
                })
              : null}
            <TextInput
              label="你的回答"
              value={answers[id] || ''}
              onChangeText={text => setAnswers(old => ({...old, [id]: text}))}
              multiline
            />
          </View>
        );
      })}
      <Button
        disabled={
          !questions.every((q, i) => answers[String(q.id || i)]?.trim())
        }
        onPress={() =>
          client.reply(
            questions.map((q, i) => ({
              questionId: String(q.id || i),
              text: answers[String(q.id || i)] || '',
            })),
          )
        }>
        提交回复
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.chat.headerHeight,
    paddingHorizontal: tokens.space.md,
    gap: tokens.space.xxs,
  },
  iconSurface: {
    width: tokens.chat.headerAction,
    height: tokens.chat.headerAction,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.surface,
    shadowColor: tokens.color.shadowSoft,
    shadowOffset: {width: 0, height: tokens.chat.surfaceShadowOffset},
    shadowOpacity: tokens.chat.surfaceShadowOpacity,
    shadowRadius: tokens.chat.surfaceShadowRadius,
    elevation: tokens.chat.surfaceElevation,
  },
  iconButton: {
    margin: 0,
    width: tokens.chat.headerAction,
    height: tokens.chat.headerAction,
  },
  headerSpacer: {width: 48, height: 48},
  modelLoading: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  notice: {padding: tokens.space.md, backgroundColor: tokens.color.errorSoft},
  historyScreen: {flex: 1, backgroundColor: tokens.color.canvas},
  historyTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: tokens.chat.brandSize,
    color: tokens.color.ink,
  },
  historyList: {
    flex: 1,
    width: '100%',
    maxWidth: tokens.chat.maxWidth,
    alignSelf: 'center',
  },
  historyContent: {
    paddingHorizontal: tokens.chat.gutter,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.xs,
  },
  historyEmptyContent: {flexGrow: 1, justifyContent: 'center'},
  sessionRow: {
    paddingHorizontal: tokens.space.sm,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.space.xs,
  },
  currentSession: {backgroundColor: tokens.color.primaryMuted},
  sessionTitle: {
    fontSize: tokens.type.body,
    lineHeight: tokens.chat.line,
    color: tokens.color.ink,
  },
  sessionDescription: {
    fontSize: tokens.type.caption,
    color: tokens.color.primary,
    marginTop: tokens.space.xxs,
  },
  emptyState: {
    alignItems: 'center',
    padding: tokens.space.lg,
    gap: tokens.space.xs,
  },
  emptyTitle: {fontSize: tokens.type.title, color: tokens.color.ink},
  emptyHint: {
    fontSize: tokens.type.caption,
    color: tokens.color.muted,
    textAlign: 'center',
  },
  emptyAction: {marginTop: tokens.space.md, borderRadius: tokens.radius.full},
  historyFooter: {alignItems: 'center', padding: tokens.space.lg},
});
