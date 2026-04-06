# Google Auth & User Scoping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Sign-In with admin/user roles, scoping patients to their owning user.

**Architecture:** NextAuth.js v4 with Prisma adapter handles OAuth, sessions, and user storage. A middleware layer protects all routes. Auth helpers in `src/lib/auth.ts` provide session access and admin checks for API routes and server components. Patient model gets a `userId` foreign key.

**Tech Stack:** next-auth v4, @next-auth/prisma-adapter, Google OAuth 2.0, Prisma, Next.js 14 App Router

---

### Task 1: Install Dependencies and Configure Environment

**Files:**
- Modify: `package.json`
- Modify: `.env`
- Modify: `.env.example` (create if not exists)

- [ ] **Step 1: Install next-auth and prisma adapter**

```bash
npm install next-auth@4 @next-auth/prisma-adapter
```

- [ ] **Step 2: Add environment variables to .env**

Add these lines to `.env` (do NOT remove existing vars):

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

Generate the secret:

```bash
openssl rand -base64 32
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: install next-auth and prisma adapter"
```

**Note:** The user must create Google OAuth credentials at console.cloud.google.com > APIs & Services > Credentials > OAuth 2.0 Client ID. Set authorized redirect URI to `http://localhost:3000/api/auth/callback/google`. Pause here and ask user to provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before proceeding.

---

### Task 2: Add Auth Models to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add User, Account, Session, VerificationToken models and update Patient**

Replace the full contents of `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts   Account[]
  sessions   Session[]
  patients   Patient[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
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

  userId      String?
  user        User?    @relation(fields: [userId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  assessments Assessment[]

  @@index([userId])
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

Key changes from current schema: added `User`, `Account`, `Session`, `VerificationToken` models. Added `userId` (nullable) and `user` relation to `Patient`. Added `@@index([userId])` to Patient.

- [ ] **Step 2: Create and apply migration**

```bash
npx prisma migrate dev --name add-auth-models
```

Expected: Migration creates new tables and adds `userId` column to Patient.

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add NextAuth models and userId to Patient schema"
```

---

### Task 3: Create Auth Configuration

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create auth config at `src/lib/auth.ts`**

```typescript
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import type { NextAuthOptions } from "next-auth";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";

const ADMIN_EMAILS = ["haymatit@gmail.com", "hay.matityaho@skai.io"];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.isAdmin = ADMIN_EMAILS.includes(user.email ?? "");
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export function getSession() {
  return getServerSession(authOptions);
}

export async function getRequiredSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function isAdmin(session: Session): boolean {
  return session.user?.isAdmin === true;
}
```

- [ ] **Step 2: Create NextAuth types at `src/types/next-auth.d.ts`**

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
    };
  }
}
```

- [ ] **Step 3: Create API route at `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

- [ ] **Step 4: Verify the dev server starts without errors**

```bash
npm run dev
```

Check that `http://localhost:3000` loads without crash. The app won't be protected yet — that's Task 4.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts src/app/api/auth/
git commit -m "feat: add NextAuth config with Google provider"
```

---

### Task 4: Add Middleware for Route Protection

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create middleware at `src/middleware.ts`**

```typescript
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

This redirects unauthenticated users to `/login` for all routes except the login page, NextAuth API routes, and static assets.

- [ ] **Step 2: Verify unauthenticated access redirects to /login**

```bash
npm run dev
```

Open `http://localhost:3000` in an incognito window. Expected: redirect to `/login` (which will 404 for now — that's Task 5).

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add auth middleware for route protection"
```

---

### Task 5: Create Login Page

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create login page at `src/app/login/page.tsx`**

```tsx
"use client";

import { signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">PsychAssess</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to continue
          </p>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: The login page must NOT use the app layout (Sidebar + Header)**

Create a separate layout for login at `src/app/login/layout.tsx`:

```tsx
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

This prevents the Sidebar/Header from rendering on the login page. However, since the root layout in `src/app/layout.tsx` always renders Sidebar+Header, we need to make the root layout conditional. Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

Create `src/components/layout/AppShell.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <SessionProvider>
      {isLoginPage ? (
        <>{children}</>
      ) : (
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-64">
            <Header />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      )}
    </SessionProvider>
  );
}
```

- [ ] **Step 3: Test the full sign-in flow**

```bash
npm run dev
```

1. Open incognito browser → `http://localhost:3000` → should redirect to `/login`
2. Click "Sign in with Google" → Google OAuth flow → redirect back to `/`
3. Verify dashboard loads with user signed in

