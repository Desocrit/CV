import { parse } from 'yaml';
import { z } from 'astro:content';

const yamlContent = await import('../content/main.yaml?raw').then(
  (m) => m.default
);

const nonEmptyString = z.string().min(1);

// Tech tag with name, canonical URL, and optional tooltips
export const techTagSchema = z.object({
  name: nonEmptyString,
  url: z.string().url(),
  tooltip: nonEmptyString.optional(),
  professional_tooltip: nonEmptyString.optional(),
});

export type TechTag = z.infer<typeof techTagSchema>;

// Tokyo Night-inspired terminal palette
export const impactColorSchema = z.enum([
  'green',   // existing accent-green
  'purple',  // existing accent-purple
  'blue',    // Tokyo Night blue
  'orange',  // Tokyo Night orange
  'red',     // Tokyo Night red
  'cyan',    // Tokyo Night cyan
]);

export type ImpactColor = z.infer<typeof impactColorSchema>;

export const outlierAchievementSchema = z.object({
  metric: nonEmptyString,
  headline: nonEmptyString,
  description: nonEmptyString,
});

export const projectSchema = z.object({
  project_title: nonEmptyString,
  subtitle: nonEmptyString.optional(),
  headline: nonEmptyString,
  metric: z.array(nonEmptyString),
  action: z.array(nonEmptyString).optional(),
  cta: nonEmptyString.optional(),
  prompt: nonEmptyString.optional(),
  stack_and_tools: z.array(techTagSchema),
  war_story: z.array(nonEmptyString).optional(),
});

export const workHistorySchema = z.object({
  company: nonEmptyString,
  role: nonEmptyString,
  tenure: nonEmptyString,
  summary: nonEmptyString,
  impact: z.array(nonEmptyString),
  supporting_data: z.array(nonEmptyString).optional(),
  tech_stack: z.array(techTagSchema),
});

export const educationSchema = z.object({
  degree: nonEmptyString,
  degree_title: nonEmptyString.optional(),
  score_short: nonEmptyString.optional(),
  score_long: nonEmptyString.optional(),
  specialism: nonEmptyString.optional(),
  institution: nonEmptyString,
  tenure: nonEmptyString.optional(),
  year: z.number().int().min(1900).max(2100),
  notable: nonEmptyString.optional(),
});

export const impactNodeSchema = z.object({
  header: nonEmptyString,
  title: nonEmptyString,
  description: nonEmptyString,
  long_description: nonEmptyString.optional(),
  prompt: nonEmptyString,
  color: impactColorSchema,
  print_only: z.boolean().optional(),
});

export const cvSchema = z.object({
  name: nonEmptyString,
  role: nonEmptyString,
  location: nonEmptyString,
  email: z.string().email(),
  phone: nonEmptyString.optional(),
  website: z.string().url(),
  github: z.string().url(),
  linkedin: z.string().url(),
  summary: nonEmptyString,
  outlier_achievements: z.array(outlierAchievementSchema),
  projects: z.array(projectSchema),
  work_history: z.array(workHistorySchema),
  education: z.array(educationSchema),
  impact_nodes: z.array(impactNodeSchema),
  meta: z.object({
    keywords: z.array(nonEmptyString),
  }),
  loose_details: z.object({
    achievements: z.array(nonEmptyString),
    war_stories: z.array(nonEmptyString),
  }),
});

export type CVData = z.infer<typeof cvSchema>;
export type Project = z.infer<typeof projectSchema>;
export type WorkHistory = z.infer<typeof workHistorySchema>;
export type OutlierAchievement = z.infer<typeof outlierAchievementSchema>;
export type Education = z.infer<typeof educationSchema>;
export type ImpactNode = z.infer<typeof impactNodeSchema>;

// Parse CV data with graceful error handling
function parseCVData(): z.infer<typeof cvSchema> {
  try {
    const parsed = parse(yamlContent);
    return cvSchema.parse(parsed);
  } catch (error) {
    // Provide helpful error message for debugging
    const message = error instanceof z.ZodError
      ? `CV data validation failed:\n${error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n')}`
      : error instanceof Error
        ? `CV YAML parsing failed: ${error.message}`
        : 'Unknown error parsing CV data';

    console.error('[cv-data]', message);
    throw new Error(`Failed to load CV data. ${message}`);
  }
}

export const cvData = parseCVData();
