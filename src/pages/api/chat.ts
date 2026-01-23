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
// Constants
// ============================================================================

const MAX_REQUEST_SIZE_BYTES = 50 * 1024; // 50KB limit

// ============================================================================
// Security Headers
// ============================================================================

const securityHeaders: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

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
      headers: {
        'Content-Type': 'application/json',
        ...securityHeaders,
      },
    }
  );
}

function configurationError(): Response {
  return errorResponse('Missing required configuration', 500);
}

function validationError(issues: unknown): Response {
  return errorResponse('Invalid request format', 400, issues);
}

function payloadTooLargeError(): Response {
  return errorResponse(
    'Request payload too large',
    413,
    `Maximum request size is ${MAX_REQUEST_SIZE_BYTES / 1024}KB`
  );
}

function unsupportedMediaTypeError(): Response {
  return errorResponse(
    'Unsupported Media Type',
    415,
    'Content-Type must be application/json'
  );
}

function internalError(error: unknown): Response {
  // Log full error details server-side for debugging
  console.error('[chat] Internal error:', error);
  // Return generic message to client - never expose internal error details
  return errorResponse('Internal server error', 500);
}

// ============================================================================
// API Route Handler
// ============================================================================

export const POST: APIRoute = async ({ request }) => {
  // 1. Validate Content-Type header
  const contentType = request.headers.get('Content-Type');
  if (!contentType || !contentType.includes('application/json')) {
    return unsupportedMediaTypeError();
  }

  // 2. Validate request body size
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE_BYTES) {
    return payloadTooLargeError();
  }

  // 3. Validate environment configuration
  const databaseUrl = import.meta.env.DATABASE_URL;
  const apiKey = import.meta.env.AI_GATEWAY_API_KEY;

  if (!databaseUrl || !apiKey) {
    return configurationError();
  }

  try {
    // 4. Read and validate actual body size (Content-Length can be spoofed or missing)
    const bodyText = await request.text();
    if (bodyText.length > MAX_REQUEST_SIZE_BYTES) {
      return payloadTooLargeError();
    }

    // 5. Parse and validate request body
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return validationError('Invalid JSON');
    }
    const parseResult = chatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error.issues);
    }

    // 6. Adapt messages from UIMessage to ModelMessage format
    const adapter = createMessageAdapter();
    const modelMessages = await adapter.toModelMessages(parseResult.data.messages);

    if (modelMessages.length === 0) {
      return validationError('No valid messages in request');
    }

    // 7. Create agent with dependencies
    const provider = createGatewayProvider({ apiKey });
    const sql = neon(databaseUrl);
    const agent = createCVAgent({ provider, sql });

    // 8. Stream response
    const result = agent.stream({ messages: modelMessages });

    return result.toTextStreamResponse({
      headers: securityHeaders,
    });
  } catch (error) {
    return internalError(error);
  }
};
