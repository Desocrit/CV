import { useState, useEffect, useRef, useCallback, useMemo, type FormEvent } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';

interface RAGTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BootPhase = 'idle' | 'booting' | 'ready';

const BOOT_SEQUENCE = [
  { text: '[SYSTEM] INITIALIZING_KERNEL...', delay: 0 },
  { text: '[SYSTEM] ACCESSING_NEON_STORE...', delay: 150 },
  { text: '[SYSTEM] VECTOR_INDEX: LOADED', delay: 300 },
  { text: '[SYSTEM] GATEWAY_CONNECTED: OK', delay: 450 },
  { text: '[SYSTEM] READY_FOR_QUERY', delay: 600 },
];

export default function RAGTerminal({ isOpen, onClose }: RAGTerminalProps) {
  const [bootPhase, setBootPhase] = useState<BootPhase>('idle');
  const [bootMessages, setBootMessages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [input, setInput] = useState('');
  const dragOffset = useRef({ x: 0, y: 0 });
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new TextStreamChatTransport({ api: '/api/chat' }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Boot sequence
  useEffect(() => {
    if (isOpen && bootPhase === 'idle') {
      setBootPhase('booting');
      setBootMessages([]);

      BOOT_SEQUENCE.forEach(({ text, delay }) => {
        setTimeout(() => {
          setBootMessages((prev) => [...prev, text]);
        }, delay);
      });

      setTimeout(() => {
        setBootPhase('ready');
        inputRef.current?.focus();
      }, 800);
    }

    if (!isOpen) {
      setBootPhase('idle');
      setBootMessages([]);
    }
  }, [isOpen, bootPhase]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, bootMessages]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only initiate drag if not clicking on the close button
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    const rect = terminalRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && terminalRef.current) {
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      sendMessage({ text: input });
      setInput('');
    },
    [input, isLoading, sendMessage]
  );

  if (!isOpen) return null;

  const positionStyle =
    position.x === 0 && position.y === 0
      ? { bottom: '2rem', right: '2rem' }
      : { left: `${position.x}px`, top: `${position.y}px` };

  return (
    <div
      ref={terminalRef}
      className="rag-terminal"
      style={positionStyle}
      role="dialog"
      aria-label="AI Query Terminal"
      aria-modal="true"
    >
      {/* Header - draggable */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="terminal-header" onMouseDown={handleMouseDown}>
        <div className="terminal-title">
          <span className="terminal-dot" />
          <span>SYSTEM_RECOVERY_CONSOLE</span>
        </div>
        <button
          onClick={onClose}
          className="terminal-close"
          aria-label="Close terminal"
        >
          [X]
        </button>
      </div>

      {/* Messages area */}
      <div className="terminal-body">
        {/* Boot sequence */}
        {bootMessages.map((msg, i) => (
          <div key={`boot-${i}`} className="terminal-line terminal-system">
            {msg}
          </div>
        ))}

        {/* Chat messages */}
        {messages.map((message: UIMessage) => (
          <div key={message.id} className="terminal-message">
            {message.role === 'user' ? (
              <div className="terminal-line">
                <span className="terminal-prompt">cjs@system:~$</span>{' '}
                <span className="terminal-user-input">
                  {message.parts.map((part, i) =>
                    part.type === 'text' ? <span key={i}>{part.text}</span> : null
                  )}
                </span>
              </div>
            ) : (
              <div className="terminal-line terminal-response">
                <span className="terminal-response-prefix">&gt;</span>{' '}
                {message.parts.map((part, i) =>
                  part.type === 'text' ? <span key={i}>{part.text}</span> : null
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="terminal-line terminal-loading">
            <span className="terminal-response-prefix">&gt;</span>{' '}
            <span className="terminal-cursor">_</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="terminal-input-container">
        <span className="terminal-prompt">cjs@system:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="terminal-input"
          placeholder={bootPhase === 'ready' ? 'Enter query...' : ''}
          disabled={bootPhase !== 'ready'}
          autoComplete="off"
          spellCheck="false"
        />
        <span className="terminal-cursor-input">_</span>
      </form>

      <style>{`
        .rag-terminal {
          position: fixed;
          z-index: 50;
          width: 100%;
          max-width: 42rem;
          height: 400px;
          display: flex;
          flex-direction: column;
          background: rgba(13, 13, 15, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-family: var(--font-mono);
          font-size: 11px;
          color: #888;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .terminal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          cursor: grab;
          user-select: none;
        }

        .terminal-header:active {
          cursor: grabbing;
        }

        .terminal-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #555;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .terminal-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #37BF51;
          box-shadow: 0 0 6px #37BF51;
        }

        .terminal-close {
          background: none;
          border: none;
          color: #555;
          font-family: inherit;
          font-size: 10px;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          transition: color 0.15s;
        }

        .terminal-close:hover {
          color: #37BF51;
        }

        .terminal-body {
          flex: 1;
          overflow-y: auto;
          padding: 0.75rem;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
        }

        .terminal-body::-webkit-scrollbar {
          width: 4px;
        }

        .terminal-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .terminal-body::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }

        .terminal-line {
          line-height: 1.6;
          word-wrap: break-word;
        }

        .terminal-system {
          color: #37BF51;
        }

        .terminal-message {
          margin: 0.5rem 0;
        }

        .terminal-prompt {
          color: #37BF51;
          margin-right: 0.5rem;
        }

        .terminal-user-input {
          color: #f2f2f2;
        }

        .terminal-response {
          color: #888;
          padding-left: 0;
        }

        .terminal-response-prefix {
          color: #9d7cd8;
          margin-right: 0.5rem;
        }

        .terminal-loading {
          color: #555;
        }

        .terminal-cursor {
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .terminal-input-container {
          display: flex;
          align-items: center;
          padding: 0.5rem 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.3);
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
        }

        .terminal-input:disabled {
          color: #555;
        }

        .terminal-cursor-input {
          color: #37BF51;
          animation: blink 1s step-end infinite;
        }

        @media (max-width: 768px) {
          .rag-terminal {
            max-width: calc(100vw - 2rem);
            height: 300px;
            right: 1rem !important;
            bottom: 1rem !important;
            left: auto !important;
            top: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
