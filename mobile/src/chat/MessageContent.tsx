import React, {useState} from 'react';
import {Image, Linking, StyleSheet, View} from 'react-native';
import {Button, Text, TouchableRipple} from 'react-native-paper';
import {useChat} from './ChatProvider';
import {record, type ChatAttachment, type ChatMessage} from './protocol';
import {richContents, safeUrl, type RichContent} from './rich/content';
import {MarkdownMessage} from './markdown/MarkdownMessage';
import {RichViewer} from './rich/RichViewer';
import {chatTokens as tokens} from '../theme/chatTheme';
import {ImagePreview} from './ImagePreview';
import {imageUri} from './imageAttachments';
import {ThinkingIndicator} from './ThinkingIndicator';

function Attachment({
  attachment,
  preview,
}: {
  attachment: ChatAttachment;
  preview: (item: RichContent) => void;
}) {
  const {http, server} = useChat();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const url = attachment.url ? safeUrl(attachment.url, server) : null;
  const photo = url || imageUri(attachment);
  const title = attachment.filename || '附件';
  const kind = /\.html?$/i.test(title)
    ? 'html'
    : /\.svg$/i.test(title)
    ? 'svg'
    : /\.(md|txt|json|csv|js|py)$/i.test(title)
    ? 'markdown'
    : '';
  const image =
    attachment.type === 'image' && !/svg/i.test(attachment.mime_type || title);
  const open = async () => {
    setError('');
    try {
      if (image && photo) {
        setImageOpen(true);
      } else if (
        url &&
        kind &&
        new URL(url).origin === new URL(server).origin
      ) {
        setLoading(true);
        const parsed = new URL(url);
        const content = await http.request<unknown>({
          path: parsed.pathname + parsed.search,
        });
        const text =
          typeof content === 'string'
            ? content
            : JSON.stringify(content, null, 2);
        if (text.length > 2_000_000) {
          throw new Error('文件较大，请通过浏览器打开。');
        }
        preview({kind, title, content: text});
      } else if (
        typeof attachment.extracted_text === 'string' &&
        attachment.extracted_text
      ) {
        preview({kind: 'text', title, content: attachment.extracted_text});
      } else if (url) {
        await Linking.openURL(url);
      } else {
        throw new Error('附件没有可用的下载地址。');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '附件打开失败，请重试。');
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.artifact}>
      <Text numberOfLines={1}>{title}</Text>
      {image && photo ? (
        <TouchableRipple
          onPress={() => setImageOpen(true)}
          accessibilityLabel={title}>
          <Image
            accessibilityLabel={title}
            source={{uri: photo}}
            resizeMode="contain"
            style={styles.image}
            onError={() => setError('\u56fe\u7247\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u70b9\u51fb\u56fe\u7247\u91cd\u8bd5\u9884\u89c8\u3002')}
          />
        </TouchableRipple>
      ) : null}
      {imageOpen && photo ? (
        <ImagePreview
          uri={photo}
          title={title}
          close={() => setImageOpen(false)}
        />
      ) : null}
      {!image ? (
        <Button
          loading={loading}
          disabled={loading}
          onPress={() => {
            open().catch(() => undefined);
          }}>
          {kind ? '预览附件' : '打开附件'}
        </Button>
      ) : null}
      {error ? <Text>{error}</Text> : null}
    </View>
  );
}
export function MessageContent({message}: {message: ChatMessage}) {
  const [preview, setPreview] = useState<RichContent | null>(null);
  const {server, http} = useChat();
  const [linkError, setLinkError] = useState('');
  const visuals = richContents({...message, content: ''});
  const sources = message.events
    .filter(e => e.type === 'sources')
    .flatMap(e => (Array.isArray(e.metadata.sources) ? e.metadata.sources : []))
    .map(record)
    .filter(s => s.type !== 'artifact');
  const errors = message.events.filter(e => e.type === 'error');
  const text = message.content;
  const openLink = async (url: string, title: string) => {
    setLinkError('');
    try {
      const parsed = new URL(url);
      const kind = /\.html?$/i.test(parsed.pathname)
        ? 'html'
        : /\.svg$/i.test(parsed.pathname)
        ? 'svg'
        : /\.(md|txt)$/i.test(parsed.pathname)
        ? 'markdown'
        : '';
      if (kind && parsed.origin === new URL(server).origin) {
        const value = await http.request<unknown>({
          path: parsed.pathname + parsed.search,
        });
        setPreview({
          kind,
          title,
          content: typeof value === 'string' ? value : JSON.stringify(value),
        });
      } else {
        await Linking.openURL(url);
      }
    } catch {
      setLinkError('链接打开失败，请重试。');
    }
  };
  return (
    <View>
      {text && message.role !== 'user' ? (
        <MarkdownMessage
          content={text}
          files={message.attachments}
          server={server}
          preview={setPreview}
          openLink={(url, title) => {
            openLink(url, title).catch(() => undefined);
          }}
        />
      ) : text ? (
        <Text
          selectable
          style={message.role === 'user' ? styles.user : styles.reading}>
          {text}
        </Text>
      ) : null}
      {!text && message.status === 'running' ? <ThinkingIndicator /> : null}
      {linkError ? <Text>{linkError}</Text> : null}
      {visuals.map((item, i) => (
        <Button key={i} onPress={() => setPreview(item)}>
          查看 {item.title}
        </Button>
      ))}
      {message.attachments.map((a, i) => (
        <Attachment
          key={a.url || String(i)}
          attachment={a}
          preview={setPreview}
        />
      ))}
      {sources.map((s, i) => {
        const url = safeUrl(String(s.url || ''), server);
        return s.url && url ? (
          <Button
            key={i}
            onPress={() => {
              Linking.openURL(url).catch(() => undefined);
            }}>
            来源：{String(s.title || s.url)}
          </Button>
        ) : null;
      })}
      {errors.map((e, i) => (
        <Text key={i}>{e.content}</Text>
      ))}
      {message.status === 'cancelled' ? (
        <Text>已停止，已生成的内容已保留。</Text>
      ) : null}
      {preview ? (
        <RichViewer
          server={server}
          item={preview}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  reading: {
    color: tokens.color.ink,
    fontSize: tokens.type.reading,
    lineHeight: 25,
  },
  user: {
    color: tokens.color.ink,
    fontSize: tokens.type.reading,
    lineHeight: 25,
  },
  artifact: {marginTop: tokens.space.sm},
  image: {width: '100%', height: 180, borderRadius: tokens.radius.sm},
});
