# Google Auth & User Scoping — Design Spec

## Overview

Add Google Sign-In to PsychAssess with role-based access control. All users can view tests, only admins can manage tests, and each user sees only their own patients.

## Requirements

- Google OAuth is the only auth method
- Admin emails are hardcoded: `haymatit@gmail.com`, `hay.matityaho@skai.io`
- First Google sign-in auto-creates the user account
- Tests: all authenticated users can view; only admins can create/edit/delete
- Patients: each user sees only their own patients (admins included — no global view)
- Assessments: scoped to their parent patient, so inherently user-scoped

## Approach

NextAuth.js (Auth.js) with the Prisma adapter and Google provider. This handles OAuth flow, session management, and user storage with minimal custom code.

## Data Model Changes

### New Models (required by NextAuth Prisma adapter)

**User** — `id`, `name`, `email` (unique), `emailVerified`, `image`, `createdAt`, `updatedAt`

**Account** — OAuth provider tokens, linked to User via `userId`

**Session** — server-side sessions, linked to User via `userId`

**VerificationToken** — required by adapter schema, not actively used

### Modified Models

**Patient** — add `userId` (String, foreign key to User). Each patient belongs to the user who created them.

### Admin Check

A utility function, not a database column:

```
const ADMIN_EMAILS = ["haymatit@gmail.com", "hay.matityaho@skai.io"]
isAdmin(email: string) => ADMIN_EMAILS.includes(email)
```

## Auth Configuration

- **NextAuth config** at `src/lib/auth.ts` — Google provider, Prisma adapter, session callback that exposes `userId` and `email` on the session object
- **API helper** `getRequiredSession()` — wraps `getServerSession()`, returns 401 if unauthenticated
- **Admin helper** `requireAdmin(session)` — returns 403 if not admin

### Environment Variables

- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `NEXTAUTH_SECRET` — random string for JWT encryption
- `NEXTAUTH_URL` — `http://localhost:3000` in dev

Google OAuth credentials must be created at console.cloud.google.com > APIs & Services > Credentials > OAuth 2.0 Client ID. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.

## Middleware

`src/middleware.ts` — protects all routes except:
- `/login` (sign-in page)
- `/api/auth/*` (NextAuth endpoints)
- Static assets (`_next`, favicons, etc.)

Unauthenticated requests redirect to `/login`.

## Sign-In Page

`src/app/login/page.tsx` — minimal page with a "Sign in with Google" button. Uses `signIn("google")` from `next-auth/react`. Redirects to home after successful auth.

## Authorization Rules

### API Routes

| Route | Auth | Rule |
|-------|------|------|
| `GET /api/tests` | any user | all tests visible |
| `POST /api/tests` | admin | create test |
| `PUT/DELETE /api/tests/[testId]` | admin | edit/delete test |
| `POST /api/tests/generate-rules` | admin | AI rule generation |
| `GET /api/patients` | any user | filter by `userId = session.user.id` |
| `POST /api/patients` | any user | set `userId = session.user.id` |
| `GET/PUT/DELETE /api/patients/[patientId]` | any user | verify patient.userId === session.user.id |
| `POST /api/patients/[patientId]/assessments` | any user | verify patient ownership first |
| `GET /api/patients/[patientId]/export` | any user | verify patient ownership first |
| `POST /api/scoring` | any user | stateless, no ownership check |

### UI Changes

- Test list page: hide "Create Test" button for non-admins
- Test detail page: hide edit/delete actions for non-admins
- Patient list: automatically filtered to current user (no UI change needed beyond the API filter)
- Header/layout: show user avatar, name, and sign-out button

## Migration Strategy

1. Add NextAuth tables (`User`, `Account`, `Session`, `VerificationToken`) via Prisma migration
2. Add `userId` column to `Patient` as **nullable** initially
3. After first admin sign-in, run a SQL command to assign existing orphaned patients to the admin's user ID:
   ```sql
   UPDATE "Patient" SET "userId" = '<your-user-id>' WHERE "userId" IS NULL;
   ```
4. Create a follow-up migration to make `userId` required (non-nullable) on Patient

## Dependencies to Add

- `next-auth` — OAuth and session management
- `@next-auth/prisma-adapter` — auto-manages auth tables in Prisma
