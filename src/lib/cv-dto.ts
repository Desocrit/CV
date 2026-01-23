/**
 * CV Data Transfer Objects
 *
 * Pre-built, transformed data objects for each component.
 * Imports from cv-data.ts (single parse) and exports shaped DTOs.
 */

import { cvData, type TechTag } from './cv-data';

// ===== HELPERS =====

/**
 * Filter out TODO placeholder tech tags and limit to display count.
 * TODO items are used as placeholders during content development.
 */
function filterDisplayTechnologies(technologies: TechTag[], limit = 4): TechTag[] {
  return technologies.filter((t) => !t.name.startsWith('TODO')).slice(0, limit);
}

// ===== DATE UTILITIES =====

/**
 * Valid month abbreviations for tenure parsing
 */
const VALID_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Map of month abbreviations to ISO 8601 month numbers.
 */
const monthMap: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

/**
 * Regex pattern for tenure format validation
 * Matches: "MMM YYYY — Present" or "MMM YYYY — MMM YYYY"
 * Examples: "Jan 2020 — Present", "Mar 2018 — Dec 2023"
 */
const TENURE_REGEX =
  /^([A-Z][a-z]{2})\s+(\d{4})\s*—\s*(Present|([A-Z][a-z]{2})\s+(\d{4}))$/;

interface ParsedTenure {
  startDate: string;
  endDate: string | undefined;
  isValid: boolean;
}

/**
 * Parses and validates a tenure string into start and end dates.
 *
 * Expected formats:
 * - "MMM YYYY — Present" (e.g., "Jan 2020 — Present")
 * - "MMM YYYY — MMM YYYY" (e.g., "Mar 2018 — Dec 2023")
 *
 * @param tenure - The tenure string to parse
 * @param context - Optional context for warning messages (e.g., company name)
 * @returns Parsed tenure with startDate, endDate, and validity flag
 */
function parseTenure(tenure: string, context?: string): ParsedTenure {
  const trimmed = tenure.trim();

  // Quick validation: check for em-dash separator
  if (!trimmed.includes('—')) {
    console.warn(
      `[cv-dto] Invalid tenure format${context ? ` for ${context}` : ''}: ` +
        `expected "MMM YYYY — Present" or "MMM YYYY — MMM YYYY", got "${tenure}"`
    );
    return {
      startDate: trimmed,
      endDate: undefined,
      isValid: false,
    };
  }

  const match = trimmed.match(TENURE_REGEX);

  if (!match) {
    console.warn(
      `[cv-dto] Tenure format mismatch${context ? ` for ${context}` : ''}: ` +
        `"${tenure}" does not match pattern "MMM YYYY — Present" or "MMM YYYY — MMM YYYY"`
    );
    // Fallback: split by em-dash and return parts as-is
    const parts = trimmed.split('—').map((p) => p.trim());
    return {
      startDate: parts[0] ?? trimmed,
      endDate: parts[1] || undefined,
      isValid: false,
    };
  }

  const [, startMonth, startYear, endPart] = match;

  // Validate month is a real month abbreviation
  if (!VALID_MONTHS.includes(startMonth as (typeof VALID_MONTHS)[number])) {
    console.warn(
      `[cv-dto] Invalid start month "${startMonth}"${context ? ` for ${context}` : ''}: ` +
        `expected one of ${VALID_MONTHS.join(', ')}`
    );
  }

  // Validate year is reasonable (1950-2100)
  const startYearNum = parseInt(startYear ?? '0', 10);
  if (startYearNum < 1950 || startYearNum > 2100) {
    console.warn(
      `[cv-dto] Unusual start year ${startYear}${context ? ` for ${context}` : ''}: ` +
        `expected between 1950 and 2100`
    );
  }

  const startDate = `${startMonth} ${startYear}`;

  // Handle "Present" case
  if (endPart === 'Present') {
    return {
      startDate,
      endDate: undefined,
      isValid: true,
    };
  }

  // Extract end month and year from the match groups
  const endMonth = match[4];
  const endYear = match[5];

  // Validate end month
  if (endMonth && !VALID_MONTHS.includes(endMonth as (typeof VALID_MONTHS)[number])) {
    console.warn(
      `[cv-dto] Invalid end month "${endMonth}"${context ? ` for ${context}` : ''}: ` +
        `expected one of ${VALID_MONTHS.join(', ')}`
    );
  }

  // Validate end year
  if (endYear) {
    const endYearNum = parseInt(endYear, 10);
    if (endYearNum < 1950 || endYearNum > 2100) {
      console.warn(
        `[cv-dto] Unusual end year ${endYear}${context ? ` for ${context}` : ''}: ` +
          `expected between 1950 and 2100`
      );
    }
    // Check that end date is not before start date
    if (endYearNum < startYearNum) {
      console.warn(
        `[cv-dto] End date before start date${context ? ` for ${context}` : ''}: ` +
          `${endMonth} ${endYear} is before ${startMonth} ${startYear}`
      );
    }
  }

  return {
    startDate,
    endDate: endMonth && endYear ? `${endMonth} ${endYear}` : undefined,
    isValid: true,
  };
}

