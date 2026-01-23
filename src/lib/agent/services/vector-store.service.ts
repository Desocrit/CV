import type { NeonQueryFunction } from '@neondatabase/serverless';
import {
  embeddingResultSchema,
  type EmbeddingResult,
  type VectorStoreService,
  DEFAULT_AGENT_CONFIG,
} from '../types';

interface SearchOptions {
  limit?: number;
  threshold?: number;
}

/**
 * Service responsible for vector similarity search against Neon PostgreSQL.
 * Uses pgvector extension for cosine similarity calculations.
 */
class NeonVectorStore implements VectorStoreService {
  private readonly sql: NeonQueryFunction<false, false>;

  constructor(sql: NeonQueryFunction<false, false>) {
    this.sql = sql;
  }

  /**
   * Searches for similar documents in the cv_embeddings table.
   *
   * @param embedding - The query embedding vector
   * @param options - Search configuration
   * @returns Array of matching documents sorted by similarity (descending)
   */
  async search(
    embedding: number[],
    options: SearchOptions = {}
  ): Promise<EmbeddingResult[]> {
    const {
      limit = DEFAULT_AGENT_CONFIG.defaultSearchLimit,
      threshold = DEFAULT_AGENT_CONFIG.similarityThreshold,
    } = options;

    const embeddingJson = JSON.stringify(embedding);

    // Query using cosine distance operator (<=>)
    // Similarity = 1 - distance (higher is more similar)
    const results = await this.sql`
      SELECT
        content,
        metadata,
        1 - (embedding <=> ${embeddingJson}::vector) as similarity
      FROM cv_embeddings
      ORDER BY embedding <=> ${embeddingJson}::vector
      LIMIT ${limit}
    `;

    // Validate results and filter by threshold
    return results
      .map((row) => this.parseResult(row))
      .filter((r): r is EmbeddingResult => r !== null && r.similarity >= threshold);
  }

  /**
   * Safely parses and validates a database row.
   */
  private parseResult(row: unknown): EmbeddingResult | null {
    const parsed = embeddingResultSchema.safeParse(row);
    if (!parsed.success) {
      console.error(
        '[VectorStore] Failed to parse embedding result:',
        parsed.error.format(),
        'Row data:',
        JSON.stringify(row, null, 2)
      );
      return null;
    }
    return parsed.data;
  }
}

/**
 * Factory function for creating a vector store service.
 * @param sql - Neon SQL query function
 */
export function createVectorStore(
  sql: NeonQueryFunction<false, false>
): VectorStoreService {
  return new NeonVectorStore(sql);
}

export { NeonVectorStore };
