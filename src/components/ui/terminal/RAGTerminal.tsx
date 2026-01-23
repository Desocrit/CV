import { useState, useEffect, useRef, useCallback, useMemo, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';

// Import the terminal-specific styles
import '../../../styles/rag-terminal.css';

// Local imports
import type { RAGTerminalProps, BootPhase, BootMessage } from './types';
import { useReducedMotion, useFocusTrap, useCommandHistory } from './hooks';
import { generateBootSequence, getHasBootedThisSession, setHasBootedThisSession } from './utils';
import {
  CRTEffects,
  TerminalHeader,
  TerminalMessages,
  TerminalInput,
  TerminalSidebar,
  FloatingIcon,
} from './components';

// Unique ID for aria-labelledby
const TITLE_ID = 'rag-terminal-title';

export default function RAGTerminal({
  isOpen,
  onClose,
  onOpen,
  initialQuery,
  nodeId,
}: RAGTerminalProps) {
  const [bootPhase, setBootPhase] = useState<BootPhase>(
    getHasBootedThisSession() ? 'ready' : 'idle'
  );
  const [bootMessages, setBootMessages] = useState<string[]>([]);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hasEverOpened, setHasEverOpened] = useState(getHasBootedThisSession());

  // Custom hooks
  const prefersReducedMotion = useReducedMotion();
  const { input, setInput, commandHistory, addToHistory, resetHistoryIndex, handleKeyDown } =
    useCommandHistory();

  // Refs
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bootSequenceRef = useRef<BootMessage[]>([]);
  const hasSentInitialQuery = useRef(false);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Activate focus trap when terminal is open and ready
  useFocusTrap(terminalRef, isOpen && bootPhase === 'ready', inputRef);

  // Chat setup
  const transport = useMemo(
    () => new TextStreamChatTransport({ api: '/api/chat' }),
    []
  );
  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === 'submitted' || status === 'streaming';

  // Handle closing with CRT fade-out animation and focus restoration
  const handleClose = useCallback(() => {
    setIsClosing(true);
    const elementToFocus = triggerElementRef.current;
    const animationDuration = prefersReducedMotion ? 0 : 150;
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      if (elementToFocus && document.body.contains(elementToFocus)) {
        elementToFocus.focus();
      }
    }, animationDuration);
  }, [onClose, prefersReducedMotion]);

  // Set pending query when initialQuery changes
  useEffect(() => {
    if (initialQuery && isOpen) {
      setPendingQuery(initialQuery);
      hasSentInitialQuery.current = false;
    }
  }, [initialQuery, isOpen]);

  // Boot sequence (only runs once per session)
  useEffect(() => {
    const hasBooted = getHasBootedThisSession();
    if (isOpen && bootPhase === 'idle' && !hasBooted) {
      setHasEverOpened(true);
      setBootPhase('booting');
      setBootMessages([]);

      bootSequenceRef.current = generateBootSequence(nodeId);

      bootSequenceRef.current.forEach(({ text, delay }) => {
        setTimeout(() => {
          setBootMessages((prev) => [...prev, text]);
        }, delay);
      });

      setTimeout(() => {
        setBootPhase('ready');
        setHasBootedThisSession(true);
        inputRef.current?.focus();
      }, 900);
    } else if (isOpen && hasBooted) {
      setHasEverOpened(true);
      setBootPhase('ready');
      inputRef.current?.focus();
    }

    if (!isOpen) {
      resetHistoryIndex();
      hasSentInitialQuery.current = false;
    }
  }, [isOpen, bootPhase, nodeId, resetHistoryIndex]);

  // Auto-send initial query after boot completes
  useEffect(() => {
    if (
      bootPhase === 'ready' &&
      pendingQuery &&
      !hasSentInitialQuery.current &&
      !isLoading
    ) {
      hasSentInitialQuery.current = true;
      addToHistory(pendingQuery);
      sendMessage({ text: pendingQuery });
      setPendingQuery(null);
    }
  }, [bootPhase, pendingQuery, isLoading, sendMessage, addToHistory]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, bootMessages]);

  // Keyboard handler for escape
  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isClosing, handleClose]);

  // Add/remove body class when terminal opens/closes
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('terminal-open');
    } else {
      document.body.classList.remove('terminal-open');
    }
    return () => {
      document.body.classList.remove('terminal-open');
    };
  }, [isOpen]);

  // Capture trigger element when terminal opens (for focus restoration)
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Handle submit
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      addToHistory(input.trim());
      sendMessage({ text: input });
      setInput('');
    },
    [input, isLoading, sendMessage, addToHistory, setInput]
  );

  // Handle FAB click
  const handleFabClick = useCallback(() => {
    if (onOpen) {
      onOpen();
    } else {
      window.dispatchEvent(new CustomEvent('terminal:open'));
    }
  }, [onOpen]);

  // Show floating icon when closed but has been opened before
  if (!isOpen && !isClosing) {
    return hasEverOpened ? <FloatingIcon onClick={handleFabClick} /> : null;
  }

  return (
    <div
      ref={terminalRef}
      className={`rag-terminal ${isClosing ? 'terminal-closing' : ''}`}
      data-terminal-scope
      role="complementary"
      aria-labelledby={TITLE_ID}
    >
      <CRTEffects />

      <TerminalHeader
        titleId={TITLE_ID}
        isLoading={isLoading}
        onClose={handleClose}
      />

      <div className="terminal-content">
        <div className="terminal-main">
          <TerminalMessages
            bootMessages={bootMessages}
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />

          <TerminalInput
            inputRef={inputRef}
            input={input}
            onInputChange={setInput}
            onKeyDown={handleKeyDown}
            onSubmit={handleSubmit}
            isReady={bootPhase === 'ready'}
          />
        </div>

        <TerminalSidebar commandHistory={commandHistory} />
      </div>
    </div>
  );
}
