import { embed } from 'ai';
import type { EmbeddingService } from '../types';
import { DEFAULT_AGENT_CONFIG } from '../types';

interface EmbeddingProvider {
  embeddingModel(modelId: string): Parameters<typeof embed>[0]['model'];
}

/**
 * Service responsible for generating text embeddings via OpenAI.
 * Uses the AI SDK's embed function with a configurable model.
 */
class OpenAIEmbeddingService implements EmbeddingService {
  private readonly provider: EmbeddingProvider;
  private readonly modelId: string;

  constructor(provider: EmbeddingProvider, modelId?: string) {
    this.provider = provider;
    this.modelId = modelId ?? DEFAULT_AGENT_CONFIG.embeddingModelId;
  }

  /**
   * Generates an embedding vector for the given text.
   * @param text - The text to embed
   * @returns A promise resolving to the embedding vector (1536 dimensions for text-embedding-3-small)
   */
  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.provider.embeddingModel(this.modelId),
      value: text,
    });

    return embedding;
  }
}

/**
 * Factory function for creating an embedding service.
 * @param provider - The AI gateway provider with embeddingModel method
 * @param modelId - Optional model ID override
 */
export function createEmbeddingService(
  provider: EmbeddingProvider,
  modelId?: string
): EmbeddingService {
  return new OpenAIEmbeddingService(provider, modelId);
}

export { OpenAIEmbeddingService };
export type { EmbeddingProvider };
