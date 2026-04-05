# PsychAssess Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web platform for educational psychologists to automate scoring and interpretation of psychological assessments using AI-generated deterministic rules.

**Architecture:** Next.js 14 App Router with three layers — pages/API routes, service layer (scoring engine, AI, PDF), and PostgreSQL via Prisma. Tests are configured once with Claude AI, then scored deterministically at runtime. Results persist on submit.

**Tech Stack:** Next.js 14, TypeScript strict, PostgreSQL, Prisma, Tailwind CSS, shadcn/ui, @anthropic-ai/sdk, @react-pdf/renderer, mathjs, zod, Vitest

---

## File Map

### Infrastructure
- `package.json` — dependencies and scripts
- `tsconfig.json` — TypeScript strict config
- `next.config.ts` — Next.js config
- `tailwind.config.ts` — Tailwind config
- `postcss.config.js` — PostCSS for Tailwind
- `.env.local.example` — environment template
- `prisma/schema.prisma` — database schema
- `vitest.config.ts` — test runner config

### Type System
- `src/lib/types/scoring-rules.ts` — InputDefinition, OutputDefinition, ScoringRuleSet, ScoringStep types + zod schemas
- `src/lib/types/index.ts` — shared app types (Patient, Test, Assessment DTOs)

### Service Layer
- `src/lib/db.ts` — Prisma client singleton
- `src/lib/scoring-engine.ts` — pure deterministic scoring function
- `src/lib/ai/generate-rules.ts` — Claude API integration for rule generation
- `src/lib/ai/parse-document.ts` — file reading + base64 encoding helpers
- `src/lib/pdf/report-generator.tsx` — PDF document component
- `src/lib/validations/test.ts` — zod schemas for test API
- `src/lib/validations/patient.ts` — zod schemas for patient API
- `src/lib/validations/assessment.ts` — zod schemas for assessment API

### API Routes
- `src/app/api/tests/route.ts` — GET all, POST new test
- `src/app/api/tests/[testId]/route.ts` — GET, PUT, DELETE test
- `src/app/api/tests/generate-rules/route.ts` — POST AI rule generation
- `src/app/api/patients/route.ts` — GET all, POST new patient
- `src/app/api/patients/[patientId]/route.ts` — GET, PUT, DELETE patient
- `src/app/api/patients/[patientId]/assessments/route.ts` — GET all, POST new assessment
- `src/app/api/patients/[patientId]/assessments/[assessmentId]/route.ts` — GET, PUT, DELETE assessment
- `src/app/api/patients/[patientId]/export/route.ts` — GET PDF export
- `src/app/api/scoring/route.ts` — POST stateless scoring

### Layout Components
- `src/components/layout/Sidebar.tsx` — sidebar navigation
- `src/components/layout/Header.tsx` — top header bar
- `src/components/layout/Navigation.tsx` — nav links config
- `src/app/layout.tsx` — root layout with sidebar + header

### Pages
- `src/app/page.tsx` — dashboard
- `src/app/tests/page.tsx` — test library list
- `src/app/tests/new/page.tsx` — test builder
- `src/app/tests/[testId]/page.tsx` — view test
- `src/app/tests/[testId]/edit/page.tsx` — edit scoring rules
- `src/app/patients/page.tsx` — patient list
- `src/app/patients/new/page.tsx` — create patient form
- `src/app/patients/[patientId]/page.tsx` — patient card
- `src/app/patients/[patientId]/add-test/page.tsx` — add test to patient

### Feature Components
- `src/components/tests/TestCard.tsx` — test summary card for library
- `src/components/tests/TestBuilder.tsx` — upload + describe + generate UI
- `src/components/tests/RuleEditor.tsx` — edit scoring rules JSON
- `src/components/tests/InputOutputPreview.tsx` — preview inputs/outputs
- `src/components/patients/PatientCard.tsx` — patient info display
- `src/components/patients/PatientForm.tsx` — create/edit patient form
- `src/components/patients/AssessmentEntry.tsx` — enter scores for a test
- `src/components/results/ResultsTable.tsx` — table of all assessment results
- `src/components/results/ScoreDisplay.tsx` — single score with label
- `src/components/results/InterpretationBadge.tsx` — color-coded badge

### Hooks
- `src/hooks/useScoring.ts` — client-side scoring preview
- `src/hooks/useTestBuilder.ts` — test builder state management

### Tests
- `src/lib/__tests__/scoring-engine.test.ts` — scoring engine unit tests

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.env.local.example`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/haym/psy-project
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

This scaffolds the project in the current directory with App Router, TypeScript, Tailwind, and src directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install prisma @prisma/client @anthropic-ai/sdk @react-pdf/renderer mathjs zod
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init -d
```

Accept defaults. This creates `src/components/ui/` and `src/lib/utils.ts`.

- [ ] **Step 4: Install shadcn/ui components**

```bash
npx shadcn@latest add button input label card dialog table badge textarea select separator dropdown-menu sheet tabs toast
```

- [ ] **Step 5: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 6: Add test script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Create environment template**

Create `.env.local.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/psychassess"
ANTHROPIC_API_KEY="sk-ant-..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 8: Enable strict TypeScript**

In `tsconfig.json`, ensure `"strict": true` is set under `compilerOptions`. It should already be there from create-next-app.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with dependencies"
```

---

## Task 2: Prisma Schema + Database Setup

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

- [ ] **Step 2: Write the schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Test {
  id             String   @id @default(cuid())
  name           String
  description    String?  @db.Text
  category       String?
  ageRange       String?

  scoringRules   Json
  inputs         Json
  outputs        Json

  rawDescription String?  @db.Text
  documentUrls   String[]

  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  assessments    Assessment[]
}

model Patient {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  dateOfBirth DateTime
  gender      String
  notes       String?  @db.Text

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  assessments Assessment[]
}

model Assessment {
  id             String   @id @default(cuid())

  patient        Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  patientId      String

  test           Test     @relation(fields: [testId], references: [id])
  testId         String

  inputScores    Json
  results        Json?

  respondentType String?
  assessmentDate DateTime @default(now())
  notes          String?  @db.Text

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([patientId])
  @@index([testId])
}
```

- [ ] **Step 3: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Set up DATABASE_URL**

Create `.env` (if not already present) with your local PostgreSQL connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/psychassess"
```

Adjust credentials to match your local PostgreSQL setup.

- [ ] **Step 5: Create database and run migration**

```bash
npx prisma db push
```

This creates the tables in PostgreSQL. Use `db push` for development — migrations can come later.

- [ ] **Step 6: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma src/lib/db.ts
git commit -m "feat: add Prisma schema with Test, Patient, Assessment models"
```

---

## Task 3: Type System + Zod Schemas

**Files:**
- Create: `src/lib/types/scoring-rules.ts`, `src/lib/types/index.ts`, `src/lib/validations/test.ts`, `src/lib/validations/patient.ts`, `src/lib/validations/assessment.ts`

- [ ] **Step 1: Create scoring rules types and zod schemas**

Create `src/lib/types/scoring-rules.ts`:

```typescript
import { z } from "zod";

export const inputDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  type: z.enum(["number", "integer"]),
  min: z.number().optional(),
  max: z.number().optional(),
  required: z.boolean(),
});

export type InputDefinition = z.infer<typeof inputDefinitionSchema>;

