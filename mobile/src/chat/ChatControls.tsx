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
  Menu,
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
export function ChatControls({title}: {title: React.ReactNode}) {
  const aui = useAui();
  const {client, snapshot, server, identity} = useChat();
  const [history, setHistory] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
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
        setHistory(false);
      } else if (snapshot.error) {
        Alert.alert('无法打开对话', snapshot.error);
      }
      setOpening(null);
    }
  }, [opening, snapshot.loading, snapshot.sessionId, snapshot.error, aui]);
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
    enabled: history,
  });
  const sessions = query.data?.pages.flat() ?? [];
  return (
    <View>
      <View style={styles.actions}>
        <Menu
          anchorPosition="bottom"
          statusBarHeight={0}
          visible={menu}
          onDismiss={() => setMenu(false)}
          anchor={
            <IconButton
              icon="menu"
              accessibilityLabel="导航菜单"
              size={tokens.chat.icon}
              style={styles.iconButton}
              hitSlop={4}
              onPress={() => setMenu(true)}
            />
          }>
          <Menu.Item
            leadingIcon="help-circle-outline"
            title={'\u4f7f\u7528\u5e2e\u52a9'}
            onPress={() => {
              setMenu(false);
              Alert.alert(
                'DeepTutor',
                '\u70b9\u51fb\u5feb\u6377\u5165\u53e3\u586b\u5165\u95ee\u9898\uff0c\u6216\u76f4\u63a5\u8f93\u5165\u6587\u5b57\u3002\u56de\u5f62\u9488\u53ef\u6dfb\u52a0\u56fe\u7247\uff0c\u53d1\u9001\u540e\u53ef\u968f\u65f6\u505c\u6b62\u751f\u6210\u3002\u5de6\u4e0a\u89d2\u53ef\u67e5\u770b\u5386\u53f2\u5bf9\u8bdd\u3002',
              );
            }}
          />
          <Menu.Item
            leadingIcon="history"
            title="历史会话"
            disabled={snapshot.running || snapshot.loading}
            onPress={() => {
              setMenu(false);
              setHistory(true);
            }}
          />
          <Menu.Item
            leadingIcon="refresh"
            title="重新生成"
            disabled={
              snapshot.running || snapshot.loading || !snapshot.sessionId
            }
            onPress={() => {
              setMenu(false);
              client.regenerate().catch(() => undefined);
            }}
          />
        </Menu>
        {title}
        <IconButton
          icon="square-edit-outline"
          accessibilityLabel="新建对话"
          size={tokens.chat.icon}
          style={styles.iconButton}
          hitSlop={4}
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
        visible={history}
        statusBarTranslucent
        animationType={reducedMotion ? 'none' : 'fade'}
        onRequestClose={() => setHistory(false)}>
        <View style={styles.historyScreen}>
          <ChatAtmosphere />
          <SafeAreaScreen>
            <StatusBar
              translucent
              backgroundColor="transparent"
              barStyle="dark-content"
            />
            <View style={styles.actions}>
              <IconButton
                icon="chevron-left"
                accessibilityLabel="返回聊天"
                style={styles.iconButton}
                hitSlop={4}
                onPress={() => setHistory(false)}
              />
              <Text accessibilityRole="header" style={styles.historyTitle}>
                历史会话
              </Text>
              <IconButton
                icon="plus"
                accessibilityLabel="新建对话"
                style={styles.iconButton}
                hitSlop={4}
                onPress={() => {
                  setHistory(false);
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
                            setHistory(false);
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
    paddingHorizontal: tokens.space.xs,
    gap: tokens.space.xxs,
  },
  iconButton: {
    margin: 4,
    width: 40,
    height: 40,
    backgroundColor: tokens.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.border,
  },
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
