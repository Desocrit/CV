/**
 * Folder Ingestion Script for RAG Database
 *
 * This script recursively reads a folder containing .txt, .md, and .docx files
 * and populates the Neon database with embeddings for RAG retrieval.
 *
 * Prerequisites:
 * 1. Ensure cv_embeddings table exists (see seed-embeddings.mjs for SQL)
 * 2. Set environment variables in .env:
 *    - DATABASE_URL: Your Neon connection string
 *    - AI_GATEWAY_API_KEY: Your Vercel AI Gateway key
 * 3. For .docx support: npm install mammoth
 *
 * Usage:
 * ```
 * node scripts/ingest-folder.mjs <folder-path> [--clear]
 * ```
 *
 * Options:
 *   --clear    Clear existing ingested documents before inserting (only clears 'document' category)
 *
 * Example:
 * ```
 * node scripts/ingest-folder.mjs "C:\Users\cjasa\Downloads\self-review-notes"
 * ```
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename, relative } from 'path';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { config } from 'dotenv';

// Load .env file
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  console.error('Ensure your .env file contains DATABASE_URL');
  process.exit(1);
}

if (!process.env.AI_GATEWAY_API_KEY) {
  console.error('ERROR: AI_GATEWAY_API_KEY environment variable is required');
  console.error('Ensure your .env file contains AI_GATEWAY_API_KEY');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Configuration
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.docx'];
const MAX_CHUNK_SIZE = 1500; // Characters per chunk (conservative for good retrieval)
const CHUNK_OVERLAP = 200; // Overlap between chunks for context continuity

/**
 * Generate embedding using AI SDK via Vercel AI Gateway
 */
async function generateEmbedding(text) {
  const { embedding } = await embed({
    model: 'text-embedding-3-small',
    value: text,
  });
  return embedding;
}

/**
 * Recursively find all supported files in a directory
 */
function findFiles(dir, files = []) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findFiles(fullPath, files);
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Extract text from a .docx file using mammoth
 */
async function extractDocxText(filePath) {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.default.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('[INGEST] mammoth package not found. Install it with: npm install mammoth');
      throw new Error('mammoth package required for .docx files');
    }
    throw error;
  }
}

/**
 * Read file content based on extension
 */
async function readFileContent(filePath) {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.docx') {
    return await extractDocxText(filePath);
  }

  // .txt and .md files
  return readFileSync(filePath, 'utf-8');
}

/**
 * Split text into overlapping chunks for better semantic retrieval
 */
function chunkText(text, maxSize = MAX_CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];

  // Clean up text - normalize whitespace
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (cleanText.length <= maxSize) {
    return [cleanText];
  }

  // Try to split on paragraph boundaries first
  const paragraphs = cleanText.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const potentialChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

    if (potentialChunk.length <= maxSize) {
      currentChunk = potentialChunk;
    } else {
      // Current chunk is full, save it
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // If single paragraph is too long, split it further
      if (paragraph.length > maxSize) {
        const subChunks = splitLongText(paragraph, maxSize, overlap);
        chunks.push(...subChunks.slice(0, -1));
        currentChunk = subChunks[subChunks.length - 1] || '';
      } else {
        currentChunk = paragraph;
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Split a long text block that doesn't have natural paragraph breaks
 */
function splitLongText(text, maxSize, overlap) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxSize;

    // Try to break at sentence boundary
    if (end < text.length) {
      const searchStart = Math.max(start + maxSize - 200, start);
      const searchEnd = Math.min(start + maxSize + 100, text.length);
      const searchArea = text.slice(searchStart, searchEnd);

      // Look for sentence endings
      const sentenceEnd = searchArea.search(/[.!?]\s/);
      if (sentenceEnd !== -1) {
        end = searchStart + sentenceEnd + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;

    // Prevent infinite loop
    if (start >= text.length - overlap) break;
  }

  return chunks;
}

/**
 * Main ingestion function
 */
async function ingestFolder(folderPath, clearExisting = false) {
  console.log(`[INGEST] Starting ingestion from: ${folderPath}`);

  if (!existsSync(folderPath)) {
    console.error(`[INGEST] ERROR: Folder does not exist: ${folderPath}`);
    process.exit(1);
  }

  // Find all supported files
  console.log('[INGEST] Scanning for files...');
  const files = findFiles(folderPath);
  console.log(`[INGEST] Found ${files.length} files to process`);

  if (files.length === 0) {
    console.log('[INGEST] No supported files found. Exiting.');
    return;
  }

  // Optionally clear existing document embeddings
  if (clearExisting) {
    console.log('[INGEST] Clearing existing document embeddings...');
    await sql`DELETE FROM cv_embeddings WHERE metadata->>'category' = 'document'`;
  }

  // Process each file
  let totalChunks = 0;
  let processedFiles = 0;

  for (const filePath of files) {
    const relativePath = relative(folderPath, filePath);
    const fileName = basename(filePath);
    console.log(`\n[INGEST] Processing (${processedFiles + 1}/${files.length}): ${relativePath}`);

    try {
      // Read file content
      const content = await readFileContent(filePath);

      if (!content || content.trim().length === 0) {
        console.log(`[INGEST]   Skipping empty file`);
        continue;
      }

      // Split into chunks
      const chunks = chunkText(content);
      console.log(`[INGEST]   Split into ${chunks.length} chunk(s)`);

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const nodeId = `doc_${processedFiles.toString().padStart(3, '0')}_${i.toString().padStart(2, '0')}`;

        try {
          // Generate embedding
          const embedding = await generateEmbedding(chunk);

          // Insert into database
          const metadata = {
            node_id: nodeId,
            category: 'document',
            source_file: relativePath,
            file_name: fileName,
            chunk_index: i,
            total_chunks: chunks.length,
          };

          await sql`
            INSERT INTO cv_embeddings (content, metadata, embedding)
            VALUES (
              ${chunk},
              ${JSON.stringify(metadata)},
              ${JSON.stringify(embedding)}::vector
            )
          `;

          totalChunks++;
          process.stdout.write(`\r[INGEST]   Embedded chunk ${i + 1}/${chunks.length}`);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`\n[INGEST]   Error embedding chunk ${i}: ${error.message}`);
        }
      }

      console.log(''); // New line after progress
      processedFiles++;
    } catch (error) {
      console.error(`[INGEST]   Error processing file: ${error.message}`);
    }
  }

  console.log('\n[INGEST] ========================================');
  console.log(`[INGEST] Ingestion complete!`);
  console.log(`[INGEST] Files processed: ${processedFiles}/${files.length}`);
  console.log(`[INGEST] Total chunks embedded: ${totalChunks}`);
  console.log('[INGEST] ========================================');
}

// Parse command line arguments
const args = process.argv.slice(2);
const clearFlag = args.includes('--clear');
const folderPath = args.find(arg => !arg.startsWith('--'));

if (!folderPath) {
  console.error('Usage: node scripts/ingest-folder.mjs <folder-path> [--clear]');
  console.error('');
  console.error('Options:');
  console.error('  --clear    Clear existing document embeddings before inserting');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/ingest-folder.mjs "C:\\Users\\cjasa\\Downloads\\self-review-notes"');
  process.exit(1);
}

// Run the ingestion
ingestFolder(folderPath, clearFlag).catch(error => {
  console.error('[INGEST] Fatal error:', error);
  process.exit(1);
});
