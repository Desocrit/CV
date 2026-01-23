interface TerminalHeaderProps {
  titleId: string;
  isLoading: boolean;
  onClose: () => void;
}

export function TerminalHeader({ titleId, isLoading, onClose }: TerminalHeaderProps) {
  return (
    <div className="terminal-header">
      <div className="terminal-title" id={titleId}>
        <span className="terminal-dot" aria-hidden="true" />
        <span>FORENSIC_ANALYSIS_CONSOLE</span>
      </div>
      <div className="terminal-header-actions">
        <span className={`terminal-status ${!isLoading ? 'terminal-status-ready' : ''}`}>
          {isLoading ? '[PROCESSING]' : '[READY]'}
        </span>
        <button
          onClick={onClose}
          className="terminal-close"
          aria-label="Close terminal"
        >
          [X]
        </button>
      </div>
    </div>
  );
}
