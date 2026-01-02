import { describe, it, expect } from 'vitest';
import { getByRole, getByText } from '@testing-library/dom';
import { JSDOM } from 'jsdom';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Helper to extract CSS property values from a style block
 * Returns the value for a given property within a specific selector block
 */
function extractCSSValue(css: string, selector: string, property: string): string | null {
  // Strip CSS comments first
  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Match the selector and its block
  const selectorRegex = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`,
    's'
  );
  const match = cssNoComments.match(selectorRegex);
  const block = match?.[1];
  if (!block) return null;

  // Extract the property value
  const propRegex = new RegExp(`${property}\\s*:\\s*([^;]+);`);
  const propMatch = block.match(propRegex);
  return propMatch?.[1]?.trim() ?? null;
}

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

    // Main landmark
    const main = getByRole(container, 'main');
    expect(main).not.toBeNull();

    // Skip link for accessibility
    expect(document.querySelector('a[href="#main-content"]')).not.toBeNull();

    // Section headings (SCREAMING_SNAKE_CASE in section-title-text spans)
    expect(getByText(container, 'PROFILE')).not.toBeNull();
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

    // Extract the style block
    const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
    expect(styleMatch).not.toBeNull();
    const css = styleMatch?.[1];
    if (!css) return;

    // The section-with-label should define and use --section-rule-spacing
    const marginTop = extractCSSValue(css, '.section-with-label', 'margin-top');
    expect(marginTop).not.toBeNull();
    expect(marginTop).toBe('var(--section-rule-spacing)');

    // Verify the spacing variable is defined
    expect(css).toContain('--section-rule-spacing');
  });

  it('ContentCard list items have symmetric padding', () => {
    // Verify that content list items in index.astro use symmetric pt/pb classes
    const indexPath = join(srcPath, 'pages', 'index.astro');
    const content = readFileSync(indexPath, 'utf-8');

    // Check for consistent pt-fluid and pb-fluid values on list items
    const ptMatches = content.match(/pt-fluid-(\w+)/g);
    const pbMatches = content.match(/pb-fluid-(\w+)/g);

    expect(ptMatches).not.toBeNull();
    expect(pbMatches).not.toBeNull();

    // Extract the size values (sm, md, lg, etc.)
    const ptSizes = ptMatches?.map((m) => m.replace('pt-fluid-', '')) ?? [];
    const pbSizes = pbMatches?.map((m) => m.replace('pb-fluid-', '')) ?? [];

    // All pt values should match their corresponding pb values
    expect(ptSizes.length).toBeGreaterThan(0);
    expect(ptSizes).toEqual(pbSizes);
  });

  it('Section grid children align to top', () => {
    const sectionPath = join(srcPath, 'components', 'ui', 'Section.astro');
    const content = readFileSync(sectionPath, 'utf-8');

    const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
    expect(styleMatch).not.toBeNull();
    const css = styleMatch?.[1];
    if (!css) return;

    // Both .section-label and .section-content should use align-self: start
    // to ensure grid children align to top (simple substring check since
    // there are multiple selector blocks with different specificity)
    expect(css).toMatch(/\.section-label\s*\{[^}]*align-self:\s*start/);
    expect(css).toMatch(/\.section-content\s*\{[^}]*align-self:\s*start/);
  });
});