/**
 * Converts a human-readable date string like "Feb 2021" to ISO 8601 format "2021-02".
 * Returns undefined for "Present" or invalid formats.
 *
 * @param dateStr - A date string in "Mon YYYY" format (e.g., "Feb 2021") or "Present"
 * @returns ISO 8601 year-month string (e.g., "2021-02") or undefined
 */
export function toISO8601YearMonth(dateStr: string | undefined): string | undefined {
  if (!dateStr || dateStr === 'Present') {
    return undefined;
  }

  const parts = dateStr.trim().split(' ');
  if (parts.length !== 2) {
    return undefined;
  }

  const [month, year] = parts;
  const monthNum = month ? monthMap[month] : undefined;

  if (!monthNum || !year || !/^\d{4}$/.test(year)) {
    return undefined;
  }

  return `${year}-${monthNum}`;
}

// ===== LAYOUT DTO =====
export const layoutDTO = {
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
  ],
  workExperiences: cvData.work_history.map((exp) => {
    const parsed = parseTenure(exp.tenure, exp.company);
    return {
      company: exp.company,
      role: exp.role,
      // Human-readable dates for display
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      // ISO 8601 dates for Schema.org structured data
      startDateISO: toISO8601YearMonth(parsed.startDate),
      endDateISO: toISO8601YearMonth(parsed.endDate),
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
// Group impact nodes by header, preserving encounter order
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

// Convert to array of groups with subheadings, generating category numbers dynamically
const impactPrintGroups = Object.entries(groupedImpact).map(([, group], index) => ({
  subheading: `${String(index + 1).padStart(2, '0')} / ${group.shortHeader}`,
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
  technologies: filterDisplayTechnologies(project.stack_and_tools),
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
  technologies: filterDisplayTechnologies(job.tech_stack),
  headline: job.summary,
  bulletPoints: job.impact,
  supportingData: job.supporting_data,
  metaWidth: 'wide' as const,
  accentColor: historyAccentColors[index % historyAccentColors.length],
  printStackMeta: true,
  printBulletCount: printBulletCounts[Math.min(index, 2)],
}));

// ===== EDUCATION DTO =====
function buildEducationCard() {
  const edu = cvData.education.at(0);
  if (!edu) {
    throw new Error('CV data must include at least one education entry');
  }

  return {
    title: edu.degree,
    tag: edu.tenure ?? String(edu.year),
    label: edu.institution,
    technologies: [] as TechTag[],
    headline: `${edu.score_long ?? 'Degree'} from ${edu.institution}.`,
    bulletPoints: [
      edu.specialism ? `Masters of Engineering in ${edu.specialism}` : '',
      edu.notable ?? '',
    ].filter(Boolean),
    metaWidth: 'wide' as const,
    accentColor: 'green' as const,
    printStackMeta: true,
    // Compact print format data
    printEducationCompact: true,
    printDegreeTitle: edu.degree_title ?? 'MEng',
    printDegree: edu.degree,
    printInstitution: edu.institution,
    printTenure: edu.tenure ?? `Sep 2011 — Jul ${edu.year}`,
    printSpecialism: edu.specialism ?? 'Data Science & AI',
    printScore: edu.score_long ?? 'First Class Honours',
  };
}

export const educationCard = buildEducationCard();
