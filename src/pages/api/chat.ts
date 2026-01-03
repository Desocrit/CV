import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { createGatewayProvider } from '@ai-sdk/gateway';

import {
  chatRequestSchema,
  createMessageAdapter,
  createCVAgent,
} from '../../lib/agent';

export const prerender = false;

// ============================================================================
// Error Responses
// ============================================================================

function errorResponse(message: string, status: number, details?: unknown): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details !== undefined && { details }),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function configurationError(): Response {
  return errorResponse('Missing required configuration', 500);
}

function validationError(issues: unknown): Response {
  return errorResponse('Invalid request format', 400, issues);
}

function internalError(error: unknown): Response {
  console.error('[chat] Internal error:', error);
  return errorResponse(
    'Internal server error',
    500,
    error instanceof Error ? error.message : 'Unknown error'
  );
}

// ============================================================================
// API Route Handler
// ============================================================================

export const POST: APIRoute = async ({ request }) => {
  // 1. Validate environment configuration
  const databaseUrl = import.meta.env.DATABASE_URL;
  const apiKey = import.meta.env.AI_GATEWAY_API_KEY;

  if (!databaseUrl || !apiKey) {
    return configurationError();
  }

  try {
    // 2. Parse and validate request body
    const body = await request.json();
    const parseResult = chatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error.issues);
    }

    // 3. Adapt messages from UIMessage to ModelMessage format
    const adapter = createMessageAdapter();
    const modelMessages = await adapter.toModelMessages(parseResult.data.messages);

    if (modelMessages.length === 0) {
      return validationError('No valid messages in request');
    }

    // 4. Create agent with dependencies
    const provider = createGatewayProvider({ apiKey });
    const sql = neon(databaseUrl);
    const agent = createCVAgent({ provider, sql });

    // 5. Stream response
    const result = agent.stream({ messages: modelMessages });

    return result.toTextStreamResponse();
  } catch (error) {
    return internalError(error);
  }
};
