import { streamText, stepCountIs } from 'ai';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import type { ModelMessage, AgentConfig } from '../types';
import { DEFAULT_AGENT_CONFIG } from '../types';
import {
  createEmbeddingService,
  type EmbeddingProvider,
} from '../services/embedding.service';
import { createVectorStore } from '../services/vector-store.service';
import { createCVSearchTool } from '../tools/cv-search.tool';
import { CV_SYSTEM_PROMPT } from './system-prompt';

// ============================================================================
// Types
// ============================================================================

interface LanguageModelProvider {
  (modelId: string): Parameters<typeof streamText>[0]['model'];
  embeddingModel: EmbeddingProvider['embeddingModel'];
}

export interface CVAgentDependencies {
  /** AI Gateway provider for LLM and embedding models */
  provider: LanguageModelProvider;
  /** Neon SQL query function */
  sql: NeonQueryFunction<false, false>;
  /** Optional configuration overrides */
  config?: Partial<AgentConfig>;
}

export interface StreamOptions {
  /** Conversation messages in ModelMessage format */
  messages: ModelMessage[];
}

export interface CVAgent {
  /** Streams a response for the given conversation */
  stream(options: StreamOptions): {
    toTextStreamResponse(): Response;
  };
}

// ============================================================================
// Agent Factory
// ============================================================================

/**
 * Creates a configured CV agent instance.
 *
 * The agent uses composition to wire up all dependencies:
 * - EmbeddingService for generating query embeddings
 * - VectorStoreService for semantic search
 * - CVSearchTool for RAG retrieval
 *
 * The LLM decides when to use the search tool based on conversation context.
 *
 * @example
 * ```typescript
 * const agent = createCVAgent({
 *   provider: createGatewayProvider({ apiKey }),
 *   sql: neon(databaseUrl),
 * });
 *
 * const result = agent.stream({ messages });
 * return result.toTextStreamResponse();
 * ```
 */
export function createCVAgent(deps: CVAgentDependencies): CVAgent {
  const { provider, sql, config: configOverrides } = deps;

  // Merge with defaults
  const config: AgentConfig = {
    ...DEFAULT_AGENT_CONFIG,
    ...configOverrides,
  };

  // Initialize services
  const embeddingService = createEmbeddingService(
    provider,
    config.embeddingModelId
  );
  const vectorStore = createVectorStore(sql);

  // Create RAG tool
  const searchCVTool = createCVSearchTool({
    embeddingService,
    vectorStore,
  });

  return {
    stream(options: StreamOptions) {
      const { messages } = options;

      // Create abort controller for timeout handling
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, config.requestTimeoutMs);

      const result = streamText({
        model: provider(config.modelId),
        system: CV_SYSTEM_PROMPT,
        messages,
        tools: {
          searchCV: searchCVTool,
        },
        toolChoice: 'auto',
        stopWhen: stepCountIs(config.maxToolSteps),
        abortSignal: abortController.signal,
        onFinish: () => clearTimeout(timeoutId),
      });

      return result;
    },
  };
}

export type { LanguageModelProvider };
