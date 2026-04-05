# PsychAssess — Design Specification

> Web-based platform for educational psychologists to automate scoring and interpretation of psychological assessments.

**Core principle:** Tests are configured once using AI-assisted rule generation, then scored deterministically without AI at runtime.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Prisma
- **Styling:** Tailwind CSS + shadcn/ui
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`) — test creation only
- **PDF:** @react-pdf/renderer
- **Math:** mathjs (safe formula evaluation)
- **Validation:** zod
- **Auth:** None for v1 (single user)

---

## Architecture

Three-layer architecture:

1. **Next.js App Router** — pages + API routes, server-rendered where possible
2. **Service layer** (`src/lib/`) — scoring engine, AI integration, PDF generation
3. **Database** — PostgreSQL via Prisma

### Data Flows

**Test creation:**
Upload docs + description → POST /api/tests/generate-rules → Claude API (PDFs/images as document blocks) → ScoringRuleSet JSON → zod validation → user reviews/edits → POST /api/tests → saved to DB

**Scoring:**
Clinician enters raw scores → POST /api/patients/[id]/assessments → server runs scoring engine (pure function, no AI) → stores inputScores + results → returns assessment with results

**PDF export:**
GET /api/patients/[id]/export → fetch patient + all assessments from DB → @react-pdf/renderer generates PDF → stream response

### File Uploads

Local filesystem at `public/uploads/[testId]/`. Files referenced by path in `Test.documentUrls`. Sent to Claude as base64 document content blocks during rule generation.

---

## Scoring Engine

Pure function at `src/lib/scoring-engine.ts`:

```
executeScoring(ruleSet, inputs, context) → Record<string, ScoringResult>
```

**Execution:**
1. Resolve condition variables from context (e.g., age_group from patient age)
2. Walk `ruleSet.steps` sequentially — later steps can reference earlier outputs
3. Step types:
   - **lookup_table** — filter by conditions, find raw score in table, return mapped value
   - **formula** — substitute variables from inputs + prior outputs, evaluate with `mathjs.evaluate()`
   - **threshold** — read prior output, find matching min/max range, return label
   - **mapping** — direct key→value lookup
4. Collect results into flat record keyed by outputId

**Error handling:** Missing inputs or failed lookups produce error results rather than throwing — partial scoring works (4 of 5 subtests entered → results for those 4).

**Results are computed on submit and persisted.** Existing assessments keep their results even if test rules are later updated (clinically correct behavior).

---

## AI Integration

Single endpoint: `POST /api/tests/generate-rules`

- Accepts multipart form data: uploaded files (PDFs/images) + free-text description
- Sends to Claude API with:
  - System prompt: psychometric expert persona, full ScoringRuleSet TypeScript schema, instruction to return only valid JSON
  - User message: description + documents as `document` (PDF) or `image` (PNG/JPG) content blocks
  - max_tokens: 16000
- Response: extract JSON, validate with zod
  - Valid → return parsed rule set for user review
  - Invalid → return raw response + validation errors
- User reviews/edits in RuleEditor component, approves, saves

**Claude is never called after test creation. All scoring is deterministic.**

---

## Database Schema

Three models:

### Test
- `id`, `name`, `description`, `category`, `ageRange`
- `scoringRules` (JSON) — the AI-generated ScoringRuleSet
- `inputs` (JSON) — InputDefinition[]
- `outputs` (JSON) — OutputDefinition[]
- `rawDescription` — original free-text description
- `documentUrls` — uploaded file references
- `isActive`, timestamps

### Patient
- `id`, `firstName`, `lastName`, `dateOfBirth`, `gender`, `notes`
- timestamps

### Assessment
- `id`, `patientId`, `testId`
- `inputScores` (JSON) — raw scores entered by clinician
- `results` (JSON) — computed scoring results (cached)
- `respondentType` — "self" | "parent" | "teacher"
- `assessmentDate`, `notes`, timestamps
- Indexes on patientId and testId

**Cascade behavior:**
- Deleting a patient cascades to their assessments
- Deleting a test is blocked if assessments reference it

---

## Type System

### InputDefinition
- `id`, `label`, `description?`, `type` ("number" | "integer"), `min?`, `max?`, `required`

### OutputDefinition
- `id`, `label`, `type` ("standard_score" | "percentile" | "interpretation" | "composite" | "custom")

### ScoringRuleSet
- `version`, `description`
- `conditions` — ConditionVariable[] (variables affecting which rules apply)
- `steps` — ScoringStep[] (lookup_table | formula | threshold | mapping)

### ScoringResult
- `outputId`, `label`, `value` (number | string), `type`

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/tests | List all tests |
| POST | /api/tests | Create new test |
| GET | /api/tests/[testId] | Get test details |
| PUT | /api/tests/[testId] | Update test |
| DELETE | /api/tests/[testId] | Delete test (blocked if assessments exist) |
| POST | /api/tests/generate-rules | AI: generate scoring rules |
| GET | /api/patients | List all patients |
| POST | /api/patients | Create patient |
| GET | /api/patients/[patientId] | Get patient with all assessments |
| PUT | /api/patients/[patientId] | Update patient |
| DELETE | /api/patients/[patientId] | Delete patient (cascades) |
| POST | /api/patients/[patientId]/assessments | Add assessment (runs scoring) |
| PUT | /api/patients/[patientId]/assessments/[aId] | Update assessment (re-scores) |
| DELETE | /api/patients/[patientId]/assessments/[aId] | Remove assessment |
| POST | /api/scoring | Stateless scoring (for rule editor preview) |
| GET | /api/patients/[patientId]/export | Generate PDF report |

---

## UI & Pages

### Layout
Sidebar navigation with two sections: Tests, Patients. Header with app name. Desktop-first, responsive.

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — recent patients, quick stats |
| `/tests` | Test library grid/list with search + category filter |
| `/tests/new` | Test builder — upload zone, description textarea, "Generate Rules" button, rule preview/editor |
| `/tests/[testId]` | View test config — inputs, outputs, rules summary |
| `/tests/[testId]/edit` | Edit scoring rules — full RuleEditor |
| `/patients` | Patient list with search |
| `/patients/new` | Patient form |
| `/patients/[patientId]` | Patient card — info + assessments with results, "Add Test" + "Export PDF" buttons |
| `/patients/[patientId]/add-test` | Browse tests, select, enter scores, submit |

### Components
- shadcn/ui for all base components
- Color-coded InterpretationBadge: red (below average), orange (low average), green (average), blue (above average)

### PDF Export
Basic functional layout: patient header, each test as a section with score table and interpretations. Clean, no branding.

---

## Project Structure

```
psychassess/
├── prisma/
│   └── schema.prisma
├── public/
│   └── uploads/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── tests/ (list, new, [testId], [testId]/edit)
│   │   ├── patients/ (list, new, [patientId], [patientId]/add-test)
│   │   └── api/ (tests, patients, scoring routes)
│   ├── lib/
│   │   ├── db.ts
│   │   ├── scoring-engine.ts
│   │   ├── ai/ (generate-rules.ts, parse-document.ts)
│   │   ├── pdf/ (report-generator.ts)
│   │   └── types/ (scoring-rules.ts, index.ts)
│   ├── components/
│   │   ├── ui/ (shadcn)
│   │   ├── tests/ (TestCard, TestBuilder, RuleEditor, InputOutputPreview)
│   │   ├── patients/ (PatientCard, PatientForm, AssessmentEntry)
│   │   ├── results/ (ResultsTable, ScoreDisplay, InterpretationBadge)
│   │   └── layout/ (Sidebar, Header, Navigation)
│   └── hooks/ (useScoring, useTestBuilder)
├── package.json, tsconfig.json, next.config.ts, tailwind.config.ts
└── .env.local.example
```

---

## Build Order

1. Initialize Next.js project + install dependencies
2. Set up Prisma with PostgreSQL schema
3. Create type system (scoring-rules.ts)
4. Build scoring engine (pure function, testable)
5. Set up Prisma client singleton
6. Build API routes (tests, patients, assessments, scoring)
7. Build AI integration (generate-rules, document parsing)
8. Set up shadcn/ui and layout components
9. Build test management pages
10. Build patient management pages
11. Build results display components
12. Build PDF export
13. Polish: error handling, loading states, validation
