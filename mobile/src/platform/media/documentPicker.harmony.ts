export type PickedDocument = {
  name: string;
  mimeType: string;
  base64: string;
};

export async function pickDocuments(
  _limit: number,
): Promise<PickedDocument[]> {
  throw new Error('鸿蒙版本暂不支持文件选择。');
}
