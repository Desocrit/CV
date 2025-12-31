import { parse } from 'yaml';
import { z } from 'astro:content';

// Import raw YAML
const yamlContent = await import('../content/main.yaml?raw').then(
  (m) => m.default
);

// =============================================================================
// SCHEMAS
// =============================================================================

const nonEmptyString = z.string().min(1);

export const outlierAchievementSchema = z.object({
  metric: nonEmptyString,
  headline: nonEmptyString,
  description: nonEmptyString,
});

export const projectSchema = z.object({
  project_title: nonEmptyString,
  stack_and_tools: z.array(nonEmptyString),
  the_premise: nonEmptyString,
  technical_meat: nonEmptyString,
  impact_and_acclaim: z.array(nonEmptyString),
  role: nonEmptyString.optional(),
  status: nonEmptyString,
});

export const workHistorySchema = z.object({
  company: nonEmptyString,
  role: nonEmptyString,
  tenure: nonEmptyString,
  summary: nonEmptyString,
  impact: z.array(nonEmptyString),
  tech_stack: z.array(nonEmptyString),
});

export const skillsSchema = z.object({
  technical_specialties: z.array(nonEmptyString),
  organizational_leverage: z.array(nonEmptyString),
  emerging_frontier: z.array(nonEmptyString),
});

export const educationSchema = z.object({
  degree: nonEmptyString,
  specialism: nonEmptyString.optional(),
  institution: nonEmptyString,
  year: z.number().int().min(1900).max(2100),
  notable: nonEmptyString.optional(),
});

export const cvSchema = z.object({
  // Profile
  name: nonEmptyString,
  role: nonEmptyString,
  location: nonEmptyString,
  email: z.string().email(),
  website: z.string().url(),
  github: z.string().url(),
  linkedin: z.string().url(),

  // Summary
  summary: nonEmptyString,

  // Achievements
  outlier_achievements: z.array(outlierAchievementSchema),

  // Experience
  projects: z.array(projectSchema),
  work_history: z.array(workHistorySchema),

  // Skills
  skills: skillsSchema,

  // Education
  education: z.array(educationSchema),

  // Meta
  meta: z.object({
    keywords: z.array(nonEmptyString),
  }),

  // Loose details (for unrefined content)
  loose_details: z.object({
    achievements: z.array(nonEmptyString),
    war_stories: z.array(nonEmptyString),
  }),
});

// =============================================================================
// EXPORTED DATA
// =============================================================================

export type CVData = z.infer<typeof cvSchema>;
export type Project = z.infer<typeof projectSchema>;
export type WorkHistory = z.infer<typeof workHistorySchema>;
export type OutlierAchievement = z.infer<typeof outlierAchievementSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Education = z.infer<typeof educationSchema>;

const parsed = parse(yamlContent);
export const cvData = cvSchema.parse(parsed);