- [ ] **Step 4: Commit**

```bash
git add src/app/login/ src/app/layout.tsx src/components/layout/AppShell.tsx
git commit -m "feat: add login page and session provider"
```

---

### Task 6: Add User Info to Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Update Header to show user info and sign-out**

Replace `src/components/layout/Header.tsx` with:

```tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background px-6">
      <div className="ml-auto flex items-center gap-4">
        {session?.user && (
          <>
            {session.user.image && (
              <img
                src={session.user.image}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            )}
            <span className="text-sm text-muted-foreground">
              {session.user.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign Out
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify header shows user info**

```bash
npm run dev
```

Sign in and verify: avatar, name, and "Sign Out" button appear in the header. Click "Sign Out" → should redirect to `/login`.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: add user info and sign-out to header"
```

---

### Task 7: Add Auth Helpers to API Routes

**Files:**
- Create: `src/lib/api-auth.ts`

- [ ] **Step 1: Create API auth helpers at `src/lib/api-auth.ts`**

```typescript
import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

export async function requireAdmin() {
  const { error, session } = await requireSession();
  if (error) return { error, session: null };
  if (!isAdmin(session!)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session: session! };
}

export async function requirePatientOwner(patientId: string) {
  const { error, session } = await requireSession();
  if (error) return { error, session: null, patient: null };

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return { error: NextResponse.json({ error: "Patient not found" }, { status: 404 }), session: null, patient: null };
  }
  if (patient.userId && patient.userId !== session!.user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null, patient: null };
  }

  return { error: null, session: session!, patient };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-auth.ts
git commit -m "feat: add API auth helper functions"
```

---

### Task 8: Protect Test API Routes (Admin-Only for Writes)

**Files:**
- Modify: `src/app/api/tests/route.ts`
- Modify: `src/app/api/tests/[testId]/route.ts`
- Modify: `src/app/api/tests/generate-rules/route.ts`

- [ ] **Step 1: Update `src/app/api/tests/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTestSchema } from "@/lib/validations/test";
import { requireSession, requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tests);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createTestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const test = await prisma.test.create({ data: parsed.data });

    return NextResponse.json(test, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error saving test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update `src/app/api/tests/[testId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateTestSchema } from "@/lib/validations/test";
