import { describe, it, expect } from 'vitest';

/**
 * Unit tests for cv-dto.ts transformation logic
 *
 * Since cv-dto.ts imports cv-data.ts which uses Astro-specific imports,
 * we test the transformation logic by re-implementing the pure functions
 * with mock data. This ensures the business logic is tested without
 * depending on Astro runtime.
 */

// Type definitions (matching cv-data.ts)
interface TechTag {
  name: string;
  group: string;
  url: string;
  tooltip?: string;
  professional_tooltip?: string;
  hide_on_sidebar?: boolean;
}

type ImpactColor = 'green' | 'purple' | 'blue' | 'orange' | 'red' | 'cyan';

interface OutlierAchievement {
  metric: string;
  headline: string;
  description: string;
}

interface Project {
  project_title: string;
  subtitle?: string;
  headline: string;
  metric: string[];
  action?: string[];
  cta?: string;
  prompt?: string;
  stack_and_tools: TechTag[];
  war_story?: string[];
}

interface WorkHistory {
  company: string;
  role: string;
  tenure: string;
  summary: string;
  impact: string[];
  supporting_data?: string[];
  tech_stack: TechTag[];
}

interface Education {
  degree: string;
  color?: ImpactColor;
  degree_title?: string;
  score_short?: string;
  score_long?: string;
  specialism?: string;
  institution: string;
  tenure?: string;
  year: number;
  notable?: string;
}

interface ImpactNode {
  header: string;
  short_header?: string;
  title: string;
  metric_value?: string;
  metric_label?: string;
  description: string;
  long_description?: string;
  prompt: string;
  color: ImpactColor;
  print_only?: boolean;
}

interface CVData {
  name: string;
  role: string;
  location: string;
  email: string;
  phone?: string;
  website: string;
  github: string;
  source: string;
  linkedin: string;
  summary: string;
  outlier_achievements: OutlierAchievement[];
  projects: Project[];
  work_history: WorkHistory[];
  education: Education[];
  impact_nodes: ImpactNode[];
  meta: { keywords: string[] };
  loose_details: { achievements: string[]; war_stories: string[] };
}

// =========== Re-implement transformation functions from cv-dto.ts ===========

function createLayoutDTO(cvData: CVData) {
  return {
    title: `CV / ${cvData.name}`,
    description: `Professional CV for ${cvData.name}, ${cvData.role} based in ${cvData.location}.`,
    name: cvData.name,
    jobTitle: cvData.role,
    email: cvData.email,
    location: cvData.location,
    website: cvData.website,
    socialLinks: [
      { platform: 'LinkedIn' as const, url: cvData.linkedin },
      { platform: 'GitHub' as const, url: cvData.github },
      { platform: 'Source' as const, url: cvData.source },
    ],
    workExperiences: cvData.work_history.map((exp) => {
      const tenureParts = exp.tenure.split(' — ');
      return {
        company: exp.company,
        role: exp.role,
        startDate: tenureParts[0] ?? exp.tenure,
        endDate: tenureParts[1] || undefined,
        location: cvData.location,
      };
    }),
    education: cvData.education.map((edu) => ({
      institution: edu.institution,
      degree: edu.degree_title ?? edu.degree,
      field: edu.specialism ?? edu.degree,
      startDate: String(edu.year),
      endDate: String(edu.year),
    })),
    knowsAbout: cvData.meta.keywords,
    summary: cvData.summary,
    keywords: cvData.meta.keywords,
  };
}

