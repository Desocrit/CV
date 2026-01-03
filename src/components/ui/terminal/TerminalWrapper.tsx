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

  const handleOpen = useCallback((event: TerminalOpenEvent) => {
    setInitialQuery(event.detail?.initialQuery);
    setNodeId(event.detail?.nodeId);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setInitialQuery(undefined);
    setNodeId(undefined);
  }, []);

  useEffect(() => {
    window.addEventListener('open-rag-terminal', handleOpen as EventListener);
    return () => {
      window.removeEventListener('open-rag-terminal', handleOpen as EventListener);
    };
  }, [handleOpen]);

  return (
    <RAGTerminal
      isOpen={isOpen}
      onClose={handleClose}
      initialQuery={initialQuery}
      nodeId={nodeId}
    />
  );
}
