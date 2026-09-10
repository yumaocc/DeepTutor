import type {KeyValueStorage} from '../../platform/storage/types';

const INSTALLATION_ID_KEY = 'deeptutor.mobile.installation-id';

function createInstallationId(): string {
  const random = Array.from({length: 32}, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return `mobile_${Date.now().toString(36)}_${random}`;
}

export async function getOrCreateInstallationId(
  storage: KeyValueStorage,
): Promise<string> {
  const existing = await storage.get(INSTALLATION_ID_KEY);
  if (existing) {
    return existing;
  }
  const created = createInstallationId();
  await storage.set(INSTALLATION_ID_KEY, created);
  return created;
}
