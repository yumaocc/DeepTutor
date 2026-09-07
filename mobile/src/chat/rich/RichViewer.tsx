import React, {useMemo, useState} from 'react';
import {Modal, Platform, ScrollView, StyleSheet, View} from 'react-native';
import {Button, Text, useTheme} from 'react-native-paper';
import {WebView} from 'react-native-webview';
import {SafeAreaScreen} from '../../components/layout/SafeAreaScreen';
import type {RichContent} from './content';
import {richDocument} from './document';
import {MarkdownMessage} from '../markdown/MarkdownMessage';
export function RichViewer({
  item,
  onClose,
  server,
}: {
  item: RichContent;
  server: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [nested, setNested] = useState<RichContent | null>(null);
  const [source, setSource] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const html = useMemo(
    () =>
      item.kind === 'markdown'
        ? ''
        : richDocument(item, {
            background: theme.colors.background,
            text: theme.colors.onSurface,
          }),
    [item, theme],
  );
  return (
    <Modal visible onRequestClose={onClose} animationType="fade">
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.actions}>
          <Button onPress={onClose}>返回</Button>
          <Button onPress={() => setSource(!source)}>
            {source ? '预览' : '源码 / 数据'}
          </Button>
        </View>
        {item.summary ? (
          <Text accessibilityRole="summary">{item.summary}</Text>
        ) : null}
        {source ? (
          <ScrollView>
            <Text selectable>{item.content}</Text>
          </ScrollView>
        ) : item.kind === 'markdown' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.markdown}>
            <MarkdownMessage
              content={item.content}
              server={server}
              preview={setNested}
            />
          </ScrollView>
        ) : error ? (
          <View>
            <Text>预览加载失败。</Text>
            <Button
              onPress={() => {
                setError(false);
                setRevision(revision + 1);
              }}>
              重试
            </Button>
          </View>
        ) : (
          <WebView
            key={revision}
            source={{html}}
            originWhitelist={['*']}
            javaScriptEnabled
            // Android incognito clears the global CookieManager, including API login cookies.
            // The document is originless, sandboxed and network-blocked instead.
            incognito={Platform.OS !== 'android'}
            cacheEnabled={false}
            sharedCookiesEnabled={false}
            thirdPartyCookiesEnabled={false}
            domStorageEnabled={false}
            allowFileAccess={false}
            allowFileAccessFromFileURLs={false}
            allowUniversalAccessFromFileURLs={false}
            mixedContentMode="never"
            javaScriptCanOpenWindowsAutomatically={false}
            setSupportMultipleWindows
            onShouldStartLoadWithRequest={request =>
              request.url === 'about:blank' || request.url === 'about:srcdoc'
            }
            onOpenWindow={() => {}}
            onError={() => setError(true)}
            onHttpError={() => setError(true)}
            startInLoadingState
            style={styles.screen}
          />
        )}
        {nested ? (
          <RichViewer
            item={nested}
            server={server}
            onClose={() => setNested(null)}
          />
        ) : null}
      </SafeAreaScreen>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: {flex: 1},
  markdown: {padding: 16},
  actions: {flexDirection: 'row', justifyContent: 'space-between'},
});
