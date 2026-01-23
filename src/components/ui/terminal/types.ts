import type { UIMessage } from '@ai-sdk/react';

export interface RAGTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  initialQuery?: string;
  nodeId?: string;
}

export type BootPhase = 'idle' | 'booting' | 'ready';

export interface BootMessage {
  text: string;
  delay: number;
}

// Re-export for convenience
export type { UIMessage };
