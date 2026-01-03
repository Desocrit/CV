import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for terminal output
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

interface RAGTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  initialQuery?: string;
  nodeId?: string;
}

type BootPhase = 'idle' | 'booting' | 'ready';

interface BootMessage {
  text: string;
  delay: number;
}

// Generate dynamic boot sequence with forensic data
const generateBootSequence = (nodeId?: string): BootMessage[] => {
  const similarity = (0.95 + Math.random() * 0.049).toFixed(3);
  const node = nodeId || `${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}_${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`;

  return [
    { text: '[SCAN] INITIALIZING_FORENSIC_READOUT...', delay: 0 },
    { text: `[SCAN] NODE_ID: ${node}`, delay: 120 },
    { text: `[SCAN] VECTOR_SIMILARITY: ${similarity}`, delay: 240 },
    { text: '[SCAN] SOURCE: NEON_DB_PROD', delay: 360 },
    { text: '[SYSTEM] EMBEDDING_INDEX: LOADED', delay: 480 },
    { text: '[SYSTEM] AI_GATEWAY: CONNECTED', delay: 600 },
    { text: '[SYSTEM] FORENSIC_READOUT_INITIALIZED...', delay: 720 },
  ];
};

// Track if we've booted this session (persists across open/close, resets on page reload)
let hasBootedThisSession = false;