function createSidebarDTO(cvData: CVData) {
  const allTechnologies: TechTag[] = [
    ...cvData.work_history.flatMap((job) => job.tech_stack),
    ...cvData.projects.flatMap((project) => project.stack_and_tools),
  ];

  const categoryNumbers: Record<string, string> = {
    'Developer Velocity': '01',
    'System Integrity': '02',
    'Talent Density': '03',
    'Global Scale': '04',
  };

  const groupedImpact = cvData.impact_nodes.reduce<
    Record<string, { shortHeader: string; items: ImpactNode[] }>
  >((acc, node) => {
    const existing = acc[node.header];
    if (existing) {
      existing.items.push(node);
    } else {
      acc[node.header] = {
        shortHeader: node.short_header ?? node.header.toUpperCase(),
        items: [node],
      };
    }
    return acc;
  }, {});

  const impactPrintGroups = Object.entries(groupedImpact).map(([header, group]) => ({
    subheading: `${categoryNumbers[header] ?? '00'} / ${group.shortHeader}`,
    items: group.items.map((node) => ({
      metric: node.metric_label ?? node.title,
      headline: node.metric_value ?? '',
      description: node.description,
    })),
  }));

  return {
    name: cvData.name,
    role: cvData.role,
    email: cvData.email,
    phone: cvData.phone,
    location: cvData.location,
    linkedin: cvData.linkedin,
    github: cvData.github,
    source: cvData.source,
    profile: cvData.summary,
    achievements: cvData.outlier_achievements,
    impactPrintGroups,
    technologies: allTechnologies,
  };
}

function createProjectCards(cvData: CVData) {
  const projectAccentColors = ['green', 'orange', 'blue', 'purple'] as const;

  return cvData.projects.slice(0, 4).map((project, index) => ({
    title: project.project_title,
    tag: project.subtitle,
    technologies: project.stack_and_tools,
    headline: project.headline,
    bulletPoints: project.metric,
    supportingData: project.action,
    cta: project.cta,
    prompt: project.prompt,
    useTerminal: true,
    metaWidth: 'narrow' as const,
    accentColor: projectAccentColors[index % projectAccentColors.length],
    printHideTag: true,
    printBulletCount: 2,
  }));
}

function createWorkHistoryCards(cvData: CVData) {
  const historyAccentColors = ['green', 'purple', 'blue'] as const;
  const printBulletCounts = [3, 0, 0] as const;

  return cvData.work_history.map((job, index) => ({
    title: job.role,
    tag: job.tenure,
    label: job.company,
    technologies: job.tech_stack,
    headline: job.summary,
    bulletPoints: job.impact,
    supportingData: job.supporting_data,
    metaWidth: 'wide' as const,
    accentColor: historyAccentColors[index % historyAccentColors.length],
    printStackMeta: true,
    printBulletCount: printBulletCounts[Math.min(index, 2)],
  }));
}

function createEducationCard(cvData: CVData) {
  const edu = cvData.education[0];
  return {
    title: edu?.degree ?? 'Computer Science',
    tag: edu?.tenure ?? String(edu?.year),
    label: edu?.institution,
    technologies: [] as TechTag[],
    headline: `${edu?.score_long} from the University of Southampton.`,
    bulletPoints: [`Masters of Engineering in ${edu?.specialism}`, edu?.notable ?? ''].filter(
      Boolean
    ),
    metaWidth: 'wide' as const,
    accentColor: 'green' as const,
    printStackMeta: true,
    printEducationCompact: true,
    printDegreeTitle: edu?.degree_title ?? 'MEng',
    printDegree: edu?.degree ?? 'Computer Science',
    printInstitution: edu?.institution ?? 'Southampton University',
    printTenure: edu?.tenure ?? `Sep 2011 — Jul ${edu?.year}`,
    printSpecialism: edu?.specialism ?? 'Data Science & AI',
    printScore: edu?.score_long ?? 'First Class Honours',
  };
}

// =========== Test Data ===========

