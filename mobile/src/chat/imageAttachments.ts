import type {CompleteAttachment} from '@assistant-ui/react-native';
import type {ChatAttachment} from './protocol';
export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
export function outgoingImages(
  attachments: readonly CompleteAttachment[],
): ChatAttachment[] {
  return attachments.map(attachment => {
    const part = attachment.content.find(p => p.type === 'image');
    const match =
      part?.type === 'image' &&
      /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(
        part.image,
      );
    if (!match) {
      throw new Error('图片格式不受支持，请重新选择。');
    }
    if ((match[2].length * 3) / 4 > MAX_IMAGE_BYTES) {
      throw new Error('单张图片不能超过 4 MB。');
    }
    return {
      type: 'image',
      filename: attachment.name,
      mime_type: match[1],
      base64: match[2],
    };
  });
}
export function validateImages(images: ChatAttachment[]) {
  if (images.length > MAX_IMAGES) {
    throw new Error('每次最多发送 4 张图片。');
  }
  if (
    images.reduce((sum, a) => sum + ((a.base64?.length || 0) * 3) / 4, 0) >
    MAX_TOTAL_BYTES
  ) {
    throw new Error('图片合计不能超过 8 MB，请减少图片数量。');
  }
}
export function imageUri(attachment: ChatAttachment): string | undefined {
  return attachment.base64 &&
    /^image\/(jpeg|png|webp|gif)$/.test(attachment.mime_type || '')
    ? `data:${attachment.mime_type};base64,${attachment.base64}`
    : undefined;
}