export default function RAGTerminal({
  isOpen,
  onClose,
  onOpen,
  initialQuery,
  nodeId,
}: RAGTerminalProps) {
  const [bootPhase, setBootPhase] = useState<BootPhase>(
    hasBootedThisSession ? 'ready' : 'idle'
  );
  const [bootMessages, setBootMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hasEverOpened, setHasEverOpened] = useState(hasBootedThisSession);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bootSequenceRef = useRef<BootMessage[]>([]);
  const hasSentInitialQuery = useRef(false);

  const transport = useMemo(
    () => new TextStreamChatTransport({ api: '/api/chat' }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Handle closing with CRT fade-out animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  }, [onClose]);

  // Set pending query when initialQuery changes
  useEffect(() => {
    if (initialQuery && isOpen) {
      setPendingQuery(initialQuery);
      hasSentInitialQuery.current = false;
    }
  }, [initialQuery, isOpen]);

  // Boot sequence with forensic data (only runs once per session)
  useEffect(() => {
    if (isOpen && bootPhase === 'idle' && !hasBootedThisSession) {
      setHasEverOpened(true);
      setBootPhase('booting');
      setBootMessages([]);

      // Generate dynamic boot sequence
      bootSequenceRef.current = generateBootSequence(nodeId);

      bootSequenceRef.current.forEach(({ text, delay }) => {
        setTimeout(() => {
          setBootMessages((prev) => [...prev, text]);
        }, delay);
      });

      setTimeout(() => {
        setBootPhase('ready');
        hasBootedThisSession = true;
        inputRef.current?.focus();
      }, 900);
    } else if (isOpen && hasBootedThisSession) {
      // Already booted, just ensure we're ready and focused
      setHasEverOpened(true);
      setBootPhase('ready');
      inputRef.current?.focus();
    }

    if (!isOpen) {
      // Don't reset bootPhase to idle if we've booted - preserve ready state
      setHistoryIndex(-1);
      hasSentInitialQuery.current = false;
    }
  }, [isOpen, bootPhase, nodeId]);

  // Auto-send initial query after boot completes
  useEffect(() => {
    if (
      bootPhase === 'ready' &&
      pendingQuery &&
      !hasSentInitialQuery.current &&
      !isLoading
    ) {
      hasSentInitialQuery.current = true;
      setCommandHistory((prev) => [...prev, pendingQuery]);
      sendMessage({ text: pendingQuery });
      setPendingQuery(null);
    }
  }, [bootPhase, pendingQuery, isLoading, sendMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, bootMessages]);

  // Keyboard handler for escape
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing, handleClose]);

  // Handle input key events for history navigation
  const handleInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex =
            historyIndex < commandHistory.length - 1
              ? historyIndex + 1
              : historyIndex;
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setInput('');
        }
      }
    },
    [commandHistory, historyIndex]
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      // Add to command history
      setCommandHistory((prev) => [...prev, input.trim()]);
      setHistoryIndex(-1);

      sendMessage({ text: input });
      setInput('');
    },
    [input, isLoading, sendMessage]
  );

  // Get message text from parts
  const getMessageText = (message: UIMessage): string => {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join('');
  };

  // Add/remove body class when terminal opens/closes for layout adjustment
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

  // Handle FAB click - use onOpen if provided, otherwise dispatch custom event
  const handleFabClick = useCallback(() => {
    if (onOpen) {
      onOpen();
    } else {
      // Dispatch custom event for parent components to listen to
      window.dispatchEvent(new CustomEvent('terminal:open'));
    }
  }, [onOpen]);

  // Show floating icon when closed but has been opened before
  if (!isOpen && !isClosing) {
    return hasEverOpened ? (
      <button
        className="terminal-floating-icon"
        onClick={handleFabClick}
        aria-label="Reopen terminal"
      >
        <span className="floating-icon-pulse" />
        <span className="floating-icon-text">&gt;_</span>
        <style>{`
          .terminal-floating-icon {
            position: fixed;
            bottom: 1.5rem;
            right: 1.5rem;
            width: 48px;
            height: 48px;
            border-radius: 8px;
            background: rgba(5, 5, 8, 0.95);
            border: 1px solid rgba(55, 191, 81, 0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-mono);
            color: #37BF51;
            font-size: 14px;
            font-weight: 600;
            z-index: 40;
            transition: all 0.2s ease;
            box-shadow:
              0 4px 12px rgba(0, 0, 0, 0.3),
              0 0 20px rgba(55, 191, 81, 0.1);
          }

          .terminal-floating-icon:hover {
            border-color: rgba(55, 191, 81, 0.6);
            box-shadow:
              0 4px 16px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(55, 191, 81, 0.2);
            transform: translateY(-2px);
          }

          .floating-icon-pulse {
            position: absolute;
            inset: -1px;
            border-radius: 8px;
            border: 1px solid rgba(55, 191, 81, 0.4);
            animation: floatingPulse 2s ease-in-out infinite;
          }

          @keyframes floatingPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.05); }
          }

          .floating-icon-text {
            position: relative;
            z-index: 1;
          }

          @media (max-width: 768px) {
            .terminal-floating-icon {
              bottom: 1rem;
              right: 1rem;
              width: 40px;
              height: 40px;
              font-size: 12px;
            }
          }
        `}</style>
      </button>
    ) : null;
  }

  return (
    <>
      {/* Main terminal container - inline bottom panel */}
      <div
        ref={terminalRef}
        className={`rag-terminal ${isClosing ? 'terminal-closing' : ''}`}
        role="dialog"
        aria-label="Forensic Analysis Terminal"
        aria-modal="true"
      >
        {/* CRT Scanline overlay */}
        <div className="crt-scanlines" aria-hidden="true" />
        <div className="crt-glow" aria-hidden="true" />

        {/* Header */}
        <div className="terminal-header">
          <div className="terminal-title">
            <span className="terminal-dot" />
            <span>FORENSIC_ANALYSIS_CONSOLE</span>
          </div>
          <div className="terminal-header-actions">
            <span className={`terminal-status ${!isLoading ? 'terminal-status-ready' : ''}`}>
              {isLoading ? '[PROCESSING]' : '[READY]'}
            </span>
            <button
              onClick={handleClose}
              className="terminal-close"
              aria-label="Close terminal"
            >
              [X]
            </button>
          </div>
        </div>

        {/* Split pane content */}
        <div className="terminal-content">
          {/* Main output pane */}
          <div className="terminal-main">
            <div className="terminal-body">
              {/* Boot sequence */}
              {bootMessages.map((msg, i) => (
                <div
                  key={`boot-${i}`}
                  className="terminal-line terminal-system phosphor-trail"
                >
                  {msg}
                </div>
              ))}

              {/* Chat messages - System Log style */}
              {messages.map((message: UIMessage) => (
                <div key={message.id} className="terminal-message">
                  {message.role === 'user' ? (
                    <div className="terminal-line phosphor-trail">
                      <span className="terminal-tag terminal-tag-user">
                        [USER]
                      </span>{' '}
                      <span className="terminal-user-input">
                        {getMessageText(message)}
                      </span>
                    </div>
                  ) : (
                    <div className="terminal-line terminal-response phosphor-trail">
                      <span className="terminal-tag terminal-tag-kernel">
                        [KERNEL]
                      </span>{' '}
                      <span
                        className="terminal-response-text"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            marked.parse(getMessageText(message)) as string
                          ),
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="terminal-line terminal-loading">
                  <span className="terminal-tag terminal-tag-kernel">
                    [KERNEL]
                  </span>{' '}
                  <span className="terminal-cursor">_</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="terminal-input-container">
              <span className="terminal-input-prompt">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="terminal-input"
                placeholder={bootPhase === 'ready' ? 'ENTER_QUERY...' : ''}
                disabled={bootPhase !== 'ready'}
                autoComplete="off"
                spellCheck="false"
              />
              <span className="terminal-cursor-input">_</span>
            </form>
          </div>

          {/* Metadata sidebar */}
          <div className="terminal-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-header">COMMAND_HISTORY</div>
              <div className="sidebar-content sidebar-history">
                {commandHistory.length === 0 ? (
                  <div className="history-empty">NO_QUERIES_LOGGED</div>
                ) : (
                  commandHistory
                    .slice(-8)
                    .reverse()
                    .map((cmd, i) => (
                      <div key={i} className="history-item">
                        <span className="history-index">
                          {String(commandHistory.length - i).padStart(2, '0')}
                        </span>
                        <span className="history-command">{cmd}</span>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="sidebar-section sidebar-help">
              <div className="sidebar-header">CONTROLS</div>
              <div className="sidebar-content">
                <div className="help-item">
                  <kbd>↑</kbd> <span>Previous query</span>
                </div>
                <div className="help-item">
                  <kbd>↓</kbd> <span>Next query</span>
                </div>
                <div className="help-item">
                  <kbd>ESC</kbd> <span>Close terminal</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          /* Body layout adjustment when terminal is open */
          :global(body.terminal-open) {
            overflow: hidden;
          }

          :global(body.terminal-open #main-content) {
            height: calc(100vh - 40vh) !important;
            overflow-y: auto !important;
            padding-bottom: 1rem !important;
          }

          /* Add spacer to sidebar so user can scroll to see all content */
          :global(body.terminal-open .sidebar-column) {
            padding-bottom: calc(40vh + 2rem) !important;
          }

          /* Dim gutter markers (// PROJECTS, // IMPACT) when terminal is active */
          :global(body.terminal-open .section-label) {
            opacity: 0.3 !important;
            transition: opacity 0.3s ease;
          }

          .rag-terminal {
            position: fixed;
            bottom: 0;
            /* Position in main content area - sidebar is 380px on desktop */
            left: 380px;
            right: 0;
            height: 40vh;
            min-height: 280px;
            max-height: 50vh;
            z-index: 50;
            display: flex;
            flex-direction: column;
            background: rgba(5, 5, 8, 0.98);
            border-top: 1px solid rgba(55, 191, 81, 0.3);
            border-left: 1px solid rgba(55, 191, 81, 0.15);
            font-family: var(--font-mono);
            font-size: 11px;
            color: #888;
            box-shadow:
              0 -10px 40px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(55, 191, 81, 0.06),
              inset 0 1px 0 rgba(55, 191, 81, 0.1);
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            overflow: hidden;
          }

          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          /* CRT power-off animation - slides down */
          .terminal-closing {
            animation: crtPowerOff 0.15s ease-in forwards;
          }

          @keyframes crtPowerOff {
            0% {
              opacity: 1;
              transform: translateY(0);
              filter: brightness(1);
            }
            30% {
              filter: brightness(1.3);
            }
            100% {
              opacity: 0;
              transform: translateY(100%);
              filter: brightness(0.5);
            }
          }

          /* CRT Effects */
          .crt-scanlines {
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.03) 0px,
              rgba(0, 0, 0, 0.03) 1px,
              transparent 1px,
              transparent 2px
            );
            z-index: 100;
            animation: scanlines 8s linear infinite;
          }

          @keyframes scanlines {
            0% { transform: translateY(0); }
            100% { transform: translateY(4px); }
          }

          .crt-glow {
            position: absolute;
            inset: -1px;
            pointer-events: none;
            border: 1px solid transparent;
            box-shadow:
              inset 0 0 60px rgba(55, 191, 81, 0.03),
              inset 0 0 20px rgba(55, 191, 81, 0.02);
            z-index: 99;
          }

          /* Phosphor ghosting effect */
          .phosphor-trail {
            text-shadow: 0 0 2px currentColor;
            animation: phosphorFade 0.1s ease-out;
          }

          @keyframes phosphorFade {
            from {
              text-shadow: 0 0 8px currentColor, 0 0 4px currentColor;
              filter: brightness(1.2);
            }
            to {
              text-shadow: 0 0 2px currentColor;
              filter: brightness(1);
            }
          }

          .terminal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.625rem 1rem;
            border-bottom: 1px solid rgba(55, 191, 81, 0.15);
            background: rgba(0, 0, 0, 0.3);
            flex-shrink: 0;
          }

          .terminal-title {
            display: flex;
            align-items: center;
            gap: 0.625rem;
            color: rgba(55, 191, 81, 0.7);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
          }

          .terminal-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #37BF51;
            box-shadow: 0 0 8px #37BF51, 0 0 16px rgba(55, 191, 81, 0.5);
            animation: pulse 2s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 8px #37BF51, 0 0 16px rgba(55, 191, 81, 0.5); }
            50% { opacity: 0.7; box-shadow: 0 0 4px #37BF51, 0 0 8px rgba(55, 191, 81, 0.3); }
          }

          .terminal-header-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .terminal-status {
            color: #555;
            font-size: 9px;
            letter-spacing: 0.1em;
          }

          .terminal-status-ready {
            color: #37BF51;
            animation: statusPulse 2s ease-in-out infinite;
          }

          @keyframes statusPulse {
            0%, 100% {
              opacity: 1;
              text-shadow: 0 0 4px rgba(55, 191, 81, 0.5);
            }
            50% {
              opacity: 0.6;
              text-shadow: 0 0 8px rgba(55, 191, 81, 0.8);
            }
          }

          .terminal-close {
            background: none;
            border: none;
            color: #555;
            font-family: inherit;
            font-size: 10px;
            cursor: pointer;
            padding: 0.25rem 0.5rem;
            transition: all 0.15s;
          }

          .terminal-close:hover {
            color: #37BF51;
            text-shadow: 0 0 8px rgba(55, 191, 81, 0.5);
          }

          .terminal-content {
            display: flex;
            flex: 1;
            min-height: 0;
          }

          .terminal-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
            border-right: 1px solid rgba(55, 191, 81, 0.1);
          }

          .terminal-body {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            scrollbar-width: thin;
            scrollbar-color: rgba(55, 191, 81, 0.2) transparent;
          }

          .terminal-body::-webkit-scrollbar {
            width: 4px;
          }

          .terminal-body::-webkit-scrollbar-track {
            background: transparent;
          }

          .terminal-body::-webkit-scrollbar-thumb {
            background: rgba(55, 191, 81, 0.2);
            border-radius: 2px;
          }

          .terminal-line {
            line-height: 1.7;
            word-wrap: break-word;
          }

          .terminal-system {
            color: #37BF51;
          }

          .terminal-tag {
            font-weight: 600;
            letter-spacing: 0.05em;
          }

          .terminal-tag-user {
            color: #6b9fff;
          }

          .terminal-tag-kernel {
            color: #9d7cd8;
          }

          .terminal-message {
            margin: 0.625rem 0;
          }

          .terminal-user-input {
            color: #e0e0e0;
          }

          .terminal-response {
            color: #888;
          }

          .terminal-response-text {
            color: #a0a0a0;
            line-height: 1.6;
          }

          /* Markdown styles for terminal output */
          .terminal-response-text h1,
          .terminal-response-text h2,
          .terminal-response-text h3 {
            color: #37BF51;
            font-weight: 600;
            margin: 0.75rem 0 0.25rem 0;
            line-height: 1.3;
          }

          .terminal-response-text h1 { font-size: 14px; }
          .terminal-response-text h2 { font-size: 12px; }
          .terminal-response-text h3 { font-size: 11px; }

          .terminal-response-text p {
            margin: 0.5rem 0;
          }

          .terminal-response-text strong {
            color: #e0e0e0;
            font-weight: 600;
          }

          .terminal-response-text em {
            color: #9d7cd8;
            font-style: italic;
          }

          .terminal-response-text code {
            background: rgba(55, 191, 81, 0.1);
            color: #37BF51;
            padding: 0.1rem 0.3rem;
            border-radius: 2px;
            font-size: 10px;
          }

          .terminal-response-text pre {
            background: rgba(0, 0, 0, 0.4);
            border-left: 2px solid rgba(55, 191, 81, 0.3);
            padding: 0.5rem;
            margin: 0.5rem 0;
            overflow-x: auto;
          }

          .terminal-response-text pre code {
            background: none;
            padding: 0;
          }

          .terminal-response-text ul,
          .terminal-response-text ol {
            margin: 0.5rem 0;
            padding-left: 1.25rem;
          }

          .terminal-response-text li {
            margin: 0.25rem 0;
          }

          .terminal-response-text li::marker {
            color: #37BF51;
          }

          .terminal-response-text a {
            color: #6b9fff;
            text-decoration: underline;
            text-underline-offset: 2px;
          }

          .terminal-response-text a:hover {
            color: #9d7cd8;
          }

          .terminal-response-text blockquote {
            border-left: 2px solid #9d7cd8;
            padding-left: 0.75rem;
            margin: 0.5rem 0;
            color: #888;
            font-style: italic;
          }

          .terminal-response-text hr {
            border: none;
            border-top: 1px solid rgba(55, 191, 81, 0.2);
            margin: 0.75rem 0;
          }

          .terminal-loading {
            color: #555;
          }

          .terminal-cursor {
            color: #37BF51;
            animation: blink 1s step-end infinite;
          }

          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }

          .terminal-input-container {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            border-top: 1px solid rgba(55, 191, 81, 0.1);
            background: rgba(0, 0, 0, 0.4);
            flex-shrink: 0;
          }

          .terminal-input-prompt {
            color: #37BF51;
            margin-right: 0.5rem;
            font-weight: 600;
          }

          .terminal-input {
            flex: 1;
            background: none;
            border: none;
            color: #f2f2f2;
            font-family: inherit;
            font-size: inherit;
            outline: none;
            caret-color: transparent;
          }

          .terminal-input::placeholder {
            color: #444;
            letter-spacing: 0.05em;
          }

          .terminal-input:disabled {
            color: #555;
          }

          .terminal-cursor-input {
            color: #37BF51;
            animation: blink 1s step-end infinite;
          }

          /* Sidebar */
          .terminal-sidebar {
            width: 200px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            background: rgba(0, 0, 0, 0.2);
            overflow-y: auto;
          }

          .sidebar-section {
            border-bottom: 1px solid rgba(55, 191, 81, 0.1);
          }

          .sidebar-section:last-child {
            border-bottom: none;
          }

          .sidebar-header {
            padding: 0.625rem 0.75rem;
            font-size: 9px;
            color: rgba(55, 191, 81, 0.6);
            letter-spacing: 0.15em;
            background: rgba(55, 191, 81, 0.03);
            border-bottom: 1px solid rgba(55, 191, 81, 0.08);
          }

          .sidebar-content {
            padding: 0.5rem 0.75rem;
          }

          .sidebar-history {
            max-height: 120px;
            overflow-y: auto;
          }

          .history-empty {
            color: #444;
            font-size: 9px;
            padding: 0.25rem 0;
          }

          .history-item {
            display: flex;
            gap: 0.5rem;
            padding: 0.25rem 0;
            font-size: 9px;
          }

          .history-index {
            color: #444;
            min-width: 1.5rem;
          }

          .history-command {
            color: #666;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .sidebar-help {
            margin-top: auto;
          }

          .help-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.25rem 0;
            font-size: 9px;
            color: #555;
          }

          .help-item kbd {
            display: inline-block;
            padding: 0.125rem 0.375rem;
            background: rgba(55, 191, 81, 0.1);
            border: 1px solid rgba(55, 191, 81, 0.2);
            border-radius: 2px;
            font-size: 8px;
            color: #37BF51;
          }

          /* Mobile - stacked layout, terminal goes full width */
          @media (max-width: 1024px) {
            :global(body.terminal-open #main-content) {
              height: 50vh !important;
            }

            :global(body.terminal-open .sidebar-column) {
              padding-bottom: 0 !important;
            }

            .rag-terminal {
              left: 0;
              height: 50vh;
              min-height: 240px;
              border-left: none;
            }

            .terminal-sidebar {
              display: none;
            }

            .terminal-main {
              border-right: none;
            }
          }

          /* Print: hide terminal */
          @media print {
            .rag-terminal {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </>
  );
}
