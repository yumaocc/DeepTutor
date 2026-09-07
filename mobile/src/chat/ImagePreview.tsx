import React from 'react';
import {Image, Modal, StyleSheet, View} from 'react-native';
import {IconButton, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {chatTokens as tokens} from '../theme/chatTheme';
export function ImagePreview({
  uri,
  title,
  close,
}: {
  uri: string;
  title: string;
  close: () => void;
}) {
  return (
    <Modal visible onRequestClose={close} animationType="fade">
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <IconButton
            style={styles.close}
            icon="close"
            accessibilityLabel="关闭图片预览"
            onPress={close}
          />
        </View>
        <Image
          source={{uri}}
          accessibilityLabel={title}
          resizeMode="contain"
          style={styles.image}
        />
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: tokens.color.canvas},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space.md,
  },
  title: {flex: 1, color: tokens.color.ink},
  close: {width: tokens.size.touch, height: tokens.size.touch},
  image: {flex: 1, width: '100%'},
});
