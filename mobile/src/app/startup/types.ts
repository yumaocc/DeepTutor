import type {RuntimeSettings} from '../../config/RuntimeSettingsRepository';
import type {AuthSession} from '../../features/auth/AuthSessionRepository';

export type StartupState =
  | {phase: 'booting'}
  | {phase: 'needs_server'}
  | {phase: 'needs_auth'; settings: RuntimeSettings}
  | {phase: 'offline'; settings: RuntimeSettings; session: AuthSession}
  | {phase: 'upgrade_required'; settings: RuntimeSettings}
  | {phase: 'ready'; settings: RuntimeSettings; session: AuthSession}
  | {phase: 'fatal'; message: string};

export interface StartupActions {
  retry(): Promise<void>;
  saveServer(serverAddress: string): Promise<void>;
  acceptSession(session: AuthSession): Promise<void>;
  changeServer(): Promise<void>;
  clearSession(): Promise<void>;
}