import { requireSession, requireAdmin } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { testId } = await params;
  const test = await prisma.test.findUnique({ where: { id: testId } });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  return NextResponse.json(test);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { testId } = await params;
  const body = await request.json();
  const parsed = updateTestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const test = await prisma.test.update({
    where: { id: testId },
    data: parsed.data,
  });

  return NextResponse.json(test);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { testId } = await params;

  const assessmentCount = await prisma.assessment.count({
    where: { testId },
  });

  if (assessmentCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete test with existing assessments" },
      { status: 409 },
    );
  }

  await prisma.test.delete({ where: { id: testId } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Update `src/app/api/tests/generate-rules/route.ts`**

Add admin check at the top of the POST handler. The existing file starts with formData parsing — add the auth check before it:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/ai/parse-document";
import { generateRules } from "@/lib/ai/generate-rules";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await request.formData();
    const description = formData.get("description") as string;
    const files = formData.getAll("files") as File[];

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
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
        { status: 422 },
      );
    }

    return NextResponse.json({
      ...result.data,
      documentUrls: filePaths.map((p) =>
        p.replace(process.cwd() + "/public", ""),
      ),
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error during rule generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tests/
git commit -m "feat: protect test API routes with auth and admin checks"
```

---

### Task 9: Scope Patient API Routes to Current User

**Files:**
- Modify: `src/app/api/patients/route.ts`
- Modify: `src/app/api/patients/[patientId]/route.ts`
- Modify: `src/app/api/patients/[patientId]/assessments/route.ts`
- Modify: `src/app/api/patients/[patientId]/assessments/[assessmentId]/route.ts`
- Modify: `src/app/api/patients/[patientId]/export/route.ts`

- [ ] **Step 1: Update `src/app/api/patients/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPatientSchema } from "@/lib/validations/patient";
import { requireSession } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, session } = await requireSession();
  if (error) return error;

  const search = request.nextUrl.searchParams.get("search");

  const patients = await prisma.patient.findMany({
    where: {
      userId: session!.user.id,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { assessments: true } } },
  });

  return NextResponse.json(patients);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const parsed = createPatientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patient = await prisma.patient.create({
    data: { ...parsed.data, userId: session!.user.id },
  });

  return NextResponse.json(patient, { status: 201 });
}
```

- [ ] **Step 2: Update `src/app/api/patients/[patientId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updatePatientSchema } from "@/lib/validations/patient";
import { requirePatientOwner } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

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
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

  const body = await request.json();
  const parsed = updatePatientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: parsed.data,
  });

  return NextResponse.json(patient);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

  await prisma.patient.delete({ where: { id: patientId } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Update `src/app/api/patients/[patientId]/assessments/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAssessmentSchema } from "@/lib/validations/assessment";
import { executeScoring } from "@/lib/scoring-engine";
import { ScoringRuleSet } from "@/lib/types";
import { requirePatientOwner } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

  const assessments = await prisma.assessment.findMany({
    where: { patientId },
    include: { test: true },
    orderBy: { assessmentDate: "desc" },
  });

  return NextResponse.json(assessments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;
  const { error, patient } = await requirePatientOwner(patientId);
  if (error) return error;

  const body = await request.json();
  const parsed = createAssessmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const test = await prisma.test.findUnique({
    where: { id: parsed.data.testId },
  });
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const now = new Date();
  const age = Math.floor(
    (now.getTime() - patient!.dateOfBirth.getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );

  const results = executeScoring(
    test.scoringRules as ScoringRuleSet,
    parsed.data.inputScores,
    {
      age,
      gender: patient!.gender,
      respondentType: parsed.data.respondentType,
    },
  );

  const assessment = await prisma.assessment.create({
    data: {
      patientId,
      testId: parsed.data.testId,
      inputScores: parsed.data.inputScores,
      results:
        results as unknown as import("@prisma/client").Prisma.InputJsonValue,
      respondentType: parsed.data.respondentType,
      assessmentDate: parsed.data.assessmentDate || new Date(),
      notes: parsed.data.notes,
    },
    include: { test: true },
  });

  return NextResponse.json(assessment, { status: 201 });
}
```

- [ ] **Step 4: Update `src/app/api/patients/[patientId]/assessments/[assessmentId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateAssessmentSchema } from "@/lib/validations/assessment";
import { executeScoring } from "@/lib/scoring-engine";
import { ScoringRuleSet } from "@/lib/types";
import { requirePatientOwner } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string; assessmentId: string }> },
) {
  const { patientId, assessmentId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { test: true, patient: true },
  });

  if (!assessment) {
    return NextResponse.json(
      { error: "Assessment not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(assessment);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; assessmentId: string }> },
) {
  const { patientId, assessmentId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

  const body = await request.json();
  const parsed = updateAssessmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { test: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Assessment not found" },
      { status: 404 },
    );
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.inputScores) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const now = new Date();
    const age = Math.floor(
      (now.getTime() - patient.dateOfBirth.getTime()) /
        (365.25 * 24 * 60 * 60 * 1000),
    );

    updateData.results = executeScoring(
      existing.test.scoringRules as ScoringRuleSet,
      parsed.data.inputScores,
      {
        age,
        gender: patient.gender,
        respondentType:
          parsed.data.respondentType || existing.respondentType || undefined,
      },
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
  { params }: { params: Promise<{ patientId: string; assessmentId: string }> },
) {
  const { patientId, assessmentId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

  await prisma.assessment.delete({ where: { id: assessmentId } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Update `src/app/api/patients/[patientId]/export/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { PatientReport } from "@/lib/pdf/report-generator";
import type { ScoringResult } from "@/lib/types";
import { requirePatientOwner } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

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

  const buffer = await renderToBuffer(PatientReport({ patient, assessments }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${patient.firstName}_${patient.lastName}_report.pdf"`,
    },
  });
}
```

- [ ] **Step 6: Protect scoring API route**

Update `src/app/api/scoring/route.ts` — add session check:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeScoring } from "@/lib/scoring-engine";
import { scoringRuleSetSchema } from "@/lib/types";
import { requireSession } from "@/lib/api-auth";

const scoringRequestSchema = z.object({
  ruleSet: scoringRuleSetSchema,
  inputs: z.record(z.string(), z.number()),
  context: z.object({
    age: z.number(),
    gender: z.string(),
    respondentType: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const parsed = scoringRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const results = executeScoring(
    parsed.data.ruleSet,
    parsed.data.inputs,
    parsed.data.context,
  );

  return NextResponse.json(results);
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/patients/ src/app/api/scoring/
git commit -m "feat: scope patient routes to current user and protect all API routes"
```

