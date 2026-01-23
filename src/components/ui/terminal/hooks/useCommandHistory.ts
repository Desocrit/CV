import { useState, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';

export interface UseCommandHistoryReturn {
  input: string;
  setInput: (value: string) => void;
  commandHistory: string[];
  addToHistory: (command: string) => void;
  resetHistoryIndex: () => void;
  handleKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Custom hook to manage command history with arrow key navigation
 */
export function useCommandHistory(): UseCommandHistoryReturn {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addToHistory = useCallback((command: string) => {
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);
  }, []);

  const resetHistoryIndex = useCallback(() => {
    setHistoryIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
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

  return {
    input,
    setInput,
    commandHistory,
    addToHistory,
    resetHistoryIndex,
    handleKeyDown,
  };
}
