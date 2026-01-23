import type { RefObject } from 'react';
import DOMPurify from 'dompurify';
import type { UIMessage } from '../types';
import { marked } from '../utils';

interface TerminalMessagesProps {
  bootMessages: string[];
  messages: UIMessage[];
  isLoading: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

/**
 * Get message text from parts
 */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('');
}

export function TerminalMessages({
  bootMessages,
  messages,
  isLoading,
  messagesEndRef,
}: TerminalMessagesProps) {
  return (
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
  );
}
