import { useState, useEffect, useCallback } from 'react';
import RAGTerminal from './RAGTerminal';

interface TerminalOpenEvent extends CustomEvent {
  detail: {
    initialQuery?: string;
    nodeId?: string;
  };
}

export default function TerminalWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>();
  const [nodeId, setNodeId] = useState<string | undefined>();

  const handleOpen = useCallback((event?: TerminalOpenEvent) => {
    setInitialQuery(event?.detail?.initialQuery);
    setNodeId(event?.detail?.nodeId);
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
    window.addEventListener('open-rag-terminal', handleOpen as EventListener);
    window.addEventListener('terminal:open', handleReopen);
    return () => {
      window.removeEventListener('open-rag-terminal', handleOpen as EventListener);
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
