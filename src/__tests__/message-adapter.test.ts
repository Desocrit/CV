import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for message-adapter.ts
 *
 * Tests the UIMessageAdapter that converts UI messages (from @ai-sdk/react)
 * to internal model messages for the AI agent.
 */

// Mock the 'ai' module's convertToModelMessages function
const mockConvertToModelMessages = vi.fn();

vi.mock('ai', () => ({
  convertToModelMessages: (...args: unknown[]) => mockConvertToModelMessages(...args),
}));

import {
  createMessageAdapter,
  UIMessageAdapter,
  type MessageAdapter,
} from '../lib/agent/adapters/message-adapter';

describe('UIMessageAdapter', () => {
  let adapter: MessageAdapter;

  beforeEach(() => {
    adapter = createMessageAdapter();
    mockConvertToModelMessages.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMessageAdapter', () => {
    it('returns a UIMessageAdapter instance', () => {
      const adapter = createMessageAdapter();
      expect(adapter).toBeInstanceOf(UIMessageAdapter);
    });

    it('returns an object implementing MessageAdapter interface', () => {
      const adapter = createMessageAdapter();
      expect(typeof adapter.toModelMessages).toBe('function');
    });
  });

  describe('toModelMessages', () => {
    describe('input validation', () => {
      it('returns empty array for non-array input', async () => {
        const result = await adapter.toModelMessages('not an array' as unknown as unknown[]);
        expect(result).toEqual([]);
      });

      it('returns empty array for null input', async () => {
        const result = await adapter.toModelMessages(null as unknown as unknown[]);
        expect(result).toEqual([]);
      });

      it('returns empty array for undefined input', async () => {
        const result = await adapter.toModelMessages(undefined as unknown as unknown[]);
        expect(result).toEqual([]);
      });

      it('returns empty array for empty array input', async () => {
        mockConvertToModelMessages.mockResolvedValue([]);
        const result = await adapter.toModelMessages([]);
        expect(result).toEqual([]);
      });
    });

    describe('message filtering', () => {
      it('filters out messages without role', async () => {
        mockConvertToModelMessages.mockResolvedValue([]);

        const messages = [
          { parts: [{ type: 'text', text: 'hello' }] }, // missing role
        ];

        await adapter.toModelMessages(messages);

        // Should not call convert with invalid messages
        expect(mockConvertToModelMessages).not.toHaveBeenCalled();
      });

      it('filters out messages without parts array', async () => {
        mockConvertToModelMessages.mockResolvedValue([]);

        const messages = [
          { role: 'user', parts: 'not an array' }, // parts should be array
        ];

        await adapter.toModelMessages(messages);

        expect(mockConvertToModelMessages).not.toHaveBeenCalled();
      });

      it('filters out messages with invalid role', async () => {
        mockConvertToModelMessages.mockResolvedValue([]);

        const messages = [
          { role: 'invalid-role', parts: [{ type: 'text', text: 'hello' }] },
        ];

        await adapter.toModelMessages(messages);

        expect(mockConvertToModelMessages).not.toHaveBeenCalled();
      });

      it('accepts user role', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          { role: 'user', content: 'hello' },
        ]);

        const messages = [
          { role: 'user', parts: [{ type: 'text', text: 'hello' }] },
        ];

        const result = await adapter.toModelMessages(messages);

        expect(mockConvertToModelMessages).toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });

      it('accepts assistant role', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          { role: 'assistant', content: 'response' },
        ]);

        const messages = [
          { role: 'assistant', parts: [{ type: 'text', text: 'response' }] },
        ];

        const result = await adapter.toModelMessages(messages);

        expect(mockConvertToModelMessages).toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });

      it('accepts system role', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          { role: 'system', content: 'system prompt' },
        ]);

        const messages = [
          { role: 'system', parts: [{ type: 'text', text: 'system prompt' }] },
        ];

        const result = await adapter.toModelMessages(messages);

        expect(mockConvertToModelMessages).toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });

      it('filters mixed valid and invalid messages', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          { role: 'user', content: 'valid' },
        ]);

        const messages = [
          { role: 'user', parts: [{ type: 'text', text: 'valid' }] }, // valid
          { role: 'invalid', parts: [] }, // invalid role
          { parts: [] }, // missing role
          { role: 'user' }, // missing parts
          { role: 'assistant', parts: [{ type: 'text', text: 'also valid' }] }, // valid
        ];

        await adapter.toModelMessages(messages);

        // Should only pass valid messages to converter
        const callArgs = mockConvertToModelMessages.mock.calls[0];
        expect(callArgs?.[0]).toHaveLength(2);
      });
    });

    describe('content transformation', () => {
      it('handles string content directly', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          { role: 'user', content: 'hello world' },
        ]);

        const messages = [
          { role: 'user', parts: [{ type: 'text', text: 'hello world' }] },
        ];

        const result = await adapter.toModelMessages(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'user',
          content: 'hello world',
        });
      });

      it('extracts text from array content parts', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          {
            role: 'user',
            content: [
              { type: 'text', text: 'hello ' },
              { type: 'text', text: 'world' },
            ],
          },
        ]);

        const messages = [
          { role: 'user', parts: [{ type: 'text', text: 'hello world' }] },
        ];

        const result = await adapter.toModelMessages(messages);

        expect(result).toHaveLength(1);
        expect(result[0]?.content).toBe('hello world');
      });

      it('filters out non-text parts from content array', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'response' },
              { type: 'tool-call', toolCallId: '123', toolName: 'search' },
              { type: 'text', text: ' continued' },
            ],
          },
        ]);

        const messages = [
          { role: 'assistant', parts: [{ type: 'text', text: 'response' }] },
        ];

        const result = await adapter.toModelMessages(messages);

        expect(result).toHaveLength(1);
        expect(result[0]?.content).toBe('response continued');
      });

      it('skips messages with empty text content', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          { role: 'user', content: '' },
          { role: 'assistant', content: 'valid response' },
        ]);

        const messages = [
          { role: 'user', parts: [{ type: 'text', text: '' }] },
          { role: 'assistant', parts: [{ type: 'text', text: 'valid response' }] },
        ];

        const result = await adapter.toModelMessages(messages);

        expect(result).toHaveLength(1);
        expect(result[0]?.role).toBe('assistant');
      });

      it('skips messages with only non-text content', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          {
            role: 'assistant',
            content: [{ type: 'tool-call', toolCallId: '123', toolName: 'fn' }],
          },
        ]);

        const messages = [
          { role: 'assistant', parts: [{ type: 'tool-call' }] },
        ];

        const result = await adapter.toModelMessages(messages);

        // Should filter out the message since no text content
        expect(result).toHaveLength(0);
      });
    });

    describe('converter options', () => {
      it('passes ignoreIncompleteToolCalls option', async () => {
        mockConvertToModelMessages.mockResolvedValue([]);

        const messages = [
          { role: 'user', parts: [{ type: 'text', text: 'test' }] },
        ];

        await adapter.toModelMessages(messages);

        expect(mockConvertToModelMessages).toHaveBeenCalledWith(
          expect.any(Array),
          { ignoreIncompleteToolCalls: true }
        );
      });
    });

    describe('multi-turn conversations', () => {
      it('preserves message order', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          { role: 'user', content: 'question 1' },
          { role: 'assistant', content: 'answer 1' },
          { role: 'user', content: 'question 2' },
          { role: 'assistant', content: 'answer 2' },
        ]);

        const messages = [
          { role: 'user', parts: [{ type: 'text', text: 'question 1' }] },
          { role: 'assistant', parts: [{ type: 'text', text: 'answer 1' }] },
          { role: 'user', parts: [{ type: 'text', text: 'question 2' }] },
          { role: 'assistant', parts: [{ type: 'text', text: 'answer 2' }] },
        ];

        const result = await adapter.toModelMessages(messages);

        expect(result).toHaveLength(4);
        expect(result[0]?.content).toBe('question 1');
        expect(result[1]?.content).toBe('answer 1');
        expect(result[2]?.content).toBe('question 2');
        expect(result[3]?.content).toBe('answer 2');
      });

      it('handles system message at start', async () => {
        mockConvertToModelMessages.mockResolvedValue([
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hi' },
        ]);

        const messages = [
          { role: 'system', parts: [{ type: 'text', text: 'You are helpful' }] },
          { role: 'user', parts: [{ type: 'text', text: 'Hi' }] },
        ];

        const result = await adapter.toModelMessages(messages);

        expect(result).toHaveLength(2);
        expect(result[0]?.role).toBe('system');
        expect(result[1]?.role).toBe('user');
      });
    });
  });
});

