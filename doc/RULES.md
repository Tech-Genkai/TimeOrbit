# Engineering Rules & Contribution Guidelines — TimeOrbit 📋

> **Purpose**: Standardize engineering workflows, preserve cryptographic security, maintain zero-error code quality, and provide clear rules for open-source contributors.

---

## 1. Core Principles

1. **Zero Credential Commitment**: No passwords, tokens, API keys, or private database connection strings may ever be committed to git, regardless of whether a repository is public or private.
2. **Deterministic Quality Gating**: No pull request or commit may merge unless `npm run lint`, `npx tsc --noEmit`, and `npm test` execute with 100% success and zero warnings.
3. **No External Runtime Time Computation**: Core timezone, astronomical solar cycle, and offset calculations must rely solely on native Node.js / JavaScript engine primitives (`Intl.DateTimeFormat`, trigonometric math) without third-party timezone libraries.
4. **Resilient Error Handling**: Never catch errors with untyped `any`. Always use `catch (error: unknown)` and narrow with `error instanceof Error`.

---

## 2. Environment Variables & Secret Management

- **Local Secrets File**: Stored exclusively in `.env.local`.
- **Public Template File**: Stored in `.env.example` with sanitized placeholder values only.
- **Git Protection**: `.gitignore` must retain the wildcard pattern:
  ```gitignore
  .env*
  !.env.example
  ```
- **Required Variables**:
  | Variable | Purpose | Example / Format |
  |---|---|---|
  | `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://<user>:<pwd>@cluster...` |
  | `JWT_SECRET` | Secret key for signing session tokens | 64+ char random hex or string |
  | `NEXT_PUBLIC_APP_URL` | Canonical application URL | `http://localhost:3000` |
  | `ADMIN_EMAIL` | Initial super admin email account | `admin@example.com` |
  | `ADMIN_PASSWORD` | Initial super admin seed password | Strong alphanumeric string |

---

## 3. Code Style & TypeScript Standards

### 3.1 React 19 & Next.js Conventions
- **Client vs. Server Components**: Only mark a file `'use client'` if it utilizes browser event listeners, React hooks (`useState`, `useEffect`, `useRef`), or interactive state. Static layouts (such as [`Footer.tsx`](file:///c:/Users/rajaa/Desktop/website/src/components/layout/Footer.tsx)) must remain Server Components.
- **No Unstable Values in Prerenders**: Never call `new Date()` or `Math.random()` directly in the JSX body of a Client Component during prerendering. Use `useEffect` or compute within Server Components.
- **Dynamic Route Handlers**: Every API route handler that inspects cookies or headers must declare:
  ```typescript
  export const dynamic = 'force-dynamic';
  ```

### 3.2 Error Narrowing
```typescript
// ❌ REJECTED
} catch (error: any) {
  console.log(error.message);
}

// ✅ MANDATORY
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  console.error(message);
}
```

### 3.3 Hook Hoisting & Immutability
- Always declare helper functions (e.g. `fetchData`, `checkAuth`) **above** or inside the `useEffect` hooks that call them.
- Avoid synchronous `setState` in effect bodies that cause cascading renders.

---

## 4. Git Workflow & Commit Guidelines

1. **Branching Model**:
   - `main`: Production-ready release branch.
   - `feature/<feature-name>`: Scoped feature development.
   - `fix/<bug-name>`: Targeted bug remediation.
2. **Commit Message Format (Conventional Commits)**:
   ```text
   feat: add dynamic +1 day boundary indicators in comparison scrubber
   fix: eliminate hook declaration hoisting in admin dashboard
   test: add leap year boundary tests for timeEngine
   docs: add architecture and engineering rules
   ```
3. **Pre-Push Checklist**:
   - [ ] Run `npx tsc --noEmit` ➔ 0 errors.
   - [ ] Run `npm run lint` ➔ 0 errors, 0 warnings.
   - [ ] Run `npm test` ➔ 63/63 tests passing.
   - [ ] Run `git status` ➔ confirm no `.env.local` or sensitive files are staged.

---

## 5. Security & Review Rules

- **Zero Tolerance for Bypass Directives**: Pull requests introducing `// eslint-disable` or `@ts-ignore` comments without explicit architecture committee sign-off will be rejected automatically.
- **API Key Handling**: API keys must be hashed using SHA-256 before storage or query matching. Raw keys must never be logged or echoed in server logs.
- **Rate Limit Enforcement**: Any new public endpoint must integrate `checkRateLimit` from `@/lib/apiKey`.