export const outputDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum([
    "standard_score",
    "percentile",
    "interpretation",
    "composite",
    "custom",
  ]),
});

export type OutputDefinition = z.infer<typeof outputDefinitionSchema>;

export const conditionVariableSchema = z.object({
  id: z.string(),
  source: z.enum([
    "patient.age",
    "patient.gender",
    "assessment.respondentType",
    "input",
  ]),
  sourceInputId: z.string().optional(),
});

export type ConditionVariable = z.infer<typeof conditionVariableSchema>;

export const lookupTableStepSchema = z.object({
  type: z.literal("lookup_table"),
  outputId: z.string(),
  inputId: z.string(),
  conditionFilters: z.record(z.string()).optional(),
  table: z.record(z.number()),
});

export type LookupTableStep = z.infer<typeof lookupTableStepSchema>;

export const formulaStepSchema = z.object({
  type: z.literal("formula"),
  outputId: z.string(),
  formula: z.string(),
  variables: z.record(z.string()),
});

export type FormulaStep = z.infer<typeof formulaStepSchema>;

export const thresholdStepSchema = z.object({
  type: z.literal("threshold"),
  outputId: z.string(),
  sourceOutputId: z.string(),
  thresholds: z.array(
    z.object({
      min: z.number(),
      max: z.number(),
      label: z.string(),
    })
  ),
});

export type ThresholdStep = z.infer<typeof thresholdStepSchema>;

export const mappingStepSchema = z.object({
  type: z.literal("mapping"),
  outputId: z.string(),
  sourceId: z.string(),
  map: z.record(z.union([z.string(), z.number()])),
});

export type MappingStep = z.infer<typeof mappingStepSchema>;

export const scoringStepSchema = z.discriminatedUnion("type", [
  lookupTableStepSchema,
  formulaStepSchema,
  thresholdStepSchema,
  mappingStepSchema,
]);

export type ScoringStep = z.infer<typeof scoringStepSchema>;

export const scoringRuleSetSchema = z.object({
  version: z.string(),
  description: z.string(),
  conditions: z.array(conditionVariableSchema),
  steps: z.array(scoringStepSchema),
});

export type ScoringRuleSet = z.infer<typeof scoringRuleSetSchema>;

export interface ScoringResult {
  outputId: string;
  label: string;
  value: number | string;
  type: OutputDefinition["type"];
}

export interface ScoringContext {
  age: number;
  gender: string;
  respondentType?: string;
}
```

- [ ] **Step 2: Create shared app types**

Create `src/lib/types/index.ts`:

```typescript
export type {
  InputDefinition,
  OutputDefinition,
  ScoringRuleSet,
  ScoringStep,
  ScoringResult,
  ScoringContext,
  LookupTableStep,
  FormulaStep,
  ThresholdStep,
  MappingStep,
  ConditionVariable,
} from "./scoring-rules";

export {
  inputDefinitionSchema,
  outputDefinitionSchema,
  scoringRuleSetSchema,
  scoringStepSchema,
} from "./scoring-rules";
```

- [ ] **Step 3: Create test validation schemas**

Create `src/lib/validations/test.ts`:

```typescript
import { z } from "zod";
import {
  inputDefinitionSchema,
  outputDefinitionSchema,
  scoringRuleSetSchema,
} from "@/lib/types/scoring-rules";

export const createTestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  ageRange: z.string().optional(),
  scoringRules: scoringRuleSetSchema,
  inputs: z.array(inputDefinitionSchema),
  outputs: z.array(outputDefinitionSchema),
  rawDescription: z.string().optional(),
  documentUrls: z.array(z.string()).default([]),
});

export const updateTestSchema = createTestSchema.partial();
```

- [ ] **Step 4: Create patient validation schemas**

Create `src/lib/validations/patient.ts`:

```typescript
import { z } from "zod";

export const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().transform((s) => new Date(s)),
  gender: z.enum(["male", "female", "other"]),
  notes: z.string().optional(),
});

export const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  notes: z.string().optional(),
});
```

- [ ] **Step 5: Create assessment validation schemas**

Create `src/lib/validations/assessment.ts`:

```typescript
import { z } from "zod";

export const createAssessmentSchema = z.object({
  testId: z.string().min(1),
  inputScores: z.record(z.number()),
  respondentType: z.enum(["self", "parent", "teacher"]).optional(),
  assessmentDate: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  notes: z.string().optional(),
});

export const updateAssessmentSchema = z.object({
  inputScores: z.record(z.number()).optional(),
  respondentType: z.enum(["self", "parent", "teacher"]).optional(),
  notes: z.string().optional(),
});
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/ src/lib/validations/
git commit -m "feat: add type system and zod validation schemas"
```

---

## Task 4: Scoring Engine (TDD)

**Files:**
- Create: `src/lib/scoring-engine.ts`, `src/lib/__tests__/scoring-engine.test.ts`

- [ ] **Step 1: Write failing test — lookup table scoring**

Create `src/lib/__tests__/scoring-engine.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { executeScoring } from "@/lib/scoring-engine";
import { ScoringRuleSet, ScoringContext } from "@/lib/types";

