export interface DeepTutorChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  streaming?: boolean;
}

export interface DeepTutorChatPort {
  readonly messages: readonly DeepTutorChatMessage[];
  readonly running: boolean;
  send(content: string): Promise<void>;
  cancel(): Promise<void>;
  regenerate(messageId: string): Promise<void>;
}

/** Assistant UI adapts this port; DeepTutor keeps ownership of WS semantics. */
export interface DeepTutorAssistantAdapter {
  readonly chat: DeepTutorChatPort;
}
