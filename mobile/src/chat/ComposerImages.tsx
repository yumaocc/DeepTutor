import React, {useRef, useState} from 'react';
import {Alert, Image, ScrollView, StyleSheet, View} from 'react-native';
import {IconButton, TouchableRipple} from 'react-native-paper';
import {useAuiState, useAui} from '@assistant-ui/react-native';
import {launchImageLibrary} from '../platform/media/imagePicker';
import {chatTokens as tokens} from '../theme/chatTheme';
import {MAX_IMAGES, outgoingImages, validateImages} from './imageAttachments';
import {ImagePreview} from './ImagePreview';
export function AddImages() {
  const composer = useAui().composer;
  const busy = useAuiState(s => s.thread.isRunning || s.thread.isLoading);
  const [picking, setPicking] = useState(false);
  const lock = useRef(false);
  const pick = async () => {
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
      const current = composer.getState().attachments;
      validateImages(
        outgoingImages([
          ...current.filter(a => a.status.type === 'complete'),
          ...added,
        ] as typeof added),
      );
      for (const attachment of added) {
        await composer.addAttachment(attachment);
      }
    } catch (e) {
      Alert.alert(
        '\u56fe\u7247\u4e0a\u4f20',
        e instanceof Error ? e.message : '无法选择图片，请重试。',
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
        accessibilityLabel="添加图片"
        disabled={busy || picking}
        iconColor={tokens.color.muted}
        size={tokens.chat.icon}
        style={styles.add}
        onPress={() => {
          pick().catch(() => undefined);
        }}
      />
    </View>
  );
}
export function ComposerImages() {
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
          if (p?.type !== 'image') {
            return null;
          }
          return (
            <View key={a.id} style={styles.tile}>
              <TouchableRipple
                onPress={() => setPreview({uri: p.image, title: a.name})}
                accessibilityLabel={`预览图片 ${index + 1}`}>
                <Image source={{uri: p.image}} style={styles.thumb} />
              </TouchableRipple>
              <IconButton
                icon="close"
                size={tokens.type.reading}
                style={styles.remove}
                accessibilityLabel={`移除图片 ${index + 1}`}
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