describe("executeScoring", () => {
  it("scores a lookup table step", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test lookup",
      conditions: [],
      steps: [
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          table: { "10": 85, "15": 100, "20": 115 },
        },
      ],
    };

    const inputs = { input_1: 15 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

    expect(results["output_1"]).toEqual({
      outputId: "output_1",
      label: "output_1",
      value: 100,
      type: "custom",
    });
  });

  it("scores a formula step", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test formula",
      conditions: [],
      steps: [
        {
          type: "formula",
          outputId: "output_1",
          formula: "(a + b) / 2 * 15 + 100",
          variables: { a: "input_1", b: "input_2" },
        },
      ],
    };

    const inputs = { input_1: 10, input_2: 12 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

    expect(results["output_1"].value).toBe((10 + 12) / 2 * 15 + 100);
  });

  it("scores a threshold step using a prior output", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test threshold",
      conditions: [],
      steps: [
        {
          type: "lookup_table",
          outputId: "standard_score",
          inputId: "input_1",
          table: { "15": 85 },
        },
        {
          type: "threshold",
          outputId: "interpretation",
          sourceOutputId: "standard_score",
          thresholds: [
            { min: 0, max: 69, label: "Extremely Low" },
            { min: 70, max: 79, label: "Borderline" },
            { min: 80, max: 89, label: "Low Average" },
            { min: 90, max: 109, label: "Average" },
            { min: 110, max: 119, label: "High Average" },
            { min: 120, max: 129, label: "Superior" },
            { min: 130, max: 999, label: "Very Superior" },
          ],
        },
      ],
    };

    const inputs = { input_1: 15 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

    expect(results["standard_score"].value).toBe(85);
    expect(results["interpretation"].value).toBe("Low Average");
  });

  it("scores a mapping step", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test mapping",
      conditions: [],
      steps: [
        {
          type: "mapping",
          outputId: "output_1",
          sourceId: "input_1",
          map: { "1": "Low", "2": "Medium", "3": "High" },
        },
      ],
    };

    const inputs = { input_1: 2 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

    expect(results["output_1"].value).toBe("Medium");
  });

  it("handles condition-filtered lookup tables", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test conditions",
      conditions: [{ id: "age_group", source: "patient.age" }],
      steps: [
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          conditionFilters: { age_group: "6-8" },
          table: { "10": 90 },
        },
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          conditionFilters: { age_group: "9-11" },
          table: { "10": 95 },
        },
      ],
    };

    const inputs = { input_1: 10 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

    expect(results["output_1"].value).toBe(95);
  });

  it("returns error result for missing input", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test missing input",
      conditions: [],
      steps: [
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          table: { "10": 85 },
        },
      ],
    };

    const inputs = {};
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

    expect(results["output_1"].value).toBe("Error: missing input input_1");
  });

  it("handles partial scoring — succeeds for available inputs", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test partial",
      conditions: [],
      steps: [
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          table: { "10": 85 },
        },
        {
          type: "lookup_table",
          outputId: "output_2",
          inputId: "input_2",
          table: { "20": 100 },
        },
      ],
    };

    const inputs = { input_2: 20 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

    expect(results["output_1"].value).toBe("Error: missing input input_1");
    expect(results["output_2"].value).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/scoring-engine.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/scoring-engine'`

- [ ] **Step 3: Implement the scoring engine**

Create `src/lib/scoring-engine.ts`:

```typescript
import { evaluate } from "mathjs";
import {
  ScoringRuleSet,
  ScoringResult,
  ScoringContext,
  ScoringStep,
} from "@/lib/types";

export function executeScoring(
  ruleSet: ScoringRuleSet,
  inputs: Record<string, number>,
  context: ScoringContext
): Record<string, ScoringResult> {
  const results: Record<string, ScoringResult> = {};
  const resolvedConditions = resolveConditions(ruleSet, context);

  for (const step of ruleSet.steps) {
    if (step.conditionFilters && !matchesConditions(step.conditionFilters, resolvedConditions)) {
      continue;
    }

    const result = executeStep(step, inputs, results, resolvedConditions);
    if (result) {
      results[result.outputId] = result;
    }
  }

  return results;
}

function resolveConditions(
  ruleSet: ScoringRuleSet,
  context: ScoringContext
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const condition of ruleSet.conditions) {
    switch (condition.source) {
      case "patient.age":
        resolved[condition.id] = resolveAgeGroup(context.age);
        break;
      case "patient.gender":
        resolved[condition.id] = context.gender;
        break;
      case "assessment.respondentType":
        resolved[condition.id] = context.respondentType || "self";
        break;
      case "input":
        if (condition.sourceInputId) {
          resolved[condition.id] = String(context[condition.sourceInputId as keyof ScoringContext] || "");
        }
        break;
    }
  }

  return resolved;
}

function resolveAgeGroup(age: number): string {
  if (age <= 5) return "0-5";
  if (age <= 8) return "6-8";
  if (age <= 11) return "9-11";
  if (age <= 14) return "12-14";
  if (age <= 17) return "15-17";
  return "18+";
}

function matchesConditions(
  filters: Record<string, string>,
  resolved: Record<string, string>
): boolean {
  return Object.entries(filters).every(
    ([key, value]) => resolved[key] === value
  );
}

function executeStep(
  step: ScoringStep,
  inputs: Record<string, number>,
  priorResults: Record<string, ScoringResult>,
  _conditions: Record<string, string>
): ScoringResult | null {
  switch (step.type) {
    case "lookup_table":
      return executeLookup(step, inputs);
    case "formula":
      return executeFormula(step, inputs, priorResults);
    case "threshold":
      return executeThreshold(step, priorResults);
    case "mapping":
      return executeMapping(step, inputs);
  }
}

function executeLookup(
  step: { outputId: string; inputId: string; table: Record<string, number> },
  inputs: Record<string, number>
): ScoringResult {
  const inputValue = inputs[step.inputId];

  if (inputValue === undefined) {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: missing input ${step.inputId}`,
      type: "custom",
    };
  }

  const key = String(inputValue);
  const value = step.table[key];

  if (value === undefined) {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: no table entry for ${key}`,
      type: "custom",
    };
  }

  return {
    outputId: step.outputId,
    label: step.outputId,
    value,
    type: "custom",
  };
}

function executeFormula(
  step: { outputId: string; formula: string; variables: Record<string, string> },
  inputs: Record<string, number>,
  priorResults: Record<string, ScoringResult>
): ScoringResult {
  const scope: Record<string, number> = {};

  for (const [placeholder, sourceId] of Object.entries(step.variables)) {
    if (inputs[sourceId] !== undefined) {
      scope[placeholder] = inputs[sourceId];
    } else if (priorResults[sourceId] && typeof priorResults[sourceId].value === "number") {
      scope[placeholder] = priorResults[sourceId].value as number;
    } else {
      return {
        outputId: step.outputId,
        label: step.outputId,
        value: `Error: missing variable ${sourceId}`,
        type: "custom",
      };
    }
  }

  try {
    const value = evaluate(step.formula, scope) as number;
    return {
      outputId: step.outputId,
      label: step.outputId,
      value,
      type: "custom",
    };
  } catch {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: formula evaluation failed`,
      type: "custom",
    };
  }
}

