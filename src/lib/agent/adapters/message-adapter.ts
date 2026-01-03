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

    // Filter out messages with empty content (e.g., step-start only messages)
    // Anthropic API requires all messages to have non-empty content
    const nonEmptyMessages = modelMessages.filter((msg) => {
      const content = msg.content;
      if (typeof content === 'string') {
        return content.length > 0;
      }
      if (Array.isArray(content)) {
        return content.length > 0;
      }
      return false;
    });

    return nonEmptyMessages as unknown as InternalModelMessage[];
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
