import React, {useRef, useState} from 'react';
import {Alert, Image, ScrollView, StyleSheet, View} from 'react-native';
import {
  Icon,
  IconButton,
  Surface,
  Text,
  TouchableRipple,
} from 'react-native-paper';
import {
  useAuiState,
  useAui,
  type Attachment,
  type CompleteAttachment,
} from '@assistant-ui/react-native';
import {launchImageLibrary} from '../platform/media/imagePicker';
import {chatTokens as tokens} from '../theme/chatTheme';
import {
  MAX_ATTACHMENTS,
  MAX_IMAGES,
  outgoingAttachments,
  validateAttachments,
} from './imageAttachments';
import {ImagePreview} from './ImagePreview';
import {pickDocuments} from '../platform/media/documentPicker';

const completeAttachments = (
  attachments: readonly Attachment[],
): CompleteAttachment[] =>
  attachments.filter(
    (attachment): attachment is CompleteAttachment =>
      attachment.status.type === 'complete',
  );

export function AddAttachments() {
  const composer = useAui().composer;
  const busy = useAuiState(s => s.thread.isRunning || s.thread.isLoading);
  const [picking, setPicking] = useState(false);
  const lock = useRef(false);
  const pickImages = async () => {
    if (lock.current) {
      return;
    }
    lock.current = true;
    setPicking(true);
    try {
      const remaining = MAX_IMAGES - composer.getState().attachments.length;
      if (remaining <= 0) {
        throw new Error('每次最多选择 4 张图片。');
      }
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: remaining,
        includeBase64: true,
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.8,
        assetRepresentationMode: 'compatible',
      });
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        throw new Error(
          result.errorCode === 'permission'
            ? '无法访问相册，请在系统设置中允许访问照片。'
            : '读取图片失败，请重试。',
        );
      }
      const added = (result.assets || []).map((asset, i) => {
        if (!asset.base64 || !asset.type) {
          throw new Error('图片读取失败，请换一张图片。');
        }
        return {
          type: 'image' as const,
          name: asset.fileName || `photo-${Date.now()}-${i}.jpg`,
          contentType: asset.type,
          status: {type: 'complete' as const},
          id: `photo-${Date.now()}-${i}`,
          content: [
            {
              type: 'image' as const,
              image: `data:${asset.type};base64,${asset.base64}`,
            },
          ],
        };
      });
      const current = completeAttachments(composer.getState().attachments);
      validateAttachments(
        outgoingAttachments([...current, ...added]),
      );
      for (const attachment of added) {
        await composer.addAttachment(attachment);
      }
    } catch (e) {
      Alert.alert(
        '添加图片',
        e instanceof Error ? e.message : '无法选择图片，请重试。',
      );
    } finally {
      lock.current = false;
      setPicking(false);
    }
  };
  const pickFiles = async () => {
    if (lock.current) {
      return;
    }
    lock.current = true;
    setPicking(true);
    try {
      const current = completeAttachments(composer.getState().attachments);
      const remaining = MAX_ATTACHMENTS - current.length;
      const selected = await pickDocuments(remaining);
      const added = selected.map((file, index) => ({
        id: `document-${Date.now()}-${index}`,
        type: 'document' as const,
        name: file.name,
        contentType: file.mimeType,
        status: {type: 'complete' as const},
        content: [
          {
            type: 'file' as const,
            data: file.base64,
            mimeType: file.mimeType,
            filename: file.name,
          },
        ],
      }));
      validateAttachments(outgoingAttachments([...current, ...added]));
      for (const attachment of added) {
        await composer.addAttachment(attachment);
      }
    } catch (error) {
      Alert.alert(
        '添加文件',
        error instanceof Error ? error.message : '无法选择文件，请重试。',
      );
    } finally {
      lock.current = false;
      setPicking(false);
    }
  };
  return (
    <View>
      <IconButton
        icon="plus-circle-outline"
        accessibilityLabel="添加图片或文件"
        disabled={busy || picking}
        iconColor={tokens.color.muted}
        size={tokens.chat.icon}
        style={styles.add}
        onPress={() =>
          Alert.alert('添加附件', undefined, [
            {
              text: '选择图片',
              onPress: () => pickImages().catch(() => undefined),
            },
            {
              text: '选择文件',
              onPress: () => pickFiles().catch(() => undefined),
            },
            {text: '取消', style: 'cancel'},
          ])
        }
      />
    </View>
  );
}
export function ComposerAttachments() {
  const attachments = useAuiState(s => s.composer.attachments);
  const composer = useAui().composer;
  const [preview, setPreview] = useState<{uri: string; title: string} | null>(
    null,
  );
  if (!attachments.length) {
    return null;
  }
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}>
        {attachments.map((a, index) => {
          const p = a.content?.find(part => part.type === 'image');
          const file = a.content?.find(part => part.type === 'file');
          return (
            <View key={a.id} style={styles.tile}>
              {p?.type === 'image' ? (
                <TouchableRipple
                  onPress={() => setPreview({uri: p.image, title: a.name})}
                  accessibilityLabel={`预览图片 ${index + 1}`}>
                  <Image source={{uri: p.image}} style={styles.thumb} />
                </TouchableRipple>
              ) : file?.type === 'file' ? (
                <Surface mode="flat" elevation={0} style={styles.fileCard}>
                  <Icon
                    source="file-document-outline"
                    size={24}
                    color={tokens.color.primary}
                  />
                  <Text numberOfLines={2} style={styles.fileName}>
                    {a.name}
                  </Text>
                </Surface>
              ) : null}
              <IconButton
                icon="close"
                size={tokens.type.reading}
                style={styles.remove}
                accessibilityLabel={`移除${file?.type === 'file' ? '文件' : '图片'} ${index + 1}`}
                onPress={() => {
                  composer
                    .attachment({id: a.id})
                    .remove()
                    .catch(() => undefined);
                }}
              />
            </View>
          );
        })}
      </ScrollView>
      {preview ? (
        <ImagePreview {...preview} close={() => setPreview(null)} />
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  add: {margin: 0, width: tokens.size.touch, height: tokens.size.touch},
  strip: {gap: tokens.space.sm, padding: tokens.space.xs},
  tile: {width: 88, paddingTop: tokens.space.sm},
  thumb: {width: 80, height: 80, borderRadius: tokens.radius.md},
  fileCard: {
    width: 80,
    height: 80,
    borderRadius: tokens.radius.md,
    padding: tokens.space.xs,
    backgroundColor: tokens.color.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xxs,
  },
  fileName: {
    color: tokens.color.ink,
    fontSize: tokens.type.caption,
    textAlign: 'center',
  },
  remove: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    position: 'absolute',
    top: -tokens.space.xs,
    right: -tokens.space.xs,
    margin: 0,
    backgroundColor: tokens.color.surface,
  },
});
