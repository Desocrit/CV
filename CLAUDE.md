# 1. Project Intent

This repository serves as a high-fidelity digital representation of my professional history. The objective is to leverage modern web technologies to create a performant, accessible, and semantically rich document system that functions equally well as a web application and a printed asset.

# 2. Core Pillars

## Engineering Excellence

**Zero-Waste Architecture:** Leverage Astro's "Islands" to ensure zero client-side JavaScript by default. Interactivity must be justified by user experience.

**Edge-First:** Deployments utilize Vercel Edge Functions to ensure global low-latency delivery.

**Type Safety:** Absolute adherence to TypeScript. No any types; all interfaces must accurately reflect the underlying data models.

## Accessibility as a Baseline

**Compliance:** Target WCAG 2.1 AAA standards.

**Semantics:** Use the correct HTML element for the job. ARIA should be used to enhance, not to fix broken structural logic.

**Navigation:** Ensure full keyboard navigability and logical focus management.

## Typography & Design Rigour

**Fluid Systems:** Use mathematical scaling for typography and spacing (e.g., clamp() functions) rather than arbitrary breakpoints.

**Print Fidelity:** The @media print layer is not an afterthought. It is a primary output target. Layouts must be designed to avoid orphans/widows and ensure logical page breaks.

# 3. Implementation Specifics

**Structured Data:** The JSON-LD (Schema.org) implementation must be exhaustive. The document should be as legible to a machine (crawlers/LLMs) as it is to a human.

**Data Integrity:** The CV content is treated as the "Source of Truth." Any /api endpoints must serve this data with 1:1 parity to the visual representation.

**Metadata:** Comprehensive OpenGraph and Meta-tagging strategy to ensure consistent branding across all sharing platforms.
