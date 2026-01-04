import { z } from 'zod';

// ============================================================================
// Message Schemas
// ============================================================================

/**
 * Permissive schema for UIMessage parts.
 * We accept any object with a type field - the AI SDK's convertToModelMessages
 * handles filtering and conversion of all part types (text, tool-call,
 * tool-result, step-start, reasoning, etc.)
 */
const messagePartSchema = z.object({ type: z.string() }).passthrough();

const uiMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(messagePartSchema),
});

export const chatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).min(1),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type UIMessagePart = z.infer<typeof messagePartSchema>;
export interface TextPart {
  type: 'text';
  text: string;
}

// ============================================================================
// Model Message Types (for AI SDK)
// ============================================================================

export interface ModelMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ============================================================================
// Embedding & Vector Store Types
// ============================================================================

export const cvNodeMetadataSchema = z.object({
  node_id: z.string().optional(),
  category: z.string().optional(),
  header: z.string().optional(),
});

export type CVNodeMetadata = z.infer<typeof cvNodeMetadataSchema>;

export const embeddingResultSchema = z.object({
  content: z.string(),
  metadata: cvNodeMetadataSchema,
  similarity: z.number(),
});

export type EmbeddingResult = z.infer<typeof embeddingResultSchema>;

// ============================================================================
// CV Search Tool Types
// ============================================================================

export interface CVSearchDocument {
  nodeId: string;
  content: string;
  category: string;
  similarity: number;
}

export interface CVSearchResult {
  query: string;
  found: boolean;
  documents: CVSearchDocument[];
}

// ============================================================================
// Service Interfaces (for dependency injection)
// ============================================================================

export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
}

export interface VectorStoreService {
  search(
    embedding: number[],
    options?: { limit?: number; threshold?: number }
  ): Promise<EmbeddingResult[]>;
}

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  readonly modelId: string;
  readonly embeddingModelId: string;
  readonly maxToolSteps: number;
  readonly defaultSearchLimit: number;
  readonly similarityThreshold: number;
  /** Request timeout in milliseconds */
  readonly requestTimeoutMs: number;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  modelId: 'anthropic/claude-opus-4-5',
  embeddingModelId: 'openai/text-embedding-3-small',
  maxToolSteps: 5,
  defaultSearchLimit: 5,
  similarityThreshold: 0.3,
  requestTimeoutMs: 60000, // 60 second default timeout
} as const;
