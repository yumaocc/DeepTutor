import {describe, expect, it} from '@jest/globals';
import type {CompleteAttachment} from '@assistant-ui/react-native';
import {
  outgoingAttachments,
  outgoingImages,
  validateAttachments,
  validateImages,
  imageUri,
  MAX_IMAGE_BYTES,
  MAX_TOTAL_BYTES,
} from '../src/chat/imageAttachments';
const photo = (uri = 'data:image/png;base64,YWJj'): CompleteAttachment => ({
  id: 'image-1',
  type: 'image',
  name: 'question.png',
  contentType: 'image/png',
  status: {type: 'complete'},
  content: [{type: 'image', image: uri}],
});
const document = (data = 'YWJj'): CompleteAttachment => ({
  id: 'document-1',
  type: 'document',
  name: 'notes.pdf',
  contentType: 'application/pdf',
  status: {type: 'complete'},
  content: [
    {
      type: 'file',
      data,
      mimeType: 'application/pdf',
      filename: 'notes.pdf',
    },
  ],
});
describe('image attachments', () => {
  it('maps assistant-ui image drafts to the server attachment envelope', () => {
    const images = outgoingImages([photo()]);
    expect(images).toEqual([
      {
        type: 'image',
        filename: 'question.png',
        mime_type: 'image/png',
        base64: 'YWJj',
      },
    ]);
    expect(imageUri(images[0])).toBe('data:image/png;base64,YWJj');
  });
  it('maps document drafts to the server attachment envelope', () => {
    expect(outgoingAttachments([document()])).toEqual([
      {
        type: 'document',
        filename: 'notes.pdf',
        mime_type: 'application/pdf',
        base64: 'YWJj',
      },
    ]);
    expect(() =>
      outgoingAttachments([{...document(), name: 'archive.zip'}]),
    ).toThrow('暂不支持');
  });
  it('enforces the combined attachment count', () => {
    expect(() =>
      validateAttachments(
        Array.from({length: 5}, () => ({type: 'document'})),
      ),
    ).toThrow('最多发送 4 个附件');
  });
  it('rejects unsupported formats and oversized payloads before sending', () => {
    expect(() =>
      outgoingImages([photo('data:image/svg+xml;base64,YWJj')]),
    ).toThrow();
    expect(() =>
      outgoingImages([
        photo(
          'data:image/png;base64,' +
            'A'.repeat(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4),
        ),
      ]),
    ).toThrow();
    expect(() =>
      validateImages(Array.from({length: 5}, () => ({type: 'image'}))),
    ).toThrow();
    expect(() =>
      validateImages([
        {
          type: 'image',
          base64: 'A'.repeat(Math.ceil((MAX_TOTAL_BYTES * 4) / 3) + 4),
        },
      ]),
    ).toThrow();
  });
});
