import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  base64Bytes,
  MAX_DOCUMENT_BYTES,
  supportsDocument,
} from '../../chat/imageAttachments';

export type PickedDocument = {
  name: string;
  mimeType: string;
  base64: string;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  epub: 'application/epub+zip',
  json: 'application/json',
  csv: 'text/csv',
  md: 'text/markdown',
  txt: 'text/plain',
};

function inferredMimeType(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXTENSION[extension] || 'text/plain';
}

async function readPickedFile(
  file: Awaited<ReturnType<typeof pick>>[number],
): Promise<PickedDocument> {
  const name = file.name?.trim() || `document-${Date.now()}.txt`;
  if (file.error) {
    throw new Error(`无法读取“${name}”：${file.error}`);
  }
  if (!supportsDocument(name)) {
    throw new Error(`暂不支持“${name}”这种文件。`);
  }
  if (file.size != null && file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`“${name}”超过 20 MB。`);
  }
  const [copy] = await keepLocalCopy({
    files: [{uri: file.uri, fileName: name}],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success') {
    throw new Error(`无法读取“${name}”：${copy.copyError}`);
  }
  const localPath = decodeURIComponent(copy.localUri).replace(/^file:\/\//, '');
  try {
    const base64 = await ReactNativeBlobUtil.fs.readFile(localPath, 'base64');
    if (base64Bytes(base64) > MAX_DOCUMENT_BYTES) {
      throw new Error(`“${name}”超过 20 MB。`);
    }
    return {
      name,
      mimeType: file.type || inferredMimeType(name),
      base64,
    };
  } finally {
    ReactNativeBlobUtil.fs.unlink(localPath).catch(() => undefined);
  }
}

export async function pickDocuments(limit: number): Promise<PickedDocument[]> {
  if (limit <= 0) {
    throw new Error('每次最多发送 4 个附件。');
  }
  try {
    const selected = await pick({
      mode: 'import',
      type: types.allFiles,
      allowMultiSelection: limit > 1,
    });
    if (selected.length > limit) {
      throw new Error(`本次最多还能添加 ${limit} 个附件。`);
    }
    const documents: PickedDocument[] = [];
    for (const file of selected) {
      documents.push(await readPickedFile(file));
    }
    return documents;
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === errorCodes.OPERATION_CANCELED
    ) {
      return [];
    }
    throw error;
  }
}