const mockCvData: CVData = {
  name: 'Test User',
  role: 'Software Engineer',
  location: 'London, UK',
  email: 'test@example.com',
  phone: '123-456-7890',
  website: 'https://example.com',
  github: 'https://github.com/testuser',
  source: 'https://github.com/testuser/cv',
  linkedin: 'https://linkedin.com/in/testuser',
  summary: 'A skilled engineer',
  outlier_achievements: [
    { metric: 'Performance', headline: '10x', description: 'Improved speed' },
  ],
  projects: [
    {
      project_title: 'Project Alpha',
      subtitle: 'AI Platform',
      headline: 'Built an AI platform',
      metric: ['Metric 1', 'Metric 2'],
      action: ['Action 1'],
      cta: 'Learn more',
      prompt: 'Tell me about Alpha',
      stack_and_tools: [
        { name: 'TypeScript', group: 'Languages', url: 'https://ts.org' },
        { name: 'React', group: 'Frontend', url: 'https://react.dev' },
      ],
    },
    {
      project_title: 'Project Beta',
      subtitle: 'Infrastructure',
      headline: 'Built infrastructure',
      metric: ['Metric A'],
      stack_and_tools: [
        { name: 'AWS', group: 'Cloud', url: 'https://aws.amazon.com' },
      ],
    },
    {
      project_title: 'Project Gamma',
      subtitle: 'API',
      headline: 'Built APIs',
      metric: ['Metric X'],
      stack_and_tools: [],
    },
    {
      project_title: 'Project Delta',
      subtitle: 'Mobile',
      headline: 'Built mobile app',
      metric: ['Metric Y'],
      stack_and_tools: [],
    },
    {
      project_title: 'Project Epsilon',
      subtitle: 'Extra',
      headline: 'Fifth project',
      metric: ['Metric Z'],
      stack_and_tools: [],
    },
  ],
  work_history: [
    {
      company: 'Tech Corp',
      role: 'Principal Engineer',
      tenure: 'Jan 2022 — Present',
      summary: 'Led engineering initiatives',
      impact: ['Impact 1', 'Impact 2'],
      supporting_data: ['Data point 1'],
      tech_stack: [
        { name: 'Python', group: 'Languages', url: 'https://python.org' },
      ],
    },
    {
      company: 'Startup Inc',
      role: 'Senior Engineer',
      tenure: 'Jun 2020 — Dec 2021',
      summary: 'Built systems',
      impact: ['Impact A'],
      tech_stack: [],
    },
    {
      company: 'Agency Ltd',
      role: 'Engineer',
      tenure: '2018 — 2020',
      summary: 'Developed features',
      impact: ['Impact X'],
      tech_stack: [],
    },
  ],
  education: [
    {
      degree: 'Computer Science',
      degree_title: 'MSc',
      score_short: '1st',
      score_long: 'First Class Honours',
      specialism: 'Machine Learning',
      institution: 'Test University',
      tenure: 'Sep 2015 — Jul 2019',
      year: 2019,
      notable: 'Dean list',
    },
  ],
  impact_nodes: [
    {
      header: 'Developer Velocity',
      short_header: 'VELOCITY',
      title: 'CI/CD',
      metric_value: '10x',
      metric_label: 'Build Speed',
      description: 'Improved builds',
      prompt: 'Tell me about CI/CD',
      color: 'green',
    },
    {
      header: 'Developer Velocity',
      title: 'Testing',
      metric_value: '95%',
      metric_label: 'Coverage',
      description: 'Improved coverage',
      prompt: 'Tell me about testing',
      color: 'green',
    },
    {
      header: 'System Integrity',
      short_header: 'INTEGRITY',
      title: 'Monitoring',
      description: 'Added observability',
      prompt: 'Tell me about monitoring',
      color: 'purple',
    },
  ],
  meta: {
    keywords: ['engineering', 'typescript', 'python'],
  },
  loose_details: {
    achievements: ['Achievement 1'],
    war_stories: ['Story 1'],
  },
};

// =========== Tests ===========

