# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PsychAssess — a psychological assessment scoring platform. Psychologists define tests with scoring rules, register patients, administer assessments, and get automated score calculations with interpretive labels. Uses Claude AI to generate scoring rule sets from uploaded test manuals/norm tables.

## Commands

- `npm run dev` — start dev server (Next.js on localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run test` — run tests once (vitest)
- `npm run test:watch` — run tests in watch mode
- `npx vitest run src/lib/__tests__/scoring-engine.test.ts` — run a single test file
- `npx prisma generate` — regenerate Prisma client after schema changes
- `npx prisma migrate dev` — create/apply database migrations
- `npx prisma db push` — push schema to DB without migrations (dev only)

## Architecture

**Next.js 14 App Router** with TypeScript, Tailwind CSS, PostgreSQL via Prisma.

### Core Domain: Scoring Engine

The scoring engine (`src/lib/scoring-engine.ts`) is the heart of the app. It executes a `ScoringRuleSet` — a JSON pipeline of steps that transform raw test inputs into scored results:

- **lookup_table** — maps raw scores to standard scores via a table, optionally filtered by conditions (age group, gender, respondent type)
- **formula** — evaluates math expressions (via `mathjs`) with variables referencing inputs or prior step outputs
- **threshold** — maps numeric scores to interpretive labels (e.g., "Average", "Below Average")
- **mapping** — maps discrete input values to output values

Steps execute in order; later steps can reference outputs from earlier steps. Conditions are resolved from patient context (age, gender) to select the correct norm tables.

All types and Zod schemas live in `src/lib/types/scoring-rules.ts`, re-exported from `src/lib/types/index.ts`.

### AI Rule Generation

`src/lib/ai/generate-rules.ts` sends test descriptions and uploaded documents (PDFs, images) to Claude to auto-generate scoring rule sets. The response is validated against Zod schemas before saving.

### Data Model (Prisma)

Three models in `prisma/schema.prisma`:
- **Test** — defines a psychological test with its scoring rules (JSON), inputs, and outputs
- **Patient** — patient demographics
- **Assessment** — links a patient to a test with input scores and computed results

### API Routes

All under `src/app/api/`:
- `tests/` — CRUD for tests
- `tests/generate-rules/` — AI-powered rule generation
- `patients/` — CRUD for patients
- `patients/[patientId]/assessments/` — create/manage assessments
- `patients/[patientId]/export/` — PDF export
- `scoring/` — standalone scoring endpoint (accepts ruleSet + inputs + context, returns results)

### UI Layer

- Layout: sidebar navigation + header (`src/components/layout/`)
- UI primitives: shadcn/ui components in `src/components/ui/` (using `class-variance-authority`, `tailwind-merge`, `clsx`)
- Feature components: `src/components/tests/` (test builder, rule editor), `src/components/patients/` (patient forms, assessment entry), `src/components/results/` (score display, interpretation badges)
- PDF generation: `src/lib/pdf/report-generator.tsx` using `@react-pdf/renderer`

### Key Hooks

- `useTestBuilder` (`src/hooks/useTestBuilder.ts`) — manages test creation/editing state
- `useScoring` (`src/hooks/useScoring.ts`) — client-side score preview

## Tech Stack

- Next.js 14, React 18, TypeScript
- Tailwind CSS + shadcn/ui components
- Prisma with PostgreSQL (via `@prisma/adapter-pg`)
- Zod for validation
- `mathjs` for formula evaluation in scoring engine
- `@anthropic-ai/sdk` for AI rule generation
- `@react-pdf/renderer` for PDF export
- Vitest for testing
- Path alias: `@/*` maps to `./src/*`

## Environment

Requires `DATABASE_URL` (PostgreSQL connection string) and `ANTHROPIC_API_KEY` in `.env`.
