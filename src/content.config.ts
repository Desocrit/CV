import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// =============================================================================
// SHARED SCHEMAS
// =============================================================================

const dateString = z
  .string()
  .min(1)
  .regex(/^\w{3} \d{4}$/, 'Format: "Mon YYYY"');

const nonEmptyString = z.string().min(1);

const employmentType = z.enum([
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
]);

// =============================================================================
// EXPERIENCE
// =============================================================================

const experience = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
  schema: z.object({
    company: nonEmptyString,
    role: nonEmptyString,
    employmentType: employmentType,
    startDate: dateString,
    endDate: dateString.optional(),
    location: nonEmptyString,
    order: z.number().int().min(1),
    highlights: z.array(nonEmptyString).min(1),
    technologies: z.array(nonEmptyString).optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

// =============================================================================
// EDUCATION
// =============================================================================

const education = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/education' }),
  schema: z.object({
    institution: nonEmptyString,
    degree: nonEmptyString,
    field: nonEmptyString,
    startDate: dateString,
    endDate: dateString.optional(),
    location: nonEmptyString,
    order: z.number().int().min(1),
    grade: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// =============================================================================
// EXPORT
// =============================================================================

export const collections = { experience, education };