function executeThreshold(
  step: {
    outputId: string;
    sourceOutputId: string;
    thresholds: { min: number; max: number; label: string }[];
  },
  priorResults: Record<string, ScoringResult>
): ScoringResult {
  const source = priorResults[step.sourceOutputId];

  if (!source || typeof source.value !== "number") {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: missing source output ${step.sourceOutputId}`,
      type: "interpretation",
    };
  }

  const match = step.thresholds.find(
    (t) => source.value >= t.min && source.value <= t.max
  );

  return {
    outputId: step.outputId,
    label: step.outputId,
    value: match ? match.label : `Error: no threshold match for ${source.value}`,
    type: "interpretation",
  };
}

function executeMapping(
  step: { outputId: string; sourceId: string; map: Record<string, string | number> },
  inputs: Record<string, number>
): ScoringResult {
  const inputValue = inputs[step.sourceId];

  if (inputValue === undefined) {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: missing input ${step.sourceId}`,
      type: "custom",
    };
  }

  const key = String(inputValue);
  const value = step.map[key];

  if (value === undefined) {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: no mapping for ${key}`,
      type: "custom",
    };
  }

  return {
    outputId: step.outputId,
    label: step.outputId,
    value,
    type: "custom",
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/scoring-engine.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring-engine.ts src/lib/__tests__/scoring-engine.test.ts
git commit -m "feat: implement deterministic scoring engine with tests"
```

---

## Task 5: Test API Routes

**Files:**
- Create: `src/app/api/tests/route.ts`, `src/app/api/tests/[testId]/route.ts`

- [ ] **Step 1: Create tests list + create route**

Create `src/app/api/tests/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTestSchema } from "@/lib/validations/test";

export async function GET() {
  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tests);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createTestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const test = await prisma.test.create({ data: parsed.data });

  return NextResponse.json(test, { status: 201 });
}
```

- [ ] **Step 2: Create single test route**

Create `src/app/api/tests/[testId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateTestSchema } from "@/lib/validations/test";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const { testId } = await params;
  const test = await prisma.test.findUnique({ where: { id: testId } });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  return NextResponse.json(test);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const { testId } = await params;
  const body = await request.json();
  const parsed = updateTestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const test = await prisma.test.update({
    where: { id: testId },
    data: parsed.data,
  });

  return NextResponse.json(test);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const { testId } = await params;

  const assessmentCount = await prisma.assessment.count({
    where: { testId },
  });

  if (assessmentCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete test with existing assessments" },
      { status: 409 }
    );
  }

  await prisma.test.delete({ where: { id: testId } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tests/
git commit -m "feat: add test CRUD API routes"
```

---

## Task 6: Patient API Routes

**Files:**
- Create: `src/app/api/patients/route.ts`, `src/app/api/patients/[patientId]/route.ts`

- [ ] **Step 1: Create patient list + create route**

Create `src/app/api/patients/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPatientSchema } from "@/lib/validations/patient";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");

  const patients = await prisma.patient.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { assessments: true } } },
  });

  return NextResponse.json(patients);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createPatientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patient = await prisma.patient.create({ data: parsed.data });

  return NextResponse.json(patient, { status: 201 });
}
```

- [ ] **Step 2: Create single patient route**

Create `src/app/api/patients/[patientId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updatePatientSchema } from "@/lib/validations/patient";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      assessments: {
        include: { test: true },
        orderBy: { assessmentDate: "desc" },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json(patient);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  const body = await request.json();
  const parsed = updatePatientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: parsed.data,
  });

  return NextResponse.json(patient);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;

  await prisma.patient.delete({ where: { id: patientId } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/patients/route.ts src/app/api/patients/[patientId]/route.ts
git commit -m "feat: add patient CRUD API routes"
```

---

## Task 7: Assessment API Routes + Scoring Integration

**Files:**
- Create: `src/app/api/patients/[patientId]/assessments/route.ts`, `src/app/api/patients/[patientId]/assessments/[assessmentId]/route.ts`, `src/app/api/scoring/route.ts`

- [ ] **Step 1: Create assessment list + create route (with scoring)**

Create `src/app/api/patients/[patientId]/assessments/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAssessmentSchema } from "@/lib/validations/assessment";
import { executeScoring } from "@/lib/scoring-engine";
import { ScoringRuleSet } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;

  const assessments = await prisma.assessment.findMany({
    where: { patientId },
    include: { test: true },
    orderBy: { assessmentDate: "desc" },
  });

  return NextResponse.json(assessments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  const body = await request.json();
  const parsed = createAssessmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const test = await prisma.test.findUnique({ where: { id: parsed.data.testId } });
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const now = new Date();
  const age = Math.floor(
    (now.getTime() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const results = executeScoring(
    test.scoringRules as ScoringRuleSet,
    parsed.data.inputScores,
    {
      age,
      gender: patient.gender,
      respondentType: parsed.data.respondentType,
    }
  );

  const assessment = await prisma.assessment.create({
    data: {
      patientId,
      testId: parsed.data.testId,
      inputScores: parsed.data.inputScores,
      results,
      respondentType: parsed.data.respondentType,
      assessmentDate: parsed.data.assessmentDate || new Date(),
      notes: parsed.data.notes,
    },
    include: { test: true },
  });

  return NextResponse.json(assessment, { status: 201 });
}
```

- [ ] **Step 2: Create single assessment route (with re-scoring on update)**

Create `src/app/api/patients/[patientId]/assessments/[assessmentId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateAssessmentSchema } from "@/lib/validations/assessment";
import { executeScoring } from "@/lib/scoring-engine";
import { ScoringRuleSet } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string; assessmentId: string }> }
) {
  const { assessmentId } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { test: true, patient: true },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  return NextResponse.json(assessment);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; assessmentId: string }> }
) {
  const { patientId, assessmentId } = await params;
  const body = await request.json();
  const parsed = updateAssessmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { test: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.inputScores) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const now = new Date();
    const age = Math.floor(
      (now.getTime() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    updateData.results = executeScoring(
      existing.test.scoringRules as ScoringRuleSet,
      parsed.data.inputScores,
      {
        age,
        gender: patient.gender,
        respondentType: parsed.data.respondentType || existing.respondentType || undefined,
      }
    );
  }

  const assessment = await prisma.assessment.update({
    where: { id: assessmentId },
    data: updateData,
    include: { test: true },
  });

  return NextResponse.json(assessment);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  const { assessmentId } = await params;

  await prisma.assessment.delete({ where: { id: assessmentId } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create stateless scoring route**

Create `src/app/api/scoring/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeScoring } from "@/lib/scoring-engine";
import { scoringRuleSetSchema } from "@/lib/types";

