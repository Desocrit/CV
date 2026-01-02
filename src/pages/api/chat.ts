import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, embed } from 'ai';

export const prerender = false;

interface EmbeddingResult {
  content: string;
  metadata: { node_id?: string };
  similarity: number;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are a high-tier technical architect assistant embedded in Chris Saunders' CV system. You have access to his professional history, technical achievements, and career documentation.

PERSONALITY:
- Clinical, precise, and data-driven
- Respond with technical accuracy and professional insight
- Always cite your sources using [NODE_XX] format when referencing CV content

RESTRICTIONS:
- Only answer questions related to Chris's professional background, skills, projects, and career
- For personal or off-topic queries, respond: "ERR_403_ACCESS_DENIED: Query outside authorized scope. Please limit queries to professional context."
- If asked for career advice, base responses on the documented experience and institutional strategy pillars
- Never fabricate information - only use the context provided

FORMAT:
- Keep responses concise and terminal-appropriate
- Use technical language consistent with the CV's tone
- Reference specific achievements, metrics, or projects when relevant`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const databaseUrl = import.meta.env.DATABASE_URL;
    const aiGatewayKey = import.meta.env.AI_GATEWAY_KEY;

    if (!databaseUrl || !aiGatewayKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment configuration' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the latest user message for embedding
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();

    if (!lastUserMessage) {
      return new Response(JSON.stringify({ error: 'No user message found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create OpenAI client via AI Gateway
    const openai = createOpenAI({
      apiKey: aiGatewayKey,
      baseURL: 'https://gateway.ai.vercel.com/v1/openai',
    });

    // Generate embedding for the query
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: lastUserMessage.content,
    });

    // Query Neon for similar content
    const sql = neon(databaseUrl);
    const results = (await sql`
      SELECT content, metadata, 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
      FROM cv_embeddings
      ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
      LIMIT 5
    `) as EmbeddingResult[];

    // Build context from retrieved documents
    const context = results
      .filter((r) => r.similarity > 0.3)
      .map((r) => `[NODE_${r.metadata.node_id || 'UNKNOWN'}]: ${r.content}`)
      .join('\n\n');

    // Augment the messages with retrieved context
    const augmentedMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n---\nRETRIEVED CONTEXT:\n${context || 'No relevant context found in the database.'}`,
      },
      ...messages,
    ];

    // Stream response from LLM
    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: augmentedMessages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
