/**
 * CV Data Transfer Objects
 *
 * Pre-built, transformed data objects for each component.
 * Imports from cv-data.ts (single parse) and exports shaped DTOs.
 */

import { cvData, type TechTag } from './cv-data';

// ===== LAYOUT DTO =====
export const layoutDTO = {
  title: `${cvData.name} - CV`,
  description: `Professional CV for ${cvData.name}, ${cvData.role} based in ${cvData.location}.`,
  name: cvData.name,
  jobTitle: cvData.role,
  email: cvData.email,
  location: cvData.location,
  website: cvData.website,
  socialLinks: [
    { platform: 'LinkedIn' as const, url: cvData.linkedin },
    { platform: 'GitHub' as const, url: cvData.github },
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

// ===== SIDEBAR DTO =====
const allTechnologies: TechTag[] = [
  ...cvData.work_history.flatMap((job) => job.tech_stack),
  ...cvData.projects.flatMap((project) => project.stack_and_tools),
];

// Transform impact nodes to grouped format with subheadings for print rendering
const categoryNumbers: Record<string, string> = {
  'Developer Velocity': '01',
  'System Integrity': '02',
  'Talent Density': '03',
  'Global Scale': '04',
};

// Group impact nodes by header
const groupedImpact = cvData.impact_nodes.reduce<
  Record<string, { shortHeader: string; items: typeof cvData.impact_nodes }>
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

// Convert to array of groups with subheadings
const impactPrintGroups = Object.entries(groupedImpact).map(([header, group]) => ({
  subheading: `${categoryNumbers[header] ?? '00'} / ${group.shortHeader}`,
  items: group.items.map((node) => ({
    metric: node.metric_label ?? node.title,
    headline: node.metric_value ?? '',
    description: node.description,
  })),
}));

export const sidebarDTO = {
  name: cvData.name,
  role: cvData.role,
  email: cvData.email,
  phone: cvData.phone,
  location: cvData.location,
  linkedin: cvData.linkedin,
  github: cvData.github,
  profile: cvData.summary,
  achievements: cvData.outlier_achievements,
  /** Impact nodes grouped by category with subheadings for print */
  impactPrintGroups,
  technologies: allTechnologies,
};

// ===== IMPACT GRID DTO =====
export const impactGridDTO = {
  nodes: cvData.impact_nodes,
};

// ===== PROJECTS DTO =====
// Color cycle: green → orange → blue → purple
const projectAccentColors = ['green', 'orange', 'blue', 'purple'] as const;

export const projectCards = cvData.projects.slice(0, 4).map((project, index) => ({
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

// ===== WORK HISTORY DTO =====
// Color cycle: green → purple → blue
const historyAccentColors = ['green', 'purple', 'blue'] as const;

// Print bullet counts: 1st item = 2, 2nd/3rd = 0
const printBulletCounts = [3, 0, 0] as const;

export const workHistoryCards = cvData.work_history.map((job, index) => ({
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

// ===== EDUCATION DTO =====
const edu = cvData.education[0];
export const educationCard = {
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
  // Compact print format data
  printEducationCompact: true,
  printDegreeTitle: edu?.degree_title ?? 'MEng',
  printDegree: edu?.degree ?? 'Computer Science',
  printInstitution: edu?.institution ?? 'Southampton University',
  printTenure: edu?.tenure ?? `Sep 2011 — Jul ${edu?.year}`,
  printSpecialism: edu?.specialism ?? 'Data Science & AI',
  printScore: edu?.score_long ?? 'First Class Honours',
};
