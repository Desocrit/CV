import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import type {
  EmbeddingService,
  VectorStoreService,
  CVSearchResult,
} from '../types';
import { DEFAULT_AGENT_CONFIG } from '../types';

/**
 * Tool input schema.
 * Defines what the LLM can provide when calling the search tool.
 */
const cvSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe('The search query to find relevant CV information'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe('Maximum number of results to return (default: 5)'),
});

type CVSearchInput = z.infer<typeof cvSearchInputSchema>;

/**
 * Tool description that guides the LLM on when and how to use this tool.
 */
const TOOL_DESCRIPTION = `Search Chris Saunders' CV database for relevant professional information.

USE THIS TOOL WHEN the user asks about:
- Work experience, employment history, or career progression
- Technical skills, programming languages, tools, or technologies
- Projects, systems built, or technical achievements
- Education, degrees, qualifications, or certifications
- Quantifiable metrics, impact numbers, or business outcomes
- Specific companies, roles, or job responsibilities

DO NOT USE THIS TOOL for:
- General greetings or small talk
- Questions unrelated to professional background
- Follow-up clarifications that don't need new data

The tool returns relevant CV sections with similarity scores. Higher similarity indicates better relevance.`;

interface CVSearchToolDependencies {
  embeddingService: EmbeddingService;
  vectorStore: VectorStoreService;
}

/**
 * Creates the CV search tool with injected dependencies.
 *
 * This is the core RAG mechanism - the LLM decides when to invoke this tool
 * based on the conversation context. Each invocation:
 * 1. Embeds the query text
 * 2. Performs vector similarity search
 * 3. Returns relevant CV sections
 *
 * @param deps - Services required for embedding and retrieval
 */
export function createCVSearchTool(deps: CVSearchToolDependencies) {
  const { embeddingService, vectorStore } = deps;

  return tool<CVSearchInput, CVSearchResult>({
    description: TOOL_DESCRIPTION,
    inputSchema: zodSchema(cvSearchInputSchema),

    execute: async (input): Promise<CVSearchResult> => {
      const { query, maxResults = DEFAULT_AGENT_CONFIG.defaultSearchLimit } = input;

      // Generate embedding for the search query
      const embedding = await embeddingService.embed(query);

      // Retrieve similar documents from vector store
      const results = await vectorStore.search(embedding, {
        limit: maxResults,
        threshold: DEFAULT_AGENT_CONFIG.similarityThreshold,
      });

      // No relevant documents found
      if (results.length === 0) {
        return {
          query,
          found: false,
          documents: [],
        };
      }

      // Transform results into tool output format
      return {
        query,
        found: true,
        documents: results.map((r) => ({
          nodeId: r.metadata.node_id ?? 'UNKNOWN',
          content: r.content,
          category: r.metadata.category ?? 'general',
          similarity: Math.round(r.similarity * 1000) / 1000,
        })),
      };
    },
  });
}

export type CVSearchTool = ReturnType<typeof createCVSearchTool>;
