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
};

// ===== SIDEBAR DTO =====
const allTechnologies: TechTag[] = [
  ...cvData.work_history.flatMap((job) => job.tech_stack),
  ...cvData.projects.flatMap((project) => project.stack_and_tools),
];

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
  education: {
    degree: cvData.education[0]?.degree ?? '',
    degree_title: cvData.education[0]?.degree_title ?? '',
    score_short: cvData.education[0]?.score_short ?? '',
    specialism: cvData.education[0]?.specialism ?? '',
    institution: cvData.education[0]?.institution ?? '',
    year: cvData.education[0]?.year ?? 0,
  },
  technologies: allTechnologies,
};

// ===== IMPACT GRID DTO =====
export const impactGridDTO = {
  nodes: cvData.impact_nodes,
};

// ===== PROJECTS DTO =====
export const projectCards = cvData.projects.slice(0, 4).map((project) => ({
  title: project.project_title,
  tag: project.subtitle,
  technologies: project.stack_and_tools,
  headline: project.headline,
  bulletPoints: project.metric,
  supportingData: project.action,
  cta: project.cta,
  prompt: project.prompt,
  useTerminal: true,
}));

// ===== WORK HISTORY DTO =====
export const workHistoryCards = cvData.work_history.map((job) => ({
  title: job.role,
  tag: job.tenure,
  label: job.company,
  technologies: job.tech_stack,
  headline: job.summary,
  bulletPoints: job.impact,
  supportingData: job.supporting_data,
}));

// ===== EDUCATION DTO =====
export const educationCard = {
  title: cvData.education[0]?.degree ?? 'Computer Science',
  tag: cvData.education[0]?.tenure ?? String(cvData.education[0]?.year),
  label: cvData.education[0]?.institution,
  technologies: [] as TechTag[],
  headline: `${cvData.education[0]?.score_long} from the University of Southampton.`,
  bulletPoints: [
    `Masters of Engineering in ${cvData.education[0]?.specialism}`,
    cvData.education[0]?.notable ?? '',
  ].filter(Boolean),
};