const scoringRequestSchema = z.object({
  ruleSet: scoringRuleSetSchema,
  inputs: z.record(z.number()),
  context: z.object({
    age: z.number(),
    gender: z.string(),
    respondentType: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = scoringRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const results = executeScoring(
    parsed.data.ruleSet,
    parsed.data.inputs,
    parsed.data.context
  );

  return NextResponse.json(results);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/patients/[patientId]/assessments/ src/app/api/scoring/
git commit -m "feat: add assessment API routes with scoring integration"
```

---

## Task 8: AI Integration — Rule Generation

**Files:**
- Create: `src/lib/ai/generate-rules.ts`, `src/lib/ai/parse-document.ts`, `src/app/api/tests/generate-rules/route.ts`

- [ ] **Step 1: Create document parsing helper**

Create `src/lib/ai/parse-document.ts`:

```typescript
import fs from "fs/promises";
import path from "path";

export type DocumentBlock =
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const MEDIA_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function fileToContentBlock(filePath: string): Promise<DocumentBlock> {
  const data = await fs.readFile(filePath);
  const base64 = data.toString("base64");
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    };
  }

  if (IMAGE_EXTENSIONS.includes(ext)) {
    return {
      type: "image",
      source: { type: "base64", media_type: MEDIA_TYPES[ext] as string, data: base64 },
    };
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export async function saveUploadedFile(
  file: File,
  testId: string
): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", testId);
  await fs.mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(uploadDir, file.name);
  await fs.writeFile(filePath, buffer);

  return filePath;
}
```

- [ ] **Step 2: Create rule generation function**

Create `src/lib/ai/generate-rules.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { scoringRuleSetSchema, inputDefinitionSchema, outputDefinitionSchema } from "@/lib/types";
import { DocumentBlock, fileToContentBlock } from "./parse-document";
import { z } from "zod";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a psychometric test analysis expert. Your job is to analyze psychological test descriptions and documents (norm tables, scoring manuals, etc.) and generate a deterministic scoring rule set as structured JSON.

You must return a JSON object matching this exact structure:

{
  "ruleSet": {
    "version": "1.0",
    "description": "string - brief description of the test",
    "conditions": [
      {
        "id": "string - e.g., age_group",
        "source": "patient.age" | "patient.gender" | "assessment.respondentType" | "input",
        "sourceInputId": "string - only if source is input"
      }
    ],
    "steps": [
      // Each step is one of:
      // 1. lookup_table: { type: "lookup_table", outputId, inputId, conditionFilters?, table: { "raw_score": standard_score } }
      // 2. formula: { type: "formula", outputId, formula: "math expression with {placeholders}", variables: { placeholder: inputId_or_outputId } }
      // 3. threshold: { type: "threshold", outputId, sourceOutputId, thresholds: [{ min, max, label }] }
      // 4. mapping: { type: "mapping", outputId, sourceId, map: { "key": "value" } }
    ]
  },
  "inputs": [
    { "id": "input_1", "label": "string", "description": "string?", "type": "number" | "integer", "min": number?, "max": number?, "required": true }
  ],
  "outputs": [
    { "id": "output_1", "label": "string", "type": "standard_score" | "percentile" | "interpretation" | "composite" | "custom" }
  ]
}

Rules:
- Include ALL norm tables from the documents as lookup_table steps
- Use condition variables (age_group, gender, respondentType) to select the correct norm table
- Always add threshold steps to map standard scores to verbal interpretations
- Steps execute in order — later steps can reference outputs from earlier steps
- Return ONLY valid JSON, no markdown, no preamble, no trailing text`;

const responseSchema = z.object({
  ruleSet: scoringRuleSetSchema,
  inputs: z.array(inputDefinitionSchema),
  outputs: z.array(outputDefinitionSchema),
});

export type GenerateRulesResult =
  | { success: true; data: z.infer<typeof responseSchema> }
  | { success: false; error: string; raw?: string };

export async function generateRules(
  description: string,
  filePaths: string[]
): Promise<GenerateRulesResult> {
  const contentBlocks: (DocumentBlock | { type: "text"; text: string })[] = [];

  for (const filePath of filePaths) {
    const block = await fileToContentBlock(filePath);
    contentBlocks.push(block);
  }

  contentBlocks.push({
    type: "text",
    text: `Test description:\n\n${description}\n\nAnalyze the above documents and description, then generate the scoring rule set JSON.`,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: contentBlocks }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { success: false, error: "No text response from Claude" };
  }

  const raw = textBlock.text.trim();

  try {
    const json = JSON.parse(raw);
    const parsed = responseSchema.safeParse(json);

    if (!parsed.success) {
      return {
        success: false,
        error: `Validation failed: ${parsed.error.message}`,
        raw,
      };
    }

    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: "Failed to parse JSON response", raw };
  }
}
```

- [ ] **Step 3: Create the generate-rules API route**

Create `src/app/api/tests/generate-rules/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/ai/parse-document";
import { generateRules } from "@/lib/ai/generate-rules";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const description = formData.get("description") as string;
  const files = formData.getAll("files") as File[];

  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const tempId = randomUUID();
  const filePaths: string[] = [];

  for (const file of files) {
    const filePath = await saveUploadedFile(file, tempId);
    filePaths.push(filePath);
  }

  const result = await generateRules(description, filePaths);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, raw: result.raw },
      { status: 422 }
    );
  }

  return NextResponse.json({
    ...result.data,
    documentUrls: filePaths.map((p) => p.replace(process.cwd() + "/public", "")),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/ src/app/api/tests/generate-rules/
git commit -m "feat: add AI rule generation with Claude API integration"
```

---

## Task 9: Layout Components + shadcn/ui Setup

**Files:**
- Create: `src/components/layout/Sidebar.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Navigation.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Create navigation config**

Create `src/components/layout/Navigation.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Tests", href: "/tests", icon: "ClipboardList" },
  { label: "Patients", href: "/patients", icon: "Users" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Create sidebar**

Create `src/components/layout/Sidebar.tsx`:

```tsx
import { Navigation } from "./Navigation";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-semibold">PsychAssess</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <Navigation />
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create header**

Create `src/components/layout/Header.tsx`:

```tsx
export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background px-6">
      <div className="ml-auto text-sm text-muted-foreground">
        PsychAssess v1
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Update root layout**

Replace the contents of `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PsychAssess",
  description: "Psychological assessment scoring platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-64">
            <Header />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify the layout renders**

```bash
npm run build 2>&1 | head -20
```

Expected: Build succeeds (or only minor warnings, no errors).

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: add sidebar layout with navigation"
```

---

## Task 10: Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the dashboard**

Replace `src/app/page.tsx` with:

```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const [testCount, patientCount, recentPatients, recentAssessments] =
    await Promise.all([
      prisma.test.count({ where: { isActive: true } }),
      prisma.patient.count(),
      prisma.patient.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.assessment.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { patient: true, test: true },
      }),
    ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{testCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{patientCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentAssessments.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Patients</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/patients/new">New Patient</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients yet.</p>
            ) : (
              <div className="space-y-2">
                {recentPatients.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.id}`}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                  >
                    <span className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {patient.updatedAt.toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Assessments</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/tests">View Tests</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentAssessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assessments yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentAssessments.map((assessment) => (
                  <Link
                    key={assessment.id}
                    href={`/patients/${assessment.patientId}`}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                  >
                    <div>
                      <span className="font-medium">
                        {assessment.patient.firstName}{" "}
                        {assessment.patient.lastName}
                      </span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {assessment.test.name}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {assessment.createdAt.toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add dashboard with stats and recent activity"
```

---

## Task 11: Test Library Page

**Files:**
- Create: `src/app/tests/page.tsx`, `src/components/tests/TestCard.tsx`

- [ ] **Step 1: Create TestCard component**

Create `src/components/tests/TestCard.tsx`:

```tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Test } from "@prisma/client";

interface TestCardProps {
  test: Test;
}

export function TestCard({ test }: TestCardProps) {
  const inputs = test.inputs as { id: string; label: string }[];
  const outputs = test.outputs as { id: string; label: string }[];

  return (
    <Link href={`/tests/${test.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{test.name}</CardTitle>
            {test.category && (
              <Badge variant="secondary">{test.category}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {test.description && (
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
              {test.description}
            </p>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{inputs.length} inputs</span>
            <span>{outputs.length} outputs</span>
            {test.ageRange && <span>Ages {test.ageRange}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Create test library page**

Create `src/app/tests/page.tsx`:

```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { TestCard } from "@/components/tests/TestCard";

export default async function TestsPage() {
  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Test Library</h2>
        <Button asChild>
          <Link href="/tests/new">New Test</Link>
        </Button>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No tests yet.</p>
          <Button className="mt-4" asChild>
            <Link href="/tests/new">Create your first test</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/tests/page.tsx src/components/tests/TestCard.tsx
git commit -m "feat: add test library page with test cards"
```

---

## Task 12: Test Builder Page

**Files:**
- Create: `src/app/tests/new/page.tsx`, `src/components/tests/TestBuilder.tsx`, `src/components/tests/InputOutputPreview.tsx`, `src/hooks/useTestBuilder.ts`

- [ ] **Step 1: Create useTestBuilder hook**

Create `src/hooks/useTestBuilder.ts`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InputDefinition, OutputDefinition, ScoringRuleSet } from "@/lib/types";

interface GeneratedRules {
  ruleSet: ScoringRuleSet;
  inputs: InputDefinition[];
  outputs: OutputDefinition[];
  documentUrls: string[];
}

export function useTestBuilder() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<GeneratedRules | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);

  async function generateRules() {
    setGenerating(true);
    setError(null);
    setRawError(null);

    const formData = new FormData();
    formData.set("description", description);
    for (const file of files) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/tests/generate-rules", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setRawError(data.raw || null);
        return;
      }

      setGenerated(data);
    } catch {
      setError("Failed to generate rules. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveTest(name: string, category?: string, ageRange?: string) {
    if (!generated) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description,
          category,
          ageRange,
          scoringRules: generated.ruleSet,
          inputs: generated.inputs,
          outputs: generated.outputs,
          rawDescription: description,
          documentUrls: generated.documentUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.fieldErrors ? "Validation error" : "Failed to save test");
        return;
      }

      const test = await res.json();
      router.push(`/tests/${test.id}`);
    } catch {
      setError("Failed to save test. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return {
    description,
    setDescription,
    files,
    setFiles,
    generating,
    saving,
    generated,
    error,
    rawError,
    generateRules,
    saveTest,
    setGenerated,
  };
}
```

- [ ] **Step 2: Create InputOutputPreview component**

Create `src/components/tests/InputOutputPreview.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InputDefinition, OutputDefinition } from "@/lib/types";

interface InputOutputPreviewProps {
  inputs: InputDefinition[];
  outputs: OutputDefinition[];
}

export function InputOutputPreview({ inputs, outputs }: InputOutputPreviewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Inputs ({inputs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {inputs.map((input) => (
              <div
                key={input.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <div>
                  <span className="font-medium">{input.label}</span>
                  {input.description && (
                    <p className="text-xs text-muted-foreground">
                      {input.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline">{input.type}</Badge>
                  {input.required && <Badge variant="secondary">required</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Outputs ({outputs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {outputs.map((output) => (
              <div
                key={output.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <span className="font-medium">{output.label}</span>
                <Badge variant="outline">{output.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create TestBuilder component**

Create `src/components/tests/TestBuilder.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOutputPreview } from "./InputOutputPreview";
import { useTestBuilder } from "@/hooks/useTestBuilder";

export function TestBuilder() {
  const {
    description,
    setDescription,
    files,
    setFiles,
    generating,
    saving,
    generated,
    error,
    rawError,
    generateRules,
    saveTest,
  } = useTestBuilder();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [ageRange, setAgeRange] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="files">
              Test documents (PDFs, images of norm tables)
            </Label>
            <Input
              id="files"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleFileChange}
              className="mt-1"
            />
            {files.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {files.length} file(s) selected
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">
              Describe how this test works
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the test: what are the subtests, how is it scored, what norm tables apply, what do the scores mean..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="mt-1"
            />
          </div>

          <Button
            onClick={generateRules}
            disabled={generating || !description}
          >
            {generating ? "Generating Rules..." : "Generate Rules"}
          </Button>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
              {rawError && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Raw AI response</summary>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                    {rawError}
                  </pre>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {generated && (
        <>
          <InputOutputPreview
            inputs={generated.inputs}
            outputs={generated.outputs}
          />

          <Card>
            <CardHeader>
              <CardTitle>Save Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Test Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., WISC-V, BASC-3"
                  className="mt-1"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Cognitive, Behavioral"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ageRange">Age Range</Label>
                  <Input
                    id="ageRange"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    placeholder="e.g., 6-16"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button
                onClick={() => saveTest(name, category, ageRange)}
                disabled={saving || !name}
              >
                {saving ? "Saving..." : "Save Test"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the new test page**

Create `src/app/tests/new/page.tsx`:

```tsx
import { TestBuilder } from "@/components/tests/TestBuilder";

export default function NewTestPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create New Test</h2>
      <TestBuilder />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/tests/new/ src/components/tests/TestBuilder.tsx src/components/tests/InputOutputPreview.tsx src/hooks/useTestBuilder.ts
git commit -m "feat: add test builder page with AI rule generation"
```

---

## Task 13: Test View + Edit Pages

**Files:**
- Create: `src/app/tests/[testId]/page.tsx`, `src/app/tests/[testId]/edit/page.tsx`, `src/components/tests/RuleEditor.tsx`

- [ ] **Step 1: Create test view page**

Create `src/app/tests/[testId]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InputOutputPreview } from "@/components/tests/InputOutputPreview";
import type { InputDefinition, OutputDefinition, ScoringRuleSet } from "@/lib/types";

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { _count: { select: { assessments: true } } },
  });

  if (!test) notFound();

  const inputs = test.inputs as InputDefinition[];
  const outputs = test.outputs as OutputDefinition[];
  const ruleSet = test.scoringRules as ScoringRuleSet;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{test.name}</h2>
          <div className="mt-1 flex gap-2">
            {test.category && <Badge variant="secondary">{test.category}</Badge>}
            {test.ageRange && <Badge variant="outline">Ages {test.ageRange}</Badge>}
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/tests/${test.id}/edit`}>Edit Rules</Link>
        </Button>
      </div>

      {test.description && (
        <p className="text-muted-foreground">{test.description}</p>
      )}

      <InputOutputPreview inputs={inputs} outputs={outputs} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Scoring Rules ({ruleSet.steps.length} steps)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ruleSet.steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border p-2 text-sm"
              >
                <Badge variant="outline">{step.type}</Badge>
                <span>
                  {step.outputId}
                  {step.type === "lookup_table" &&
                    ` (${Object.keys(step.table).length} entries)`}
                  {step.type === "formula" && `: ${step.formula}`}
                  {step.type === "threshold" &&
                    ` (${step.thresholds.length} ranges)`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {test._count.assessments} assessment(s) using this test
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create RuleEditor component**

Create `src/components/tests/RuleEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoringRuleSet, InputDefinition, OutputDefinition } from "@/lib/types";

interface RuleEditorProps {
  testId: string;
  initialRuleSet: ScoringRuleSet;
  initialInputs: InputDefinition[];
  initialOutputs: OutputDefinition[];
}

export function RuleEditor({
  testId,
  initialRuleSet,
  initialInputs,
  initialOutputs,
}: RuleEditorProps) {
  const router = useRouter();
  const [ruleSetJson, setRuleSetJson] = useState(
    JSON.stringify(initialRuleSet, null, 2)
  );
  const [inputsJson, setInputsJson] = useState(
    JSON.stringify(initialInputs, null, 2)
  );
  const [outputsJson, setOutputsJson] = useState(
    JSON.stringify(initialOutputs, null, 2)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const scoringRules = JSON.parse(ruleSetJson);
      const inputs = JSON.parse(inputsJson);
      const outputs = JSON.parse(outputsJson);

      const res = await fetch(`/api/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoringRules, inputs, outputs }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.fieldErrors ? "Validation error" : "Failed to save");
        return;
      }

      router.push(`/tests/${testId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof SyntaxError ? "Invalid JSON" : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scoring Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={ruleSetJson}
            onChange={(e) => setRuleSetJson(e.target.value)}
            rows={20}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inputs</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={inputsJson}
              onChange={(e) => setInputsJson(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Outputs</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={outputsJson}
              onChange={(e) => setOutputsJson(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create test edit page**

Create `src/app/tests/[testId]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RuleEditor } from "@/components/tests/RuleEditor";
import type { InputDefinition, OutputDefinition, ScoringRuleSet } from "@/lib/types";

export default async function EditTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;

  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Edit: {test.name}</h2>
      <RuleEditor
        testId={test.id}
        initialRuleSet={test.scoringRules as ScoringRuleSet}
        initialInputs={test.inputs as InputDefinition[]}
        initialOutputs={test.outputs as OutputDefinition[]}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/tests/[testId]/ src/components/tests/RuleEditor.tsx
git commit -m "feat: add test view and rule editor pages"
```

---

## Task 14: Patient List + Create Pages

**Files:**
- Create: `src/app/patients/page.tsx`, `src/app/patients/new/page.tsx`, `src/components/patients/PatientForm.tsx`

- [ ] **Step 1: Create PatientForm component**

Create `src/components/patients/PatientForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface PatientFormProps {
  initial?: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    notes: string | null;
  };
}

export function PatientForm({ initial }: PatientFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(initial?.firstName || "");
  const [lastName, setLastName] = useState(initial?.lastName || "");
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth || "");
  const [gender, setGender] = useState(initial?.gender || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = initial ? `/api/patients/${initial.id}` : "/api/patients";
    const method = initial ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, dateOfBirth, gender, notes }),
      });

      if (!res.ok) {
        setError("Failed to save patient");
        return;
      }

      const patient = await res.json();
      router.push(`/patients/${patient.id}`);
    } catch {
      setError("Failed to save patient");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : initial ? "Update Patient" : "Create Patient"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create patient list page**

Create `src/app/patients/page.tsx`:

```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function PatientsPage() {
  const patients = await prisma.patient.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { assessments: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Patients</h2>
        <Button asChild>
          <Link href="/patients/new">New Patient</Link>
        </Button>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No patients yet.</p>
          <Button className="mt-4" asChild>
            <Link href="/patients/new">Add your first patient</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <span className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="ml-4 text-sm text-muted-foreground">
                      DOB: {patient.dateOfBirth.toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {patient._count.assessments} assessment(s)
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create new patient page**

Create `src/app/patients/new/page.tsx`:

```tsx
import { PatientForm } from "@/components/patients/PatientForm";

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">New Patient</h2>
      <PatientForm />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/patients/page.tsx src/app/patients/new/ src/components/patients/PatientForm.tsx
git commit -m "feat: add patient list and create pages"
```

---

## Task 15: Patient Card Page

**Files:**
- Create: `src/app/patients/[patientId]/page.tsx`, `src/components/patients/PatientCard.tsx`, `src/components/results/ResultsTable.tsx`, `src/components/results/ScoreDisplay.tsx`, `src/components/results/InterpretationBadge.tsx`

- [ ] **Step 1: Create InterpretationBadge component**

Create `src/components/results/InterpretationBadge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InterpretationBadgeProps {
  label: string;
}

function getVariant(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("very superior") || lower.includes("extremely high"))
    return "bg-blue-100 text-blue-800";
  if (lower.includes("superior") || lower.includes("above average") || lower.includes("high"))
    return "bg-green-100 text-green-800";
  if (lower.includes("average"))
    return "bg-gray-100 text-gray-800";
  if (lower.includes("low average") || lower.includes("below average"))
    return "bg-orange-100 text-orange-800";
  if (lower.includes("borderline") || lower.includes("extremely low") || lower.includes("very low"))
    return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

export function InterpretationBadge({ label }: InterpretationBadgeProps) {
  return (
    <Badge variant="outline" className={cn("font-medium", getVariant(label))}>
      {label}
    </Badge>
  );
}
```

- [ ] **Step 2: Create ScoreDisplay component**

Create `src/components/results/ScoreDisplay.tsx`:

```tsx
import type { ScoringResult } from "@/lib/types";
import { InterpretationBadge } from "./InterpretationBadge";

interface ScoreDisplayProps {
  result: ScoringResult;
}

export function ScoreDisplay({ result }: ScoreDisplayProps) {
  const isError = typeof result.value === "string" && String(result.value).startsWith("Error:");

  if (isError) {
    return (
      <span className="text-sm text-muted-foreground">{String(result.value)}</span>
    );
  }

  if (result.type === "interpretation") {
    return <InterpretationBadge label={String(result.value)} />;
  }

  return <span className="font-medium">{result.value}</span>;
}
```

- [ ] **Step 3: Create ResultsTable component**

Create `src/components/results/ResultsTable.tsx`:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreDisplay } from "./ScoreDisplay";
import type { ScoringResult } from "@/lib/types";

interface ResultsTableProps {
  results: Record<string, ScoringResult>;
}

export function ResultsTable({ results }: ResultsTableProps) {
  const entries = Object.values(results);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No results computed.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Measure</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((result) => (
          <TableRow key={result.outputId}>
            <TableCell className="font-medium">{result.label}</TableCell>
            <TableCell className="text-muted-foreground">
              {result.type.replace("_", " ")}
            </TableCell>
            <TableCell>
              <ScoreDisplay result={result} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 4: Create PatientCard component**

Create `src/components/patients/PatientCard.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PatientCardProps {
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: string;
    notes: string | null;
  };
}

export function PatientCard({ patient }: PatientCardProps) {
  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>
          {patient.firstName} {patient.lastName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm">
          <span>Age: {age}</span>
          <Badge variant="outline">{patient.gender}</Badge>
          <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
        </div>
        {patient.notes && (
          <p className="mt-2 text-sm text-muted-foreground">{patient.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Create patient card page**

Create `src/app/patients/[patientId]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatientCard } from "@/components/patients/PatientCard";
import { ResultsTable } from "@/components/results/ResultsTable";
import type { ScoringResult } from "@/lib/types";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      assessments: {
        include: { test: true },
        orderBy: { assessmentDate: "desc" },
      },
    },
  });

  if (!patient) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Patient Card</h2>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/patients/${patientId}/add-test`}>Add Test</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/api/patients/${patientId}/export`}>Export PDF</a>
          </Button>
        </div>
      </div>

      <PatientCard patient={patient} />

      {patient.assessments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No assessments yet.</p>
          <Button className="mt-4" asChild>
            <Link href={`/patients/${patientId}/add-test`}>
              Add first assessment
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {patient.assessments.map((assessment) => (
            <Card key={assessment.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {assessment.test.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    {assessment.respondentType && (
                      <Badge variant="outline">
                        {assessment.respondentType}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {assessment.assessmentDate.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {assessment.results ? (
                  <ResultsTable
                    results={assessment.results as Record<string, ScoringResult>}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No results computed.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/patients/[patientId]/page.tsx src/components/patients/PatientCard.tsx src/components/results/
git commit -m "feat: add patient card page with results display"
```

---

## Task 16: Add Test to Patient Page

**Files:**
- Create: `src/app/patients/[patientId]/add-test/page.tsx`, `src/components/patients/AssessmentEntry.tsx`

- [ ] **Step 1: Create AssessmentEntry component**

Create `src/components/patients/AssessmentEntry.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InputDefinition } from "@/lib/types";

interface AssessmentEntryProps {
  patientId: string;
  testId: string;
  testName: string;
  inputs: InputDefinition[];
}

export function AssessmentEntry({
  patientId,
  testId,
  testName,
  inputs,
}: AssessmentEntryProps) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [respondentType, setRespondentType] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setScore(inputId: string, value: string) {
    setScores((prev) => ({ ...prev, [inputId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const inputScores: Record<string, number> = {};
    for (const [key, value] of Object.entries(scores)) {
      if (value !== "") {
        inputScores[key] = Number(value);
      }
    }

    try {
      const res = await fetch(`/api/patients/${patientId}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          inputScores,
          respondentType: respondentType || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save assessment");
        return;
      }

      router.push(`/patients/${patientId}`);
    } catch {
      setError("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{testName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inputs.map((input) => (
              <div key={input.id}>
                <Label htmlFor={input.id}>
                  {input.label}
                  {input.required && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </Label>
                <Input
                  id={input.id}
                  type="number"
                  min={input.min}
                  max={input.max}
                  step={input.type === "integer" ? 1 : "any"}
                  value={scores[input.id] || ""}
                  onChange={(e) => setScore(input.id, e.target.value)}
                  required={input.required}
                  className="mt-1"
                />
                {input.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {input.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="respondentType">Respondent Type (optional)</Label>
              <Select value={respondentType} onValueChange={setRespondentType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Submit Scores"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create add-test page**

Create `src/app/patients/[patientId]/add-test/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssessmentEntry } from "@/components/patients/AssessmentEntry";
import type { InputDefinition } from "@/lib/types";

export default async function AddTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ testId?: string }>;
}) {
  const { patientId } = await params;
  const { testId } = await searchParams;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });
  if (!patient) notFound();

  if (testId) {
    const test = await prisma.test.findUnique({ where: { id: testId } });
    if (!test) notFound();

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          Enter Scores: {patient.firstName} {patient.lastName}
        </h2>
        <AssessmentEntry
          patientId={patientId}
          testId={test.id}
          testName={test.name}
          inputs={test.inputs as InputDefinition[]}
        />
      </div>
    );
  }

  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        Select Test: {patient.firstName} {patient.lastName}
      </h2>

      {tests.length === 0 ? (
        <p className="text-muted-foreground">
          No tests available. Create a test first.
        </p>
      ) : (
        <div className="space-y-2">
          {tests.map((test) => (
            <Link
              key={test.id}
              href={`/patients/${patientId}/add-test?testId=${test.id}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <span className="font-medium">{test.name}</span>
                    {test.description && (
                      <p className="text-sm text-muted-foreground">
                        {test.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {test.category && (
                      <Badge variant="secondary">{test.category}</Badge>
                    )}
                    {test.ageRange && (
                      <Badge variant="outline">Ages {test.ageRange}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/patients/[patientId]/add-test/ src/components/patients/AssessmentEntry.tsx
git commit -m "feat: add test selection and score entry for patients"
```

---

## Task 17: PDF Export

**Files:**
- Create: `src/lib/pdf/report-generator.tsx`, `src/app/api/patients/[patientId]/export/route.ts`

- [ ] **Step 1: Create PDF report generator**

Create `src/lib/pdf/report-generator.tsx`:

```tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ScoringResult } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 4,
  },
  col1: { flex: 2 },
  col2: { flex: 1 },
  col3: { flex: 1 },
  bold: { fontFamily: "Helvetica-Bold" },
  info: { marginBottom: 2 },
  infoLabel: { fontFamily: "Helvetica-Bold", color: "#333" },
});

interface PatientData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  notes: string | null;
}

interface AssessmentData {
  test: { name: string };
  assessmentDate: Date;
  respondentType: string | null;
  results: Record<string, ScoringResult> | null;
}

interface ReportProps {
  patient: PatientData;
  assessments: AssessmentData[];
}

export function PatientReport({ patient, assessments }: ReportProps) {
  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          {patient.firstName} {patient.lastName}
        </Text>
        <Text style={styles.subtitle}>Psychological Assessment Report</Text>

        <View style={styles.section}>
          <Text style={styles.info}>
            <Text style={styles.infoLabel}>Date of Birth: </Text>
            {new Date(patient.dateOfBirth).toLocaleDateString()}
          </Text>
          <Text style={styles.info}>
            <Text style={styles.infoLabel}>Age: </Text>
            {age}
          </Text>
          <Text style={styles.info}>
            <Text style={styles.infoLabel}>Gender: </Text>
            {patient.gender}
          </Text>
          {patient.notes && (
            <Text style={styles.info}>
              <Text style={styles.infoLabel}>Notes: </Text>
              {patient.notes}
            </Text>
          )}
        </View>

        {assessments.map((assessment, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {assessment.test.name}
              {assessment.respondentType
                ? ` (${assessment.respondentType})`
                : ""}
            </Text>
            <Text style={{ marginBottom: 8, color: "#666" }}>
              Date: {new Date(assessment.assessmentDate).toLocaleDateString()}
            </Text>

            {assessment.results ? (
              <View>
                <View style={styles.headerRow}>
                  <Text style={[styles.col1, styles.bold]}>Measure</Text>
                  <Text style={[styles.col2, styles.bold]}>Type</Text>
                  <Text style={[styles.col3, styles.bold]}>Result</Text>
                </View>
                {Object.values(assessment.results).map((result) => (
                  <View key={result.outputId} style={styles.row}>
                    <Text style={styles.col1}>{result.label}</Text>
                    <Text style={styles.col2}>
                      {result.type.replace("_", " ")}
                    </Text>
                    <Text style={styles.col3}>{String(result.value)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: "#999" }}>No results computed.</Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Create PDF export API route**

Create `src/app/api/patients/[patientId]/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { PatientReport } from "@/lib/pdf/report-generator";
import type { ScoringResult } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      assessments: {
        include: { test: true },
        orderBy: { assessmentDate: "desc" },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const assessments = patient.assessments.map((a) => ({
    test: { name: a.test.name },
    assessmentDate: a.assessmentDate,
    respondentType: a.respondentType,
    results: a.results as Record<string, ScoringResult> | null,
  }));

  const buffer = await renderToBuffer(
    PatientReport({ patient, assessments })
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${patient.firstName}_${patient.lastName}_report.pdf"`,
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf/ src/app/api/patients/[patientId]/export/
git commit -m "feat: add PDF export for patient reports"
```

---

## Task 18: useScoring Hook + Final Polish

**Files:**
- Create: `src/hooks/useScoring.ts`

- [ ] **Step 1: Create useScoring hook**

Create `src/hooks/useScoring.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";
import type { ScoringRuleSet, ScoringResult, ScoringContext } from "@/lib/types";

export function useScoring() {
  const [results, setResults] = useState<Record<string, ScoringResult> | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const preview = useCallback(
    async (
      ruleSet: ScoringRuleSet,
      inputs: Record<string, number>,
      context: ScoringContext
    ) => {
      setLoading(true);

      try {
        const res = await fetch("/api/scoring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleSet, inputs, context }),
        });

        if (res.ok) {
          const data = await res.json();
          setResults(data);
          return data;
        }
      } catch {
        // ignore preview errors
      } finally {
        setLoading(false);
      }

      return null;
    },
    []
  );

  return { results, loading, preview };
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: All scoring engine tests pass.

- [ ] **Step 3: Run the build**

```bash
npm run build
```

Expected: Build succeeds. Fix any TypeScript errors if they appear.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useScoring.ts
git commit -m "feat: add useScoring hook for client-side score preview"
```

---

## Task 19: Environment + Final Verification

**Files:**
- Modify: `.env.local.example`
- Create: `public/uploads/.gitkeep`

- [ ] **Step 1: Create uploads directory placeholder**

```bash
mkdir -p public/uploads
touch public/uploads/.gitkeep
```

- [ ] **Step 2: Verify .env.local.example is complete**

Ensure `.env.local.example` contains:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/psychassess"
ANTHROPIC_API_KEY="sk-ant-..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 3: Run full build + tests**

```bash
npx vitest run && npm run build
```

Expected: All tests pass, build succeeds.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: add uploads directory and finalize project setup"
```

- [ ] **Step 5: Verify the app starts**

```bash
npm run dev
```

Open `http://localhost:3000` — verify the dashboard loads with the sidebar navigation. Stop the dev server after verification.
