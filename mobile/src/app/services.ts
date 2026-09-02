import {RuntimeSettingsRepository} from '../config/RuntimeSettingsRepository';
import {AuthSessionRepository} from '../features/auth/AuthSessionRepository';
import {appStorage} from '../platform/storage/asyncStorage';
import {secureStorage} from '../platform/storage/secureStorage.native';

export const runtimeSettingsRepository = new RuntimeSettingsRepository(
  appStorage,
);
export const authSessionRepository = new AuthSessionRepository(secureStorage);
