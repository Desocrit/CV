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
  const distPath = join(process.cwd(), 'dist', 'index.html');

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

    // Section headings (formatted as // SCREAMING_SNAKE_CASE)
    expect(getByText(container, /\/\/ PROFILE/)).not.toBeNull();
    expect(getByText(container, /\/\/ EXPERIENCE/)).not.toBeNull();
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

  it('Section.astro has symmetric spacing around horizontal rule', () => {
    const sectionPath = join(srcPath, 'components', 'ui', 'Section.astro');
    const content = readFileSync(sectionPath, 'utf-8');

    // Extract the style block
    const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
    expect(styleMatch).not.toBeNull();
    const css = styleMatch?.[1];
    if (!css) return;

    // Both margin-top and padding-top should use the same CSS variable
    const marginTop = extractCSSValue(css, '.section-with-label', 'margin-top');
    const paddingTop = extractCSSValue(css, '.section-with-label', 'padding-top');

    expect(marginTop).not.toBeNull();
    expect(paddingTop).not.toBeNull();

    // Both should reference the same spacing variable for symmetry
    expect(marginTop).toBe('var(--section-rule-spacing)');
    expect(paddingTop).toBe('var(--section-rule-spacing)');
  });

  it('TimelineEntry.astro has symmetric spacing around horizontal rule', () => {
    const entryPath = join(srcPath, 'components', 'cv', 'TimelineEntry.astro');
    const content = readFileSync(entryPath, 'utf-8');

    // Check the li element classes for pt and pb values
    const liMatch = content.match(/<li[^>]*class="([^"]+)"[^>]*>/);
    expect(liMatch).not.toBeNull();
    const classes = liMatch?.[1];
    if (!classes) return;

    // Extract pt-fluid-* and pb-fluid-* values
    const ptMatch = classes.match(/pt-fluid-(\w+)/);
    const pbMatch = classes.match(/pb-fluid-(\w+)/);

    expect(ptMatch).not.toBeNull();
    expect(pbMatch).not.toBeNull();
    if (!ptMatch || !pbMatch) return;

    // Both padding values should be equal for symmetric spacing
    expect(ptMatch[1]).toBe(pbMatch[1]);
  });

  it('Section grid aligns title with content top', () => {
    const sectionPath = join(srcPath, 'components', 'ui', 'Section.astro');
    const content = readFileSync(sectionPath, 'utf-8');

    const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
    expect(styleMatch).not.toBeNull();
    const css = styleMatch?.[1];
    if (!css) return;

    const alignItems = extractCSSValue(css, '.section-grid', 'align-items');
    expect(alignItems).toBe('start');
  });
});
