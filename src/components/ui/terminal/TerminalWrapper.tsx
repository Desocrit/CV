import { useState } from 'react';
import RAGTerminal from './RAGTerminal';

export default function TerminalWrapper() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button - positioned in bottom-left on screen */}
      <button
        onClick={() => setIsOpen(true)}
        className="terminal-trigger"
        aria-label="Open AI Query Terminal"
        data-print="hide"
      >
        <span className="trigger-label">AGENT_QUERY</span>
        <span className="trigger-cta">[INITIALIZE_TERMINAL]</span>
      </button>

      {/* Terminal overlay */}
      <RAGTerminal isOpen={isOpen} onClose={() => setIsOpen(false)} />

      <style>{`
        .terminal-trigger {
          position: fixed;
          bottom: 2rem;
          left: 2rem;
          z-index: 40;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
          padding: 0.75rem 1rem;
          background: rgba(13, 13, 15, 0.8);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          font-family: var(--font-mono);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .terminal-trigger:hover {
          border-color: rgba(55, 191, 81, 0.3);
          background: rgba(13, 13, 15, 0.95);
        }

        .terminal-trigger:hover .trigger-cta {
          color: #37BF51;
          text-shadow: 0 0 8px rgba(55, 191, 81, 0.4);
        }

        .trigger-label {
          font-size: 9px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        .trigger-cta {
          font-size: 10px;
          color: #37BF51;
          letter-spacing: 0.05em;
          transition: all 0.2s ease;
        }

        @media (max-width: 1024px) {
          .terminal-trigger {
            bottom: 1rem;
            left: 1rem;
            padding: 0.5rem 0.75rem;
          }

          .trigger-label {
            font-size: 8px;
          }

          .trigger-cta {
            font-size: 9px;
          }
        }

        @media print {
          .terminal-trigger {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
