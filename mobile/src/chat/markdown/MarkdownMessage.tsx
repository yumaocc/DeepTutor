import {chatTokens} from '../../theme/chatTheme';
/* Render rules are callbacks invoked by the Markdown library, not component types. */
/* eslint-disable react/no-unstable-nested-components */
import React, {memo, useMemo, useRef} from 'react';
import {
  Alert,
  Clipboard,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Markdown, {
  type ASTNode,
  type RenderRules,
} from 'react-native-markdown-display';
import {Button, useTheme} from 'react-native-paper';
import {SvgXml} from 'react-native-svg';
import type {RichContent} from '../rich/content';
import {safeUrl} from '../rich/content';
import {highlight, mathSvg, nativeAST, type HighlightNode} from './native';

const Formula = memo(function Formula({
  tex,
  display,
  color,
}: {
  tex: string;
  display: boolean;
  color: string;
}) {
  const result = useMemo(() => {
    try {
      return mathSvg(tex, display);
    } catch {
      return null;
    }
  }, [tex, display]);
  const formula = result ? (
    <SvgXml
      xml={result.xml}
      width={result.width}
      height={result.height}
      color={color}
    />
  ) : (
    <Text style={{color}}>{tex}</Text>
  );
  return display ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.formula}
      accessibilityLabel={tex}>
      {formula}
    </ScrollView>
  ) : (
    <View
      accessible
      accessibilityLabel={tex}
      style={[
        styles.inlineMath,
        result ? {width: result.width + 4, height: result.height} : null,
      ]}>
      {formula}
    </View>
  );
});
function colored(nodes: HighlightNode[]): React.ReactNode {
  return nodes.map((node, index) =>
    node.type === 'text' ? (
      node.value
    ) : (
      <Text
        key={index}
        style={
          node.properties?.className?.some(name =>
            /keyword|literal|number/.test(name),
          )
            ? styles.keyword
            : styles.literal
        }>
        {colored(node.children || [])}
      </Text>
    ),
  );
}
const Code = memo(function Code({
  content,
  language,
  preview,
}: {
  content: string;
  language: string;
  preview: (item: RichContent) => void;
}) {
  const theme = useTheme();
  const text = useMemo(
    () => colored(highlight(content, language)),
    [content, language],
  );
  const kind = language.toLowerCase().replace('chart.js', 'chartjs');
  const rich = ['html', 'svg', 'mermaid', 'echarts', 'chartjs'].includes(kind);
  return (
    <View style={[styles.code, {backgroundColor: theme.colors.surfaceVariant}]}>
      <View style={styles.codeActions}>
        <Text style={{color: theme.colors.onSurfaceVariant}}>
          {language || '代码'}
        </Text>
        <Button compact onPress={() => Clipboard.setString(content)}>
          复制
        </Button>
        {rich ? (
          <Button
            compact
            onPress={() => preview({kind, title: language, content})}>
            打开预览
          </Button>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text
          selectable
          style={[styles.codeText, {color: theme.colors.onSurface}]}>
          {text}
        </Text>
      </ScrollView>
    </View>
  );
});
type SourceNode = ASTNode & {sourceInfo?: string; sourceMeta?: {id?: number}};
export const MarkdownMessage = memo(function MarkdownMessage(props: {
  content: string;
  files?: {filename?: string; url?: string}[];
  server: string;
  preview: (item: RichContent) => void;
  openLink?: (url: string, title: string) => void;
}) {
  const theme = useTheme();
  const current = useRef(props);
  current.current = props;
  const ast = useMemo(() => nativeAST(props.content), [props.content]);
  const astRef = useRef(ast);
  astRef.current = ast;
  const rules = useMemo<RenderRules>(() => {
    const showPreview = (item: RichContent) => current.current.preview(item);
    const plainText = (node: ASTNode): string =>
      node.content || node.children.map(plainText).join('');
    const findNode = (
      nodes: ASTNode[],
      match: (node: SourceNode) => boolean,
    ): ASTNode | undefined => {
      for (const node of nodes) {
        if (match(node)) {
          return node;
        }
        const found = findNode(node.children, match);
        if (found) {
          return found;
        }
      }
      return undefined;
    };
    const open = (raw: string, title: string) => {
      const {files = [], server, openLink} = current.current;
      const file = files.find(
        item =>
          raw === item.filename ||
          raw === `attachment:${encodeURIComponent(item.filename || '')}`,
      );
      if (raw.startsWith('#')) {
        const target = findNode(
          astRef.current,
          node => node.attributes.id === raw.slice(1),
        );
        Alert.alert(
          '引用',
          target ? plainText(target) : '对应来源请查看回答下方的来源列表。',
        );
        return;
      }
      const url = safeUrl(file?.url || raw, server);
      if (url) {
        if (openLink) {
          openLink(url, title);
        } else {
          Linking.openURL(url).catch(() => undefined);
        }
      }
    };
    const formula = (node: ASTNode, display: boolean) => (
      <Formula
        key={node.key}
        tex={node.content}
        display={display}
        color={theme.colors.onSurface}
      />
    );
    return {
      // The library generates a random root key; keep the native subtree mounted while streaming.
      body: (_node, children, _parents, style) => (
        <View key="body" style={style._VIEW_SAFE_body}>
          {children}
        </View>
      ),
      text: (node, _children, parents, style, inherited = {}) => {
        const names = (current.current.files || [])
          .map(file => file.filename)
          .filter((name): name is string => Boolean(name));
        let parts: React.ReactNode[] = [node.content];
        if (
          !parents.some(parent =>
            ['link', 'code_inline', 'fence'].includes(parent.type),
          )
        ) {
          for (const name of names) {
            parts = parts.flatMap(part =>
              typeof part !== 'string'
                ? [part]
                : part.split(name).flatMap((piece, index) =>
                    index
                      ? [
                          <Text
                            key={`${name}:${index}`}
                            style={{color: theme.colors.primary}}
                            onPress={() => open(name, name)}>
                            {name}
                          </Text>,
                          piece,
                        ]
                      : [piece],
                  ),
            );
          }
        }
        return (
          <Text key={node.key} style={[inherited, style.text]}>
            {parts}
          </Text>
        );
      },
      textgroup: (node, children, _parents, style) => (
        <Text key={node.key} selectable style={style.textgroup}>
          {children}
        </Text>
      ),
      math_inline: node => formula(node, false),
      math_inline_double: node => formula(node, true),
      math_block: node => formula(node, true),
      math_block_eqno: node => formula(node, true),
      fence: (node: SourceNode) => (
        <Code
          key={node.key}
          content={node.content}
          language={(node.sourceInfo || '').trim().split(/\s/)[0]}
          preview={showPreview}
        />
      ),
      code_block: node => (
        <Code
          key={node.key}
          content={node.content}
          language=""
          preview={showPreview}
        />
      ),
      table: (node, children, _parents, style) => (
        <ScrollView
          key={node.key}
          horizontal
          showsHorizontalScrollIndicator={false}>
          <View style={style.table}>{children}</View>
        </ScrollView>
      ),
      link: (node, children) => (
        <Text
          key={node.key}
          style={{color: theme.colors.primary}}
          onPress={() => open(node.attributes.href, node.content)}>
          {children}
        </Text>
      ),
      blocklink: (node, children) => (
        <View
          key={node.key}
          onTouchEnd={() => open(node.attributes.href, node.content)}>
          {children}
        </View>
      ),
      image: node => {
        const url = safeUrl(node.attributes.src, current.current.server);
        return url ? (
          <Image
            key={node.key}
            source={{uri: url}}
            accessibilityLabel={node.attributes.alt || '图片'}
            resizeMode="contain"
            style={styles.image}
          />
        ) : null;
      },
      html_inline: node => (
        <Text key={node.key}>
          {node.content.includes('task-list-item-checkbox')
            ? node.content.includes('checked')
              ? '☑ '
              : '☐ '
            : node.content}
        </Text>
      ),
      footnote_ref: (node: SourceNode) => (
        <Text
          key={node.key}
          style={{color: theme.colors.primary}}
          onPress={() => {
            const target = findNode(
              astRef.current,
              item =>
                item.type === 'footnote' &&
                item.sourceMeta?.id === node.sourceMeta?.id,
            );
            Alert.alert(
              '脚注',
              target ? plainText(target) : '脚注尚未生成完整。',
            );
          }}>
          [{(node.sourceMeta?.id || 0) + 1}]
        </Text>
      ),
      footnote_block: (node, children) => (
        <View key={node.key}>{children}</View>
      ),
      footnote: (node, children) => <View key={node.key}>{children}</View>,
      footnote_anchor: () => null,
    };
  }, [theme.colors.onSurface, theme.colors.primary]);
  const markdownStyles = useMemo(
    () => ({
      body: {
        color: theme.colors.onSurface,
        fontSize: chatTokens.type.reading,
        lineHeight: chatTokens.chat.bodyLine,
      },
      heading1: {
        fontSize: chatTokens.chat.title1,
        lineHeight: 32,
        fontWeight: '700' as const,
        marginVertical: 14,
      },
      heading2: {
        fontSize: chatTokens.chat.title2,
        lineHeight: 29,
        fontWeight: '700' as const,
        marginVertical: 12,
      },
      heading3: {
        fontSize: chatTokens.chat.title3,
        lineHeight: 27,
        fontWeight: '700' as const,
        marginVertical: 10,
      },
      paragraph: {marginTop: 6, marginBottom: 8, flexWrap: 'wrap' as const},
      blockquote: {
        backgroundColor: theme.colors.surfaceVariant,
        borderColor: theme.colors.outline,
        marginVertical: 8,
      },
      table: {
        borderColor: theme.colors.outlineVariant,
        borderWidth: 1,
        marginVertical: 8,
      },
      th: {width: 155, padding: 10, fontWeight: '700' as const},
      td: {width: 155, padding: 10},
      tr: {borderColor: theme.colors.outlineVariant},
      code_inline: {
        backgroundColor: theme.colors.surfaceVariant,
        color: theme.colors.onSurface,
      },
      hr: {backgroundColor: theme.colors.outlineVariant},
    }),
    [theme.colors],
  );
  return (
    <Markdown rules={rules} style={markdownStyles}>
      {ast as unknown as React.ReactNode}
    </Markdown>
  );
});
const styles = StyleSheet.create({
  keyword: {color: '#9b59b6'},
  literal: {color: '#168078'},
  code: {borderRadius: 8, marginVertical: 8, overflow: 'hidden'},
  codeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    lineHeight: 23,
    padding: 12,
  },
  formula: {flexGrow: 1, justifyContent: 'center', paddingVertical: 12},
  inlineMath: {
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  image: {width: '100%', height: 220},
});
