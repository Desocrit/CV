// ============================================================================
// Types
// ============================================================================

export type {
  ChatRequest,
  ModelMessage,
  EmbeddingResult,
  CVSearchDocument,
  CVSearchResult,
  EmbeddingService,
  VectorStoreService,
  AgentConfig,
} from './types';

export { chatRequestSchema, embeddingResultSchema, DEFAULT_AGENT_CONFIG } from './types';

// ============================================================================
// Adapters
// ============================================================================

export {
  createMessageAdapter,
  UIMessageAdapter,
  type MessageAdapter,
} from './adapters/message-adapter';

// ============================================================================
// Services
// ============================================================================

export {
  createEmbeddingService,
  OpenAIEmbeddingService,
  type EmbeddingProvider,
} from './services/embedding.service';

export {
  createVectorStore,
  NeonVectorStore,
} from './services/vector-store.service';

// ============================================================================
// Tools
// ============================================================================

export { createCVSearchTool, type CVSearchTool } from './tools/cv-search.tool';

// ============================================================================
// Agent
// ============================================================================

export {
  createCVAgent,
  type CVAgent,
  type CVAgentDependencies,
  type StreamOptions,
  type LanguageModelProvider,
} from './agent/cv-agent';

export { CV_SYSTEM_PROMPT } from './agent/system-prompt';
