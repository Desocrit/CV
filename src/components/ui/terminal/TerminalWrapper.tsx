import { useState, useEffect, useCallback } from 'react';
import RAGTerminal from './RAGTerminal';

// Custom event type declarations for terminal events
interface TerminalOpenEventDetail {
  initialQuery?: string;
  nodeId?: string;
}

// Declare custom events on WindowEventMap for proper TypeScript support
declare global {
  interface WindowEventMap {
    'open-rag-terminal': CustomEvent<TerminalOpenEventDetail>;
    'terminal:open': CustomEvent<void>;
  }
}

export default function TerminalWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>();
  const [nodeId, setNodeId] = useState<string | undefined>();

  const handleOpen = useCallback((event: CustomEvent<TerminalOpenEventDetail>) => {
    setInitialQuery(event.detail?.initialQuery);
    setNodeId(event.detail?.nodeId);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setInitialQuery(undefined);
    setNodeId(undefined);
  }, []);

  // Simple reopen handler for FAB (no query/nodeId needed)
  const handleReopen = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('open-rag-terminal', handleOpen);
    window.addEventListener('terminal:open', handleReopen);
    return () => {
      window.removeEventListener('open-rag-terminal', handleOpen);
      window.removeEventListener('terminal:open', handleReopen);
    };
  }, [handleOpen, handleReopen]);

  return (
    <RAGTerminal
      isOpen={isOpen}
      onClose={handleClose}
      onOpen={handleReopen}
      initialQuery={initialQuery}
      nodeId={nodeId}
    />
  );
}
