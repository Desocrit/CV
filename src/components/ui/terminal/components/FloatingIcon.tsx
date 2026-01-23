interface FloatingIconProps {
  onClick: () => void;
}

export function FloatingIcon({ onClick }: FloatingIconProps) {
  return (
    <button
      className="terminal-floating-icon"
      onClick={onClick}
      aria-label="Reopen terminal"
    >
      <span className="floating-icon-pulse" />
      <span className="floating-icon-text">&gt;_</span>
    </button>
  );
}
