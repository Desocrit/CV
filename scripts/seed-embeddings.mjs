/**
 * Embedding Seeder Script
 *
 * This script parses the CV YAML content and populates the Neon database
 * with embeddings for RAG retrieval.
 *
 * Prerequisites:
 * 1. Create the cv_embeddings table in Neon (see SQL below)
 * 2. Set environment variables:
 *    - DATABASE_URL: Your Neon connection string
 *    - OPENAI_API_KEY: Your OpenAI API key
 *
 * SQL to create table:
 * ```sql
 * CREATE EXTENSION IF NOT EXISTS vector;
 *
 * CREATE TABLE cv_embeddings (
 *   id SERIAL PRIMARY KEY,
 *   content TEXT NOT NULL,
 *   metadata JSONB NOT NULL DEFAULT '{}',
 *   embedding vector(1536)
 * );
 *
 * CREATE INDEX ON cv_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
 * ```
 *
 * Usage:
 * ```bash
 * DATABASE_URL=your_url OPENAI_API_KEY=your_key node scripts/seed-embeddings.mjs
 * ```
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { parse } from 'yaml';

const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

/**
 * Generate embedding using OpenAI's text-embedding-3-small model
 */
async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Parse YAML content into semantic chunks
 */
function parseContentIntoChunks(yamlContent) {
  const data = parse(yamlContent);
  const chunks = [];

  // General info chunk
  chunks.push({
    node_id: '01_00',
    category: 'general',
    content: `Name: ${data.name}. Role: ${data.role}. Location: ${data.location}. Summary: ${data.summary}`,
  });

  // Outlier achievements
  if (data.outlier_achievements) {
    data.outlier_achievements.forEach((achievement, i) => {
      chunks.push({
        node_id: `02_${String(i).padStart(2, '0')}`,
        category: 'achievement',
        content: `Achievement - ${achievement.metric}: ${achievement.headline}. ${achievement.description}`,
      });
    });
  }

  // Projects
  if (data.projects) {
    data.projects.forEach((project, i) => {
      chunks.push({
        node_id: `03_${String(i).padStart(2, '0')}`,
        category: 'project',
        content: `Project: ${project.project_title} (${project.subtitle}). Role: ${project.role}. Stack: ${project.stack_and_tools.join(', ')}. Premise: ${project.the_premise} Technical details: ${project.technical_meat} Impact: ${project.impact_and_acclaim.join('. ')} Status: ${project.status}`,
      });
    });
  }

  // Work history
  if (data.work_history) {
    data.work_history.forEach((job, i) => {
      chunks.push({
        node_id: `04_${String(i).padStart(2, '0')}`,
        category: 'work_history',
        content: `Work experience at ${job.company} as ${job.role} (${job.tenure}). Summary: ${job.summary}. Key impact: ${job.impact.join('. ')}. Tech stack: ${job.tech_stack.join(', ')}.`,
      });
    });
  }

  // Skills
  if (data.skills) {
    const skillsContent = [
      `Technical specialties: ${data.skills.technical_specialties.join(', ')}`,
      `Organizational leverage: ${data.skills.organizational_leverage.join(', ')}`,
      `Emerging frontier: ${data.skills.emerging_frontier.join(', ')}`,
    ].join('. ');

    chunks.push({
      node_id: '05_00',
      category: 'skills',
      content: `Skills and expertise. ${skillsContent}`,
    });
  }

  // Education
  if (data.education) {
    data.education.forEach((edu, i) => {
      chunks.push({
        node_id: `06_${String(i).padStart(2, '0')}`,
        category: 'education',
        content: `Education: ${edu.degree_title} ${edu.degree} from ${edu.institution} (${edu.year}). Classification: ${edu.score_long}. Specialism: ${edu.specialism}. Notable: ${edu.notable}`,
      });
    });
  }

  // Impact nodes
  if (data.impact_nodes) {
    data.impact_nodes.forEach((node, i) => {
      node.items.forEach((item, j) => {
        chunks.push({
          node_id: `07_${String(i).padStart(2, '0')}_${String(j).padStart(2, '0')}`,
          category: 'impact',
          pillar: node.pillar,
          content: `Impact (${node.pillar}): ${item.primary}. ${item.detail}`,
        });
      });
    });
  }

  // Loose details - achievements
  if (data.loose_details?.achievements) {
    chunks.push({
      node_id: '08_00',
      category: 'achievements_extra',
      content: `Additional achievements: ${data.loose_details.achievements.join('. ')}`,
    });
  }

  // Loose details - war stories
  if (data.loose_details?.war_stories) {
    chunks.push({
      node_id: '09_00',
      category: 'war_stories',
      content: `Notable experiences and challenges: ${data.loose_details.war_stories.join('. ')}`,
    });
  }

  return chunks;
}

/**
 * Main seeding function
 */
async function seedEmbeddings() {
  console.log('[SEED] Reading CV content...');

  const yamlPath = new URL('../src/content/main.yaml', import.meta.url);
  const yamlContent = readFileSync(yamlPath, 'utf-8');

  console.log('[SEED] Parsing content into chunks...');
  const chunks = parseContentIntoChunks(yamlContent);
  console.log(`[SEED] Found ${chunks.length} chunks to embed`);

  // Clear existing embeddings
  console.log('[SEED] Clearing existing embeddings...');
  await sql`TRUNCATE cv_embeddings RESTART IDENTITY`;

  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[SEED] Processing chunk ${i + 1}/${chunks.length}: ${chunk.node_id}`);

    try {
      // Generate embedding
      const embedding = await generateEmbedding(chunk.content);

      // Insert into database
      await sql`
        INSERT INTO cv_embeddings (content, metadata, embedding)
        VALUES (
          ${chunk.content},
          ${JSON.stringify({ node_id: chunk.node_id, category: chunk.category, pillar: chunk.pillar })},
          ${JSON.stringify(embedding)}::vector
        )
      `;

      // Rate limiting - OpenAI has a 3000 RPM limit for embeddings
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[SEED] Error processing chunk ${chunk.node_id}:`, error.message);
    }
  }

  console.log('[SEED] Done! Embeddings seeded successfully.');
}

// Run the seeder
seedEmbeddings().catch(console.error);
