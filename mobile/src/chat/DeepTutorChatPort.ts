import type {ChatSnapshot} from './ChatClient';
export type {ChatMessage as DeepTutorChatMessage} from './protocol';

/** DeepTutor owns wire events and persistence; Assistant UI subscribes to snapshots. */
export interface DeepTutorChatPort {
  getSnapshot(): ChatSnapshot;
  subscribe(listener: () => void): () => void;
  send(content: string): Promise<void>;
  cancel(): Promise<void>;
  regenerate(): Promise<void>;
  loadSession(sessionId: string): Promise<void>;
  newSession(): void;
}