describe('isValidUIMessage (internal validation)', () => {
  // Test the validation logic through the adapter's behavior

  it('requires role to be a string', async () => {
    const adapter = createMessageAdapter();

    const messages = [
      { role: 123, parts: [] }, // role is number
    ];

    const result = await adapter.toModelMessages(messages);
    expect(result).toEqual([]);
  });

  it('requires parts to be an array', async () => {
    const adapter = createMessageAdapter();

    const messages = [
      { role: 'user', parts: {} }, // parts is object
    ];

    const result = await adapter.toModelMessages(messages);
    expect(result).toEqual([]);
  });

  it('rejects null messages', async () => {
    const adapter = createMessageAdapter();

    const messages = [null];

    const result = await adapter.toModelMessages(messages);
    expect(result).toEqual([]);
  });

  it('rejects undefined messages', async () => {
    const adapter = createMessageAdapter();

    const messages = [undefined];

    const result = await adapter.toModelMessages(messages);
    expect(result).toEqual([]);
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    mockConvertToModelMessages.mockReset();
  });

  it('handles very long message content', async () => {
    const longContent = 'a'.repeat(100000);
    mockConvertToModelMessages.mockResolvedValue([
      { role: 'user', content: longContent },
    ]);

    const adapter = createMessageAdapter();
    const messages = [
      { role: 'user', parts: [{ type: 'text', text: longContent }] },
    ];

    const result = await adapter.toModelMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe(longContent);
  });

  it('handles unicode content', async () => {
    const unicodeContent = 'Hello emoji test';
    mockConvertToModelMessages.mockResolvedValue([
      { role: 'user', content: unicodeContent },
    ]);

    const adapter = createMessageAdapter();
    const messages = [
      { role: 'user', parts: [{ type: 'text', text: unicodeContent }] },
    ];

    const result = await adapter.toModelMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe(unicodeContent);
  });

  it('handles newlines in content', async () => {
    const contentWithNewlines = 'line1\nline2\nline3';
    mockConvertToModelMessages.mockResolvedValue([
      { role: 'user', content: contentWithNewlines },
    ]);

    const adapter = createMessageAdapter();
    const messages = [
      { role: 'user', parts: [{ type: 'text', text: contentWithNewlines }] },
    ];

    const result = await adapter.toModelMessages(messages);

    expect(result[0]?.content).toBe(contentWithNewlines);
  });

  it('handles content with HTML-like strings', async () => {
    const htmlContent = '<script>alert("xss")</script>';
    mockConvertToModelMessages.mockResolvedValue([
      { role: 'user', content: htmlContent },
    ]);

    const adapter = createMessageAdapter();
    const messages = [
      { role: 'user', parts: [{ type: 'text', text: htmlContent }] },
    ];

    const result = await adapter.toModelMessages(messages);

    // Should pass through unchanged (sanitization happens elsewhere)
    expect(result[0]?.content).toBe(htmlContent);
  });

  it('handles many messages', async () => {
    const manyMessages = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `message ${i}`,
    }));

    mockConvertToModelMessages.mockResolvedValue(manyMessages);

    const adapter = createMessageAdapter();
    const messages = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      parts: [{ type: 'text', text: `message ${i}` }],
    }));

    const result = await adapter.toModelMessages(messages);

    expect(result).toHaveLength(100);
  });

  it('handles unsupported content types gracefully', async () => {
    mockConvertToModelMessages.mockResolvedValue([
      {
        role: 'assistant',
        content: { unsupported: true }, // Neither string nor array
      },
    ]);

    const adapter = createMessageAdapter();
    const messages = [
      { role: 'assistant', parts: [{ type: 'text', text: 'test' }] },
    ];

    const result = await adapter.toModelMessages(messages);

    // Should skip messages with unsupported content types
    expect(result).toHaveLength(0);
  });
});
