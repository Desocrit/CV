interface TerminalSidebarProps {
  commandHistory: string[];
}

export function TerminalSidebar({ commandHistory }: TerminalSidebarProps) {
  return (
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
  );
}
