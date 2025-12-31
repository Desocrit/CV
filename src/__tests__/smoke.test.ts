import { describe, it, expect } from 'vitest';
import { getByRole, getByText } from '@testing-library/dom';
import { JSDOM } from 'jsdom';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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

    // Section headings (formatted as SCREAMING_SNAKE_CASE)
    expect(getByText(container, 'WORK_HISTORY')).not.toBeNull();
    expect(getByText(container, 'FLAGSHIP_PROJECTS')).not.toBeNull();
  });

  it('contains accessible print button', () => {
    const html = readFileSync(distPath, 'utf-8');
    const dom = new JSDOM(html);
    const { document } = dom.window;

    const printBtn = document.querySelector('button[aria-label="Print CV to PDF"]');
    expect(printBtn).not.toBeNull();
  });
});
