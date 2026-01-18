import { describe, it, expect } from 'vitest';
import { getAllByRole, getByText } from '@testing-library/dom';
import { JSDOM } from 'jsdom';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('Build Output Smoke Tests', () => {
  // Vercel adapter outputs to .vercel/output/static
  const distPath = join(process.cwd(), '.vercel', 'output', 'static', 'index.html');

  it('build output exists', () => {
    expect(existsSync(distPath)).toBe(true);
  });

  it('renders valid HTML document', () => {
    const html = readFileSync(distPath, 'utf-8');
    const dom = new JSDOM(html);
    const { document } = dom.window;

    // Document structure
    expect(document.documentElement.lang).toBe('en');
    expect(document.querySelector('head')).not.toBeNull();
    expect(document.querySelector('body')).not.toBeNull();
  });

  it('contains required meta tags', () => {
    const html = readFileSync(distPath, 'utf-8');
    const dom = new JSDOM(html);
    const { document } = dom.window;

    // Required meta tags
    expect(document.querySelector('meta[charset]')).not.toBeNull();
    expect(document.querySelector('meta[name="viewport"]')).not.toBeNull();
    expect(document.querySelector('meta[name="description"]')).not.toBeNull();
    expect(document.querySelector('title')?.textContent).toBeTruthy();
  });

  it('contains JSON-LD structured data', () => {
    const html = readFileSync(distPath, 'utf-8');
    const dom = new JSDOM(html);
    const { document } = dom.window;

    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    expect(jsonLd).not.toBeNull();

    const data = JSON.parse(jsonLd?.textContent ?? '{}') as Record<string, unknown>;
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('Person');
  });

  it('renders main content sections', () => {
    const html = readFileSync(distPath, 'utf-8');
    const dom = new JSDOM(html);
    const { document } = dom.window;
    const container = document.body;

    // Main landmark (note: current structure has nested mains - testing at least one exists)
    const mains = getAllByRole(container, 'main');
    expect(mains.length).toBeGreaterThan(0);

    // Skip link for accessibility
    expect(document.querySelector('a[href="#main-content"]')).not.toBeNull();

    // Section headings (SCREAMING_SNAKE_CASE in section-title-text spans)
    expect(getByText(container, 'PROJECTS')).not.toBeNull();
    expect(getByText(container, 'HISTORY')).not.toBeNull();
  });

  it('contains print button', () => {
    const html = readFileSync(distPath, 'utf-8');
    const dom = new JSDOM(html);
    const { document } = dom.window;

    // Print button uses onclick="window.print()"
    const printBtn = document.querySelector('button[onclick="window.print()"]');
    expect(printBtn).not.toBeNull();
  });
});

describe('CSS Spacing Consistency Tests', () => {
  const srcPath = join(process.cwd(), 'src');

  it('Section.astro uses consistent spacing variable', () => {
    const sectionPath = join(srcPath, 'components', 'ui', 'Section.astro');
    const content = readFileSync(sectionPath, 'utf-8');

    // Section uses fluid spacing variable via Tailwind arbitrary value class
    expect(content).toContain('my-[var(--spacing-fluid-sm)]');
  });

  it('ListItem component has symmetric padding', () => {
    // Verify that ListItem component uses symmetric padding-top/padding-bottom
    const listItemPath = join(srcPath, 'components', 'layout', 'ListItem.astro');
    const content = readFileSync(listItemPath, 'utf-8');

    // ListItem uses Tailwind arbitrary value class for symmetric padding
    // py-[var(--spacing-fluid-sm)] sets both padding-top and padding-bottom
    expect(content).toContain('py-[var(--spacing-fluid-sm)]');
  });

  it('Section grid children align to top via Tailwind', () => {
    const sectionPath = join(srcPath, 'components', 'ui', 'Section.astro');
    const content = readFileSync(sectionPath, 'utf-8');

    // Section uses Tailwind utility for grid alignment at xl breakpoint
    // xl:self-start aligns the header to top of grid cell
    expect(content).toContain('xl:self-start');
  });
});