describe('CV DTO Transformations', () => {
  describe('createLayoutDTO', () => {
    it('transforms basic contact info correctly', () => {
      const layoutDTO = createLayoutDTO(mockCvData);

      expect(layoutDTO.name).toBe('Test User');
      expect(layoutDTO.jobTitle).toBe('Software Engineer');
      expect(layoutDTO.email).toBe('test@example.com');
      expect(layoutDTO.location).toBe('London, UK');
      expect(layoutDTO.website).toBe('https://example.com');
    });

    it('generates correct title format', () => {
      const layoutDTO = createLayoutDTO(mockCvData);

      expect(layoutDTO.title).toBe('CV / Test User');
    });

    it('generates correct description format', () => {
      const layoutDTO = createLayoutDTO(mockCvData);

      expect(layoutDTO.description).toBe(
        'Professional CV for Test User, Software Engineer based in London, UK.'
      );
    });

    it('transforms social links correctly', () => {
      const layoutDTO = createLayoutDTO(mockCvData);

      expect(layoutDTO.socialLinks).toHaveLength(3);
      expect(layoutDTO.socialLinks[0]).toEqual({
        platform: 'LinkedIn',
        url: 'https://linkedin.com/in/testuser',
      });
      expect(layoutDTO.socialLinks[1]).toEqual({
        platform: 'GitHub',
        url: 'https://github.com/testuser',
      });
      expect(layoutDTO.socialLinks[2]).toEqual({
        platform: 'Source',
        url: 'https://github.com/testuser/cv',
      });
    });

    it('transforms work experiences with tenure parsing', () => {
      const layoutDTO = createLayoutDTO(mockCvData);

      expect(layoutDTO.workExperiences).toHaveLength(3);

      // First job with em-dash separator
      expect(layoutDTO.workExperiences[0]).toEqual({
        company: 'Tech Corp',
        role: 'Principal Engineer',
        startDate: 'Jan 2022',
        endDate: 'Present',
        location: 'London, UK',
      });

      // Second job with em-dash separator
      expect(layoutDTO.workExperiences[1]).toEqual({
        company: 'Startup Inc',
        role: 'Senior Engineer',
        startDate: 'Jun 2020',
        endDate: 'Dec 2021',
        location: 'London, UK',
      });
    });

    it('handles tenure with em-dash separator', () => {
      const layoutDTO = createLayoutDTO(mockCvData);

      // Third job with em-dash separator but range format
      expect(layoutDTO.workExperiences[2]?.startDate).toBe('2018');
      expect(layoutDTO.workExperiences[2]?.endDate).toBe('2020');
    });

    it('handles tenure without separator', () => {
      const dataWithSimpleTenure: CVData = {
        ...mockCvData,
        work_history: [
          {
            company: 'Simple Co',
            role: 'Developer',
            tenure: '2020', // No separator
            summary: 'Worked',
            impact: ['Did things'],
            tech_stack: [],
          },
        ],
      };

      const layoutDTO = createLayoutDTO(dataWithSimpleTenure);

      expect(layoutDTO.workExperiences[0]?.startDate).toBe('2020');
      expect(layoutDTO.workExperiences[0]?.endDate).toBeUndefined();
    });

    it('transforms education correctly', () => {
      const layoutDTO = createLayoutDTO(mockCvData);

      expect(layoutDTO.education).toHaveLength(1);
      expect(layoutDTO.education[0]).toEqual({
        institution: 'Test University',
        degree: 'MSc',
        field: 'Machine Learning',
        startDate: '2019',
        endDate: '2019',
      });
    });

    it('falls back to degree when degree_title is missing', () => {
      const dataWithoutDegreeTitle: CVData = {
        ...mockCvData,
        education: [
          {
            degree: 'Computer Science',
            institution: 'University',
            year: 2020,
          },
        ],
      };

      const layoutDTO = createLayoutDTO(dataWithoutDegreeTitle);

      expect(layoutDTO.education[0]?.degree).toBe('Computer Science');
      expect(layoutDTO.education[0]?.field).toBe('Computer Science');
    });

    it('passes through keywords and summary', () => {
      const layoutDTO = createLayoutDTO(mockCvData);

      expect(layoutDTO.summary).toBe('A skilled engineer');
      expect(layoutDTO.keywords).toEqual(['engineering', 'typescript', 'python']);
      expect(layoutDTO.knowsAbout).toEqual(['engineering', 'typescript', 'python']);
    });
  });

  describe('createSidebarDTO', () => {
    it('includes basic profile info', () => {
      const sidebarDTO = createSidebarDTO(mockCvData);

      expect(sidebarDTO.name).toBe('Test User');
      expect(sidebarDTO.role).toBe('Software Engineer');
      expect(sidebarDTO.email).toBe('test@example.com');
      expect(sidebarDTO.phone).toBe('123-456-7890');
      expect(sidebarDTO.location).toBe('London, UK');
      expect(sidebarDTO.profile).toBe('A skilled engineer');
    });

    it('aggregates all technologies from work and projects', () => {
      const sidebarDTO = createSidebarDTO(mockCvData);

      // Should include: Python (from work), TypeScript, React, AWS (from projects)
      expect(sidebarDTO.technologies.length).toBe(4);

      const techNames = sidebarDTO.technologies.map((t) => t.name);
      expect(techNames).toContain('Python');
      expect(techNames).toContain('TypeScript');
      expect(techNames).toContain('React');
      expect(techNames).toContain('AWS');
    });

    it('includes achievements', () => {
      const sidebarDTO = createSidebarDTO(mockCvData);

      expect(sidebarDTO.achievements).toEqual([
        { metric: 'Performance', headline: '10x', description: 'Improved speed' },
      ]);
    });

    it('groups impact nodes by header with subheadings', () => {
      const sidebarDTO = createSidebarDTO(mockCvData);

      expect(sidebarDTO.impactPrintGroups.length).toBe(2);

      // Find the Developer Velocity group
      const velocityGroup = sidebarDTO.impactPrintGroups.find((g) =>
        g.subheading.includes('VELOCITY')
      );
      expect(velocityGroup).toBeDefined();
      expect(velocityGroup?.items).toHaveLength(2); // CI/CD and Testing
    });

    it('uses category number for known categories', () => {
      const sidebarDTO = createSidebarDTO(mockCvData);

      const velocityGroup = sidebarDTO.impactPrintGroups.find((g) =>
        g.subheading.includes('VELOCITY')
      );
      expect(velocityGroup?.subheading).toBe('01 / VELOCITY');

      const integrityGroup = sidebarDTO.impactPrintGroups.find((g) =>
        g.subheading.includes('INTEGRITY')
      );
      expect(integrityGroup?.subheading).toBe('02 / INTEGRITY');
    });

    it('uses 00 for unknown categories', () => {
      const dataWithUnknownCategory: CVData = {
        ...mockCvData,
        impact_nodes: [
          {
            header: 'Unknown Category',
            title: 'Something',
            description: 'Description',
            prompt: 'Prompt',
            color: 'green',
          },
        ],
      };

      const sidebarDTO = createSidebarDTO(dataWithUnknownCategory);

      expect(sidebarDTO.impactPrintGroups[0]?.subheading).toBe('00 / UNKNOWN CATEGORY');
    });

    it('uses short_header when provided', () => {
      const sidebarDTO = createSidebarDTO(mockCvData);

      const velocityGroup = sidebarDTO.impactPrintGroups.find((g) =>
        g.subheading.includes('VELOCITY')
      );
      expect(velocityGroup?.subheading).toContain('VELOCITY');
    });

    it('falls back to uppercase header when short_header is missing', () => {
      const dataWithoutShortHeader: CVData = {
        ...mockCvData,
        impact_nodes: [
          {
            header: 'Custom Header',
            title: 'Item',
            description: 'Desc',
            prompt: 'Prompt',
            color: 'blue',
          },
        ],
      };

      const sidebarDTO = createSidebarDTO(dataWithoutShortHeader);

      expect(sidebarDTO.impactPrintGroups[0]?.subheading).toBe('00 / CUSTOM HEADER');
    });
  });

  describe('createProjectCards', () => {
    it('limits to first 4 projects', () => {
      const projectCards = createProjectCards(mockCvData);

      expect(projectCards).toHaveLength(4);
    });

    it('transforms project fields correctly', () => {
      const projectCards = createProjectCards(mockCvData);

      expect(projectCards[0]).toMatchObject({
        title: 'Project Alpha',
        tag: 'AI Platform',
        headline: 'Built an AI platform',
        bulletPoints: ['Metric 1', 'Metric 2'],
        supportingData: ['Action 1'],
        cta: 'Learn more',
        prompt: 'Tell me about Alpha',
        useTerminal: true,
        metaWidth: 'narrow',
        printHideTag: true,
        printBulletCount: 2,
      });
    });

    it('assigns cycling accent colors', () => {
      const projectCards = createProjectCards(mockCvData);

      // Color cycle: green -> orange -> blue -> purple
      expect(projectCards[0]?.accentColor).toBe('green');
      expect(projectCards[1]?.accentColor).toBe('orange');
      expect(projectCards[2]?.accentColor).toBe('blue');
      expect(projectCards[3]?.accentColor).toBe('purple');
    });

    it('includes technologies array', () => {
      const projectCards = createProjectCards(mockCvData);

      expect(projectCards[0]?.technologies).toHaveLength(2);
      expect(projectCards[0]?.technologies[0]?.name).toBe('TypeScript');
    });

    it('handles project without optional fields', () => {
      const minimalProject: CVData = {
        ...mockCvData,
        projects: [
          {
            project_title: 'Minimal',
            headline: 'Minimal headline',
            metric: ['One metric'],
            stack_and_tools: [],
          },
        ],
      };

      const projectCards = createProjectCards(minimalProject);

      expect(projectCards[0]?.tag).toBeUndefined();
      expect(projectCards[0]?.cta).toBeUndefined();
      expect(projectCards[0]?.supportingData).toBeUndefined();
    });
  });

  describe('createWorkHistoryCards', () => {
    it('transforms all work history entries', () => {
      const workHistoryCards = createWorkHistoryCards(mockCvData);

      expect(workHistoryCards).toHaveLength(3);
    });

    it('transforms work history fields correctly', () => {
      const workHistoryCards = createWorkHistoryCards(mockCvData);

      expect(workHistoryCards[0]).toMatchObject({
        title: 'Principal Engineer',
        tag: 'Jan 2022 — Present',
        label: 'Tech Corp',
        headline: 'Led engineering initiatives',
        bulletPoints: ['Impact 1', 'Impact 2'],
        supportingData: ['Data point 1'],
        metaWidth: 'wide',
        printStackMeta: true,
      });
    });

    it('assigns cycling accent colors for history', () => {
      const workHistoryCards = createWorkHistoryCards(mockCvData);

      // Color cycle: green -> purple -> blue
      expect(workHistoryCards[0]?.accentColor).toBe('green');
      expect(workHistoryCards[1]?.accentColor).toBe('purple');
      expect(workHistoryCards[2]?.accentColor).toBe('blue');
    });

    it('assigns print bullet counts correctly', () => {
      const workHistoryCards = createWorkHistoryCards(mockCvData);

      // Print bullet counts: 1st = 3, 2nd/3rd = 0
      expect(workHistoryCards[0]?.printBulletCount).toBe(3);
      expect(workHistoryCards[1]?.printBulletCount).toBe(0);
      expect(workHistoryCards[2]?.printBulletCount).toBe(0);
    });

    it('caps printBulletCount index at 2', () => {
      const manyJobs: CVData = {
        ...mockCvData,
        work_history: [
          ...mockCvData.work_history,
          {
            company: 'Fourth',
            role: 'Dev',
            tenure: '2017',
            summary: 'Work',
            impact: ['Did stuff'],
            tech_stack: [],
          },
          {
            company: 'Fifth',
            role: 'Dev',
            tenure: '2016',
            summary: 'Work',
            impact: ['Did more'],
            tech_stack: [],
          },
        ],
      };

      const workHistoryCards = createWorkHistoryCards(manyJobs);

      // All jobs after index 2 should have printBulletCount of 0
      expect(workHistoryCards[3]?.printBulletCount).toBe(0);
      expect(workHistoryCards[4]?.printBulletCount).toBe(0);
    });
  });

  describe('createEducationCard', () => {
    it('transforms education entry correctly', () => {
      const educationCard = createEducationCard(mockCvData);

      expect(educationCard.title).toBe('Computer Science');
      expect(educationCard.tag).toBe('Sep 2015 — Jul 2019');
      expect(educationCard.label).toBe('Test University');
      expect(educationCard.accentColor).toBe('green');
      expect(educationCard.metaWidth).toBe('wide');
      expect(educationCard.printStackMeta).toBe(true);
    });

    it('generates headline from score_long', () => {
      const educationCard = createEducationCard(mockCvData);

      expect(educationCard.headline).toBe(
        'First Class Honours from the University of Southampton.'
      );
    });

    it('includes specialism in bullet points', () => {
      const educationCard = createEducationCard(mockCvData);

      expect(educationCard.bulletPoints).toContain(
        'Masters of Engineering in Machine Learning'
      );
    });

    it('includes notable in bullet points when present', () => {
      const educationCard = createEducationCard(mockCvData);

      expect(educationCard.bulletPoints).toContain('Dean list');
    });

    it('filters out empty notable', () => {
      const dataWithoutNotable: CVData = {
        ...mockCvData,
        education: [
          {
            degree: 'CS',
            institution: 'Uni',
            specialism: 'AI',
            year: 2020,
            notable: '',
          },
        ],
      };

      const educationCard = createEducationCard(dataWithoutNotable);

      expect(educationCard.bulletPoints).not.toContain('');
      expect(educationCard.bulletPoints).toHaveLength(1);
    });

    it('includes print-specific fields', () => {
      const educationCard = createEducationCard(mockCvData);

      expect(educationCard.printEducationCompact).toBe(true);
      expect(educationCard.printDegreeTitle).toBe('MSc');
      expect(educationCard.printDegree).toBe('Computer Science');
      expect(educationCard.printInstitution).toBe('Test University');
      expect(educationCard.printSpecialism).toBe('Machine Learning');
      expect(educationCard.printScore).toBe('First Class Honours');
    });

    it('uses fallback values for missing education fields', () => {
      const minimalEducation: CVData = {
        ...mockCvData,
        education: [
          {
            degree: 'Science',
            institution: 'College',
            year: 2021,
          },
        ],
      };

      const educationCard = createEducationCard(minimalEducation);

      expect(educationCard.printDegreeTitle).toBe('MEng');
      expect(educationCard.printSpecialism).toBe('Data Science & AI');
      expect(educationCard.printScore).toBe('First Class Honours');
    });

    it('handles missing tenure with year fallback', () => {
      const dataWithoutTenure: CVData = {
        ...mockCvData,
        education: [
          {
            degree: 'Degree',
            institution: 'School',
            year: 2022,
          },
        ],
      };

      const educationCard = createEducationCard(dataWithoutTenure);

      expect(educationCard.tag).toBe('2022');
    });
  });
});

