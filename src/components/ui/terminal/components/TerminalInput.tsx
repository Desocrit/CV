import type { RefObject, FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';

interface TerminalInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  input: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent) => void;
  isReady: boolean;
}

export function TerminalInput({
  inputRef,
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
  isReady,
}: TerminalInputProps) {
  return (
    <form onSubmit={onSubmit} className="terminal-input-container" role="search">
      <label htmlFor="terminal-query-input" className="sr-only">
        Enter your query
      </label>
      <span className="terminal-input-prompt" aria-hidden="true">&gt;</span>
      <input
        ref={inputRef}
        id="terminal-query-input"
        type="text"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="terminal-input"
        placeholder={isReady ? 'ENTER_QUERY...' : ''}
        disabled={!isReady}
        autoComplete="off"
        spellCheck="false"
        aria-describedby="terminal-input-hint"
      />
      <span id="terminal-input-hint" className="sr-only">
        Use arrow keys for command history, Escape to close
      </span>
      <span className="terminal-cursor-input" aria-hidden="true">_</span>
    </form>
  );
}