---

### Task 10: Scope Server-Rendered Pages to Current User

**Files:**
- Modify: `src/app/page.tsx` (dashboard)
- Modify: `src/app/patients/page.tsx`
- Modify: `src/app/tests/page.tsx`

- [ ] **Step 1: Update dashboard `src/app/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getRequiredSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function DashboardPage() {
  const session = await getRequiredSession();

  const [testCount, patientCount, recentPatients, recentAssessments] =
    await Promise.all([
      prisma.test.count({ where: { isActive: true } }),
      prisma.patient.count({ where: { userId: session.user.id } }),
      prisma.patient.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.assessment.findMany({
        where: { patient: { userId: session.user.id } },
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
            <Link
              href="/patients/new"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              New Patient
            </Link>
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
            <Link
              href="/tests"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View Tests
            </Link>
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

- [ ] **Step 2: Update patients page `src/app/patients/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getRequiredSession } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";

export default async function PatientsPage() {
  const session = await getRequiredSession();

  const patients = await prisma.patient.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { assessments: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Patients</h2>
        <Link href="/patients/new" className={buttonVariants()}>
          New Patient
        </Link>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No patients yet.</p>
          <Link
            href="/patients/new"
            className={buttonVariants({ className: "mt-4" })}
          >
            Add your first patient
          </Link>
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

- [ ] **Step 3: Update tests page `src/app/tests/page.tsx` to hide admin actions for non-admins**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getRequiredSession, isAdmin } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { TestCard } from "@/components/tests/TestCard";

export default async function TestsPage() {
  const session = await getRequiredSession();
  const userIsAdmin = isAdmin(session);

  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Test Library</h2>
        {userIsAdmin && (
          <Link href="/tests/new" className={buttonVariants()}>
            New Test
          </Link>
        )}
      </div>

      {tests.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No tests yet.</p>
          {userIsAdmin && (
            <Link
              href="/tests/new"
              className={buttonVariants({ className: "mt-4" })}
            >
              Create your first test
            </Link>
          )}
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

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/patients/page.tsx src/app/tests/page.tsx
git commit -m "feat: scope dashboard and patient pages to current user, hide admin UI"
```

---

### Task 11: Assign Existing Patients to Admin User

**Files:**
- None (SQL command)

This task runs AFTER you first sign in with Google. The sign-in creates your User record.

- [ ] **Step 1: Sign in with Google**

Open `http://localhost:3000`, sign in with `haymatit@gmail.com` or `hay.matityaho@skai.io`.

- [ ] **Step 2: Find your user ID**

```bash
psql postgresql://haym@localhost:5432/psychassess -c "SELECT id, email FROM \"User\";"
```

- [ ] **Step 3: Assign orphaned patients to your user**

Replace `<YOUR_USER_ID>` with the ID from step 2:

```bash
psql postgresql://haym@localhost:5432/psychassess -c "UPDATE \"Patient\" SET \"userId\" = '<YOUR_USER_ID>' WHERE \"userId\" IS NULL;"
```

- [ ] **Step 4: Verify patients appear on dashboard**

Refresh `http://localhost:3000`. Your existing patients should now appear.

- [ ] **Step 5: Commit schema change to make userId required**

After confirming all patients have a userId, create a migration to make it non-nullable. Update `prisma/schema.prisma` — change the Patient model:

```prisma
  userId      String
  user        User     @relation(fields: [userId], references: [id])
```

(Remove the `?` from both `String?` and `User?`)

Then run:

```bash
npx prisma migrate dev --name make-patient-userid-required
```

```bash
git add prisma/
git commit -m "feat: make Patient.userId required after data migration"
```

---

### Task 12: Verify Full Flow

- [ ] **Step 1: Test unauthenticated access**

Open incognito browser → `http://localhost:3000` → should redirect to `/login`.

- [ ] **Step 2: Test sign-in**

Click "Sign in with Google" → complete OAuth → should land on dashboard with your patients.

- [ ] **Step 3: Test admin actions**

Navigate to Tests → "New Test" button should be visible. Create a test to verify.

- [ ] **Step 4: Test patient scoping**

Your patients should appear. Create a new patient → should be assigned to your user.

- [ ] **Step 5: Test sign-out**

Click "Sign Out" in header → should redirect to `/login`.

- [ ] **Step 6: Run build to verify no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds with no errors.