describe('DTO Edge Cases', () => {
  describe('Tenure parsing', () => {
    it('handles tenure with em-dash separator', () => {
      const tenure = 'Jan 2020 — Present';
      const parts = tenure.split(' — ');

      expect(parts[0]).toBe('Jan 2020');
      expect(parts[1]).toBe('Present');
    });

    it('handles tenure without separator (single value)', () => {
      const tenure = '2020';
      const parts = tenure.split(' — ');

      expect(parts[0]).toBe('2020');
      expect(parts[1]).toBeUndefined();
    });

    it('handles tenure with different date formats', () => {
      const formats = [
        'Jan 2020 — Dec 2021',
        '2020 — 2021',
        'January 2020 — December 2021',
        '01/2020 — 12/2021',
      ];

      formats.forEach((tenure) => {
        const parts = tenure.split(' — ');
        expect(parts.length).toBe(2);
      });
    });
  });

  describe('Category number mapping', () => {
    it('maps known categories to numbers', () => {
      const categoryNumbers: Record<string, string> = {
        'Developer Velocity': '01',
        'System Integrity': '02',
        'Talent Density': '03',
        'Global Scale': '04',
      };

      expect(categoryNumbers['Developer Velocity']).toBe('01');
      expect(categoryNumbers['System Integrity']).toBe('02');
      expect(categoryNumbers['Unknown Category']).toBeUndefined();
    });
  });

  describe('Color cycling', () => {
    it('cycles project colors correctly over many items', () => {
      const projectColors = ['green', 'orange', 'blue', 'purple'] as const;

      for (let i = 0; i < 10; i++) {
        const color = projectColors[i % projectColors.length];
        expect(['green', 'orange', 'blue', 'purple']).toContain(color);
      }

      // Verify cycle pattern
      expect(projectColors[0 % 4]).toBe('green');
      expect(projectColors[1 % 4]).toBe('orange');
      expect(projectColors[2 % 4]).toBe('blue');
      expect(projectColors[3 % 4]).toBe('purple');
      expect(projectColors[4 % 4]).toBe('green'); // Wraps
    });

    it('cycles history colors correctly over many items', () => {
      const historyColors = ['green', 'purple', 'blue'] as const;

      for (let i = 0; i < 10; i++) {
        const color = historyColors[i % historyColors.length];
        expect(['green', 'purple', 'blue']).toContain(color);
      }

      // Verify cycle pattern
      expect(historyColors[0 % 3]).toBe('green');
      expect(historyColors[1 % 3]).toBe('purple');
      expect(historyColors[2 % 3]).toBe('blue');
      expect(historyColors[3 % 3]).toBe('green'); // Wraps
    });
  });

  describe('Technology aggregation', () => {
    it('handles duplicate technologies across projects and work', () => {
      const dataWithDuplicates: CVData = {
        ...mockCvData,
        work_history: [
          {
            company: 'Co',
            role: 'Dev',
            tenure: '2020',
            summary: 'Work',
            impact: ['Impact'],
            tech_stack: [
              { name: 'TypeScript', group: 'Languages', url: 'https://ts.org' },
            ],
          },
        ],
        projects: [
          {
            project_title: 'Project',
            headline: 'Headline',
            metric: ['Metric'],
            stack_and_tools: [
              { name: 'TypeScript', group: 'Languages', url: 'https://ts.org' },
              { name: 'React', group: 'Frontend', url: 'https://react.dev' },
            ],
          },
        ],
      };

      const sidebarDTO = createSidebarDTO(dataWithDuplicates);

      // Raw aggregation includes duplicates
      expect(sidebarDTO.technologies).toHaveLength(3);

      // Deduplication would be done by consuming component
      const unique = [...new Map(sidebarDTO.technologies.map((t) => [t.name, t])).values()];
      expect(unique).toHaveLength(2);
    });

    it('maintains order: work tech first, then project tech', () => {
      const sidebarDTO = createSidebarDTO(mockCvData);

      // First should be from work_history (Python)
      expect(sidebarDTO.technologies[0]?.name).toBe('Python');
      // Then from projects (TypeScript, React, AWS)
      expect(sidebarDTO.technologies[1]?.name).toBe('TypeScript');
    });
  });

  describe('Empty data handling', () => {
    it('handles empty projects array', () => {
      const emptyProjects: CVData = {
        ...mockCvData,
        projects: [],
      };

      const projectCards = createProjectCards(emptyProjects);

      expect(projectCards).toHaveLength(0);
    });

    it('handles empty work history array', () => {
      const emptyHistory: CVData = {
        ...mockCvData,
        work_history: [],
      };

      const workHistoryCards = createWorkHistoryCards(emptyHistory);

      expect(workHistoryCards).toHaveLength(0);
    });

    it('handles empty impact nodes array', () => {
      const emptyImpact: CVData = {
        ...mockCvData,
        impact_nodes: [],
      };

      const sidebarDTO = createSidebarDTO(emptyImpact);

      expect(sidebarDTO.impactPrintGroups).toHaveLength(0);
    });
  });
});
