import { convertToModelMessages, type UIMessage } from 'ai';
import type { ModelMessage as InternalModelMessage } from '../types';

/**
 * Adapter interface for converting UI messages to model messages.
 * The conversion is async because it may need to process tool calls.
 */
export interface MessageAdapter {
  toModelMessages(uiMessages: unknown[]): Promise<InternalModelMessage[]>;
}

/**
 * Validates that a message has the basic UIMessage structure.
 */
function isValidUIMessage(msg: unknown): msg is Omit<UIMessage, 'id'> {
  if (typeof msg !== 'object' || msg === null) {
    return false;
  }

  const candidate = msg as Record<string, unknown>;
  const role = candidate['role'];
  const parts = candidate['parts'];

  return (
    typeof role === 'string' &&
    ['user', 'assistant', 'system'].includes(role) &&
    Array.isArray(parts)
  );
}

/**
 * Adapter that converts UIMessage format (from @ai-sdk/react) to ModelMessage format.
 *
 * Uses the AI SDK's built-in convertToModelMessages function which properly handles:
 * - Text parts
 * - Tool call parts
 * - Tool result parts
 * - Multi-turn conversations with tool use
 */
class UIMessageAdapter implements MessageAdapter {
  /**
   * Converts an array of UIMessages to ModelMessages.
   * Uses the AI SDK's convertToModelMessages for proper handling of all part types.
   */
  async toModelMessages(uiMessages: unknown[]): Promise<InternalModelMessage[]> {
    if (!Array.isArray(uiMessages)) {
      return [];
    }

    // Filter to valid messages
    const validMessages = uiMessages.filter(isValidUIMessage);

    if (validMessages.length === 0) {
      return [];
    }

    // Use AI SDK's converter which handles tool calls, etc.
    const modelMessages = await convertToModelMessages(validMessages, {
      ignoreIncompleteToolCalls: true,
    });

    // Map messages to InternalModelMessage format
    // The AI SDK returns messages with content that can be string or array of parts
    // Our internal format uses simple string content
    const mappedMessages: InternalModelMessage[] = [];

    for (const msg of modelMessages) {
      const content = msg.content;
      let textContent: string;

      if (typeof content === 'string') {
        textContent = content;
      } else if (Array.isArray(content)) {
        // Extract text from content parts
        textContent = content
          .filter((part): part is { type: 'text'; text: string } =>
            typeof part === 'object' && part !== null && 'type' in part && part.type === 'text' && 'text' in part
          )
          .map(part => part.text)
          .join('');
      } else {
        continue; // Skip messages with unsupported content types
      }

      // Skip empty messages (Anthropic API requires non-empty content)
      if (textContent.length === 0) {
        continue;
      }

      mappedMessages.push({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: textContent,
      });
    }

    return mappedMessages;
  }
}

/**
 * Factory function for creating a message adapter.
 * Enables dependency injection and testability.
 */
export function createMessageAdapter(): MessageAdapter {
  return new UIMessageAdapter();
}

export { UIMessageAdapter };
