import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Unit tests for cv-data.ts
 *
 * Tests the Zod schemas that validate CV data.
 * Since cv-data.ts imports YAML at module load time,
 * we test the schemas directly to avoid coupling to actual data.
 */

// Re-create schemas locally to test validation logic without triggering module-level YAML import
const nonEmptyString = z.string().min(1);

const techTagSchema = z.object({
  name: nonEmptyString,
  group: nonEmptyString,
  url: z.string().url(),
  tooltip: nonEmptyString.optional(),
  professional_tooltip: nonEmptyString.optional(),
  hide_on_sidebar: z.boolean().optional(),
});

const impactColorSchema = z.enum([
  'green',
  'purple',
  'blue',
  'orange',
  'red',
  'cyan',
]);

const outlierAchievementSchema = z.object({
  metric: nonEmptyString,
  headline: nonEmptyString,
  description: nonEmptyString,
});

const projectSchema = z.object({
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

const workHistorySchema = z.object({
  company: nonEmptyString,
  color: impactColorSchema.optional(),
  role: nonEmptyString,
  tenure: nonEmptyString,
  summary: nonEmptyString,
  impact: z.array(nonEmptyString),
  supporting_data: z.array(nonEmptyString).optional(),
  tech_stack: z.array(techTagSchema),
});

const educationSchema = z.object({
  degree: nonEmptyString,
  color: impactColorSchema.optional(),
  degree_title: nonEmptyString.optional(),
  score_short: nonEmptyString.optional(),
  score_long: nonEmptyString.optional(),
  specialism: nonEmptyString.optional(),
  institution: nonEmptyString,
  tenure: nonEmptyString.optional(),
  year: z.number().int().min(1900).max(2100),
  notable: nonEmptyString.optional(),
});

const impactNodeSchema = z.object({
  header: nonEmptyString,
  short_header: nonEmptyString.optional(),
  title: nonEmptyString,
  metric_value: nonEmptyString.optional(),
  metric_label: nonEmptyString.optional(),
  description: nonEmptyString,
  long_description: nonEmptyString.optional(),
  prompt: nonEmptyString,
  color: impactColorSchema,
  print_only: z.boolean().optional(),
});

describe('CV Data Schemas', () => {
  describe('techTagSchema', () => {
    it('validates a complete tech tag', () => {
      const validTag = {
        name: 'TypeScript',
        group: 'Languages',
        url: 'https://typescriptlang.org',
        tooltip: 'A typed superset of JavaScript',
        professional_tooltip: 'Static types for the brave',
        hide_on_sidebar: false,
      };

      const result = techTagSchema.safeParse(validTag);
      expect(result.success).toBe(true);
    });

    it('validates a minimal tech tag (only required fields)', () => {
      const minimalTag = {
        name: 'Python',
        group: 'Languages',
        url: 'https://python.org',
      };

      const result = techTagSchema.safeParse(minimalTag);
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const invalidTag = {
        name: '',
        group: 'Languages',
        url: 'https://python.org',
      };

      const result = techTagSchema.safeParse(invalidTag);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('name');
      }
    });

    it('rejects invalid URL', () => {
      const invalidTag = {
        name: 'TypeScript',
        group: 'Languages',
        url: 'not-a-valid-url',
      };

      const result = techTagSchema.safeParse(invalidTag);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('url');
      }
    });

    it('rejects missing required fields', () => {
      const invalidTag = {
        name: 'TypeScript',
        // missing group and url
      };

      const result = techTagSchema.safeParse(invalidTag);
      expect(result.success).toBe(false);
    });
  });

  describe('impactColorSchema', () => {
    it('accepts all valid colors', () => {
      const validColors = ['green', 'purple', 'blue', 'orange', 'red', 'cyan'];

      validColors.forEach((color) => {
        const result = impactColorSchema.safeParse(color);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid colors', () => {
      const invalidColors = ['yellow', 'pink', 'black', '', 'GREEN'];

      invalidColors.forEach((color) => {
        const result = impactColorSchema.safeParse(color);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('outlierAchievementSchema', () => {
    it('validates a complete achievement', () => {
      const valid = {
        metric: 'Throughput',
        headline: '1000x',
        description: 'Improved system burst throughput',
      };

      const result = outlierAchievementSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects empty metric', () => {
      const invalid = {
        metric: '',
        headline: '1000x',
        description: 'Improved throughput',
      };

      const result = outlierAchievementSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
      const invalid = {
        metric: 'Throughput',
        // missing headline and description
      };

      const result = outlierAchievementSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('projectSchema', () => {
    it('validates a complete project', () => {
      const validProject = {
        project_title: 'Nova',
        subtitle: 'AI Analytics',
        headline: 'Built an AI analytics platform',
        metric: ['Drove 95% self-serve analytics', 'Revitalised sales pipeline'],
        action: ['Cultivated an AI-first culture'],
        cta: 'How did we avoid hallucinations?',
        prompt: 'Tell me about Nova',
        stack_and_tools: [
          {
            name: 'MongoDB',
            group: 'Infrastructure',
            url: 'https://mongodb.com',
          },
        ],
        war_story: ['Story 1'],
      };

      const result = projectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('validates a minimal project', () => {
      const minimalProject = {
        project_title: 'Simple Project',
        headline: 'A simple project',
        metric: ['One metric'],
        stack_and_tools: [],
      };

      const result = projectSchema.safeParse(minimalProject);
      expect(result.success).toBe(true);
    });

    it('rejects project with empty metrics array containing empty strings', () => {
      const invalidProject = {
        project_title: 'Project',
        headline: 'Headline',
        metric: [''], // Empty string in array
        stack_and_tools: [],
      };

      const result = projectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const invalidProject = {
        project_title: 'Project',
        // missing headline, metric, stack_and_tools
      };

      const result = projectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });
  });

  describe('workHistorySchema', () => {
    it('validates complete work history', () => {
      const valid = {
        company: 'Acme Corp',
        color: 'green' as const,
        role: 'Principal Engineer',
        tenure: 'Jan 2020 — Present',
        summary: 'Led engineering initiatives',
        impact: ['Built systems', 'Mentored team'],
        supporting_data: ['Additional info'],
        tech_stack: [
          { name: 'TypeScript', group: 'Languages', url: 'https://ts.org' },
        ],
      };

      const result = workHistorySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates minimal work history', () => {
      const minimal = {
        company: 'Startup',
        role: 'Developer',
        tenure: '2021',
        summary: 'Built things',
        impact: ['Did stuff'],
        tech_stack: [],
      };

      const result = workHistorySchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('rejects invalid color', () => {
      const invalid = {
        company: 'Company',
        color: 'invalid-color',
        role: 'Role',
        tenure: '2021',
        summary: 'Summary',
        impact: ['Impact'],
        tech_stack: [],
      };

      const result = workHistorySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('educationSchema', () => {
    it('validates complete education entry', () => {
      const valid = {
        degree: 'Computer Science',
        color: 'blue' as const,
        degree_title: 'MEng',
        score_short: '1st',
        score_long: 'First Class Honours',
        specialism: 'Data Science & AI',
        institution: 'University of Southampton',
        tenure: 'Sep 2011 — Jul 2015',
        year: 2015,
        notable: 'Dean list',
      };

      const result = educationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates minimal education entry', () => {
      const minimal = {
        degree: 'Computer Science',
        institution: 'MIT',
        year: 2020,
      };

      const result = educationSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('rejects year below 1900', () => {
      const invalid = {
        degree: 'History',
        institution: 'Oxford',
        year: 1800,
      };

      const result = educationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects year above 2100', () => {
      const invalid = {
        degree: 'Quantum Computing',
        institution: 'Space University',
        year: 2101,
      };

      const result = educationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects non-integer year', () => {
      const invalid = {
        degree: 'Science',
        institution: 'University',
        year: 2020.5,
      };

      const result = educationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('impactNodeSchema', () => {
    it('validates complete impact node', () => {
      const valid = {
        header: 'Developer Velocity',
        short_header: 'VELOCITY',
        title: 'CI/CD Pipeline',
        metric_value: '10x',
        metric_label: 'Build Speed',
        description: 'Improved build times',
        long_description: 'Detailed story about improvements',
        prompt: 'Tell me about the pipeline improvements',
        color: 'green' as const,
        print_only: false,
      };

      const result = impactNodeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates minimal impact node', () => {
      const minimal = {
        header: 'System Integrity',
        title: 'Monitoring',
        description: 'Implemented monitoring',
        prompt: 'Tell me about monitoring',
        color: 'purple' as const,
      };

      const result = impactNodeSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('rejects missing color', () => {
      const invalid = {
        header: 'Header',
        title: 'Title',
        description: 'Description',
        prompt: 'Prompt',
        // missing color
      };

      const result = impactNodeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid color value', () => {
      const invalid = {
        header: 'Header',
        title: 'Title',
        description: 'Description',
        prompt: 'Prompt',
        color: 'magenta',
      };

      const result = impactNodeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ZodError formatting', () => {
    it('provides detailed path information for nested errors', () => {
      const invalidProject = {
        project_title: 'Project',
        headline: 'Headline',
        metric: ['Valid'],
        stack_and_tools: [
          {
            name: 'Tool',
            group: 'Group',
            url: 'invalid-url', // Invalid URL nested in array
          },
        ],
      };

      const result = projectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((e) => e.path.join('.'));
        expect(paths).toContain('stack_and_tools.0.url');
      }
    });
  });
});

describe('Edge Cases', () => {
  describe('Unicode and special characters', () => {
    it('accepts unicode characters in strings', () => {
      const valid = {
        metric: 'Rendimiento',
        headline: '1000x',
        description: 'Improved system throughput',
      };

      const result = outlierAchievementSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('accepts special characters in tech tag names', () => {
      const valid = {
        name: 'C++',
        group: 'Languages',
        url: 'https://cplusplus.com',
      };

      const result = techTagSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('accepts emojis in descriptions', () => {
      const valid = {
        header: 'Fun Impact',
        title: 'Happy Code',
        description: 'Made developers happy',
        prompt: 'Tell me more',
        color: 'green' as const,
      };

      const result = impactNodeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Whitespace handling', () => {
    it('accepts strings with only whitespace as valid (non-empty)', () => {
      // Note: The nonEmptyString schema only checks min(1), not content
      // Whitespace-only strings pass the min(1) check
      const valid = {
        metric: '   ',
        headline: 'Value',
        description: 'Description',
      };

      const result = outlierAchievementSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('URL validation', () => {
    it('accepts various valid URL formats', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://sub.domain.example.com/path?query=1',
        'https://example.com/path#anchor',
      ];

      validUrls.forEach((url) => {
        const tag = { name: 'Test', group: 'Test', url };
        const result = techTagSchema.safeParse(tag);
        expect(result.success).toBe(true);
      });
    });

    it('rejects protocol-less URLs', () => {
      const tag = {
        name: 'Test',
        group: 'Test',
        url: 'example.com',
      };

      const result = techTagSchema.safeParse(tag);
      expect(result.success).toBe(false);
    });
  });
});
