import type {CompleteAttachment} from '@assistant-ui/react-native';
import type {ChatAttachment} from './protocol';
export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
export const MAX_ATTACHMENTS = 4;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const SUPPORTED_DOCUMENT_EXTENSION = /\.(?:pdf|docx|xlsx|pptx|epub|txt|text|log|md|markdown|rst|asciidoc|json|jsonc|json5|ya?ml|toml|csv|tsv|ini|cfg|conf|env|properties|tex|latex|bib|js|mjs|cjs|ts|mts|cts|jsx|tsx|vue|svelte|py|java|kt|kts|scala|groovy|gradle|c|h|cpp|cc|cxx|hpp|hh|hxx|cs|go|rs|zig|nim|swift|rb|php|sh|bash|zsh|fish|sql)$/i;

export function supportsDocument(filename: string): boolean {
  return SUPPORTED_DOCUMENT_EXTENSION.test(filename.trim());
}

export function base64Bytes(value: string): number {
  const compact = value.replace(/[\r\n]/g, '');
  const padding = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((compact.length * 3) / 4) - padding);
}
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
    if (base64Bytes(match[2]) > MAX_IMAGE_BYTES) {
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

export function outgoingAttachments(
  attachments: readonly CompleteAttachment[],
): ChatAttachment[] {
  return attachments.map(attachment => {
    if (attachment.type === 'image') {
      return outgoingImages([attachment])[0];
    }
    const part = attachment.content.find(p => p.type === 'file');
    if (part?.type !== 'file' || typeof part.data !== 'string') {
      throw new Error('文件读取失败，请重新选择。');
    }
    if (!supportsDocument(attachment.name)) {
      throw new Error(`暂不支持文件“${attachment.name}”。`);
    }
    const dataUrl = /^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(
      part.data,
    );
    const base64 = dataUrl ? dataUrl[2] : part.data;
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64)) {
      throw new Error(`文件“${attachment.name}”内容无效。`);
    }
    if (base64Bytes(base64) > MAX_DOCUMENT_BYTES) {
      throw new Error('单个文件不能超过 20 MB。');
    }
    return {
      type: 'document',
      filename: attachment.name,
      mime_type: dataUrl?.[1] || part.mimeType || attachment.contentType || '',
      base64,
    };
  });
}

export function validateAttachments(attachments: ChatAttachment[]) {
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new Error('每次最多发送 4 个附件。');
  }
  if (
    attachments.reduce(
      (sum, attachment) => sum + base64Bytes(attachment.base64 || ''),
      0,
    ) > MAX_ATTACHMENT_BYTES
  ) {
    throw new Error('附件合计不能超过 25 MB，请减少附件数量。');
  }
}
export function validateImages(images: ChatAttachment[]) {
  if (images.length > MAX_IMAGES) {
    throw new Error('每次最多发送 4 张图片。');
  }
  if (
    images.reduce((sum, a) => sum + base64Bytes(a.base64 || ''), 0) >
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
