# Project: TimeOrbit

## Architecture
TimeOrbit is a Next.js (App Router, React 19, Tailwind CSS v4, MongoDB/Mongoose) interactive global timezone explorer featuring a 3D WebGL globe, real-time city clocks, solar day/night calculators, interactive timezone comparison, and a developer REST API with API key provisioning, rate limiting, and admin review.

- **Frontend**: Next.js App Router (`src/app/`), React 19, Tailwind CSS v4, Three.js / WebGL (`src/components/globe/GlobeCanvas.tsx`), Lucide icons.
- **Backend / API**: Next.js Route Handlers (`src/app/api/`), Node.js runtime, Mongoose ODM (`src/models/`), JWT cookie authentication (`src/lib/auth.ts`), SHA-256 API key authentication & rate limiting (`src/lib/apiKey.ts`).
- **Core Domain Logic**: Astronomical solar calculations and timezone transformations (`src/lib/timeEngine.ts`, `src/lib/cities.ts`).
- **Testing Track**: Vitest test runner with native TypeScript / ESM support, mock Web API Requests, and deterministic unit/integration suites in `tests/`.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | ESLint & React 19 Hook Remediation | Resolve 22 errors and 20 warnings across 15 files (declaration hoisting, synchronous setState in effect, impure Date.now render, unused vars) | M1 | Survey (Explorer 1) |
| 2 | Security & Credentials Isolation | Purge hardcoded email and plaintext password in `src/app/login/page.tsx`, ensure .env.local strict isolation | M1 | Survey (Explorer 1) |
| 3 | TypeScript & Type Guard Remediation | Replace explicit `any` catch clauses and object records with typed / `unknown` error guards | M1 | Survey (Explorer 1) |
| 4 | Analytics Route Handler (`GET /api/analytics`) | Implement route handler querying `ApiLog` for summary stats, requests over time, endpoint breakdowns, and status distributions | M2 | Survey (Explorer 2) |
| 5 | Dual-Mode Authentication for Analytics | Support both JWT session cookie (`timeorbit_token`) and API key header (`x-api-key` / `Authorization: Bearer`), with role-based scoping (user vs admin/global) | M2 | Survey (Explorer 2) |
| 6 | API Error Logging Enforcement | Extend `/api/v1/time` and `/api/v1/compare` to log non-200 responses (e.g. 404) to `ApiLog` so status distribution accurately reflects traffic | M2 | Survey (Explorer 2) |
| 7 | User Dashboard Analytics Integration | Wire `/dashboard` to fetch user metrics from `/api/analytics` and render telemetry cards & pure React/Tailwind/SVG visualizations | M2 | Survey (Explorer 2) |
| 8 | Admin Dashboard Analytics Integration | Wire `/admin` to fetch global metrics from `/api/analytics?scope=global` and render comprehensive usage & latency telemetry | M2 | Survey (Explorer 2) |
| 9 | Timeline Scrubber & Boundary Precision | Fix half-hour timezone rounding bug in `src/app/compare/page.tsx` and add date boundary (+1 Day / -1 Day) badges | M3 | Survey (Explorer 3) |
| 10 | 3D WebGL Globe Constellation & Polish | Expand `GlobeCanvas.tsx` with all 27 city constellation micro-markers, active pin highlights, and smooth camera refocusing | M3 | Survey (Explorer 3) |
| 11 | Automated Test Harness (`vitest`, `npm test`) | Configure Vitest (`vitest.config.ts`, `package.json` test script) for fast in-memory execution | M4 | Survey (Explorer 3) |
| 12 | `timeEngine.ts` Automated Test Suite | Unit tests covering UTC conversions, negative offsets, fractional offsets, DST transitions, solar cycles, day boundaries, and leap years | M4 | Survey (Explorer 3) |
| 13 | `apiKey.ts` Rate Limiting & Auth Test Suite | Implement rate limit enforcement in `src/lib/apiKey.ts` and test key generation, hashing, statuses, and 429 exhaustion | M4 | Survey (Explorer 3) |
| 14 | REST Endpoints Automated Verification | Functional in-memory test suite for `/api/v1/time`, `/api/v1/compare`, `/api/v1/zones`, and `/api/analytics` | M4 | Survey (Explorer 3) |
| 15 | Three.js Celestial Stage Engine | Full-screen 100vh 3D space stage with Earth day/night procedural lighting, night city lights, 2,000 deep space stars, Moon orbit, Sun zenith, and flight arcs | M5 | User Request |
| 16 | 48 Global Metropolitan Hubs & GPS | Expand city directory to 48 worldwide hubs across 6 continental regions with browser GPS auto-detection | M5 | User Request |
| 17 | Shortest-Path Camera Normalization | Angle normalization `((((lng - current) % 360) + 540) % 360) - 180` to prevent multi-turn spinning when switching locations | M5 | User Request |
| 18 | Synchronized Dual Clocks Dock | Redesign bottom floating dock with synchronized column grid, custom `<ChevronDown />` selects, and centered time difference summary | M5 | User Request |
| 19 | Continuous Orbit Auto-Rotation Fix | Eliminate tick-induced snapback in auto-rotation via target change ref tracking and memoized location objects | M5 | User Request |
| 20 | Slide-Out Celestial Observatory Panel | Live astronomical telemetry panel with solar elevation, azimuth, dawn/dusk twilight times, and lunar illumination metrics | M5 | User Request |
| 21 | Windows Desktop Live Wallpaper | Standalone offline 3D Earth WebGL live wallpaper (`wallpaper/index.html`) compatible with Lively Wallpaper and Wallpaper Engine | M6 | User Request |
| 22 | Dual City Dropdowns & Fast Swap | Interactive glassmorphic dropdowns in the floating dock allowing dynamic Origin and Target city selection with localStorage persistence | M6 | User Request |
| 23 | Universal Cross-Platform CORS | Configured `vercel.json` with permissive headers for seamless integration with Android/Flutter mobile apps and Windows desktop apps | M6 | Architecture |
| 24 | Enterprise Token Bucket Rate Limiter | $O(1)$ in-memory mathematical rate limiting with continuous replenishment ($\Delta t \times r$), burst capacity, and LRU stale eviction | M7 | Architecture |
| 25 | Token Bucket Automated Test Suite | Comprehensive unit suite (`tests/tokenBucket.test.mjs`) covering burst limits, continuous refill, variable costs, tenant isolation, and eviction | M7 | Testing |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Code Quality, Security & Lint Remediation | Resolve all 42 ESLint problems (22 errors, 20 warnings), fix React 19 hook violations, purge leaked credentials from login page, verify `npm run lint` and `tsc --noEmit` clean | none | DONE |
| M2 | API Analytics & Dashboard Integration | Implement `src/app/api/analytics/route.ts` with dual auth, role scoping, MongoDB aggregations, update route logging, wire user and admin dashboards | M1 | DONE |
| M3 | Feature Polish & UI Enhancements | Fix half-hour timezone scrubber math and add day boundary indicators in `compare/page.tsx`, polish `GlobeCanvas.tsx` constellation markers and camera controls | M1 | DONE |
| M4 | Automated Test Suite & E2E Hardening | Configure test runner, implement rate limiting in `apiKey.ts`, build comprehensive test suites for `timeEngine`, `apiKey`, and all REST endpoints with 100% pass rate | M1, M2 | DONE |
| M5 | 3D Space Celestial Stage & UI Redesign | Full 100vh Three.js celestial stage, 48 global cities, shortest-path camera navigation, synchronized clocks dock, uninterrupted auto-rotation, and space theme | M3, M4 | DONE |
| M6 | Desktop Live Wallpaper & Cross-Platform | Offline WebGL 3D live wallpaper (`wallpaper/`), dual city dropdowns, header-free clean view, `/wallpaper` route, and universal CORS (`vercel.json`) | M5 | DONE |
| M7 | Token Bucket Traffic Shaping Engine | $O(1)$ Token Bucket algorithm in `src/lib/tokenBucket.ts`, burst handling, continuous refill, dual-engine router, and 72-test suite | M4, M6 | DONE |

---

## Interface Contracts

### 1. Analytics API Contract (`GET /api/analytics`)
- **Headers**:
  - `Cookie: timeorbit_token=<jwt>` OR
  - `x-api-key: <to_live_...>` OR `Authorization: Bearer <to_live_...>`
- **Query Parameters**:
  - `scope`: `'me'` (default) or `'global'` (requires admin privileges, 403 otherwise).
  - `range`: `'24h'` | `'7d'` | `'30d'` (default: `'7d'`).
- **Response Format (`200 OK`)**:
  ```json
  {
    "success": true,
    "scope": "me",
    "range": "7d",
    "summary": {
      "totalRequests": 1420,
      "avgResponseTimeMs": 42.5,
      "minResponseTimeMs": 8,
      "maxResponseTimeMs": 310,
      "successRate": 99.2
    },
    "requestsOverTime": [
      { "date": "2026-10-20", "count": 210, "avgLatency": 40.1 },
      { "date": "2026-10-21", "count": 340, "avgLatency": 45.3 }
    ],
    "endpointBreakdown": [
      { "endpoint": "/api/v1/time", "count": 920, "percentage": 64.8 },
      { "endpoint": "/api/v1/compare", "count": 500, "percentage": 35.2 }
    ],
    "statusDistribution": [
      { "status": 200, "count": 1408, "percentage": 99.2 },
      { "status": 404, "count": 12, "percentage": 0.8 }
    ],
    "recentLogs": [
      {
        "id": "...",
        "endpoint": "/api/v1/time",
        "method": "GET",
        "statusCode": 200,
        "responseTimeMs": 35,
        "createdAt": "2026-10-23T16:00:00.000Z"
      }
    ]
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: Neither valid session token nor valid API key provided.
  - `403 Forbidden`: Non-admin user requesting `scope=global`.

### 2. Rate Limiting Contract (`src/lib/apiKey.ts` & `src/lib/tokenBucket.ts`)
- **Function**: `checkRateLimit(keyId: string | Types.ObjectId, limitPerMinute: number = 60, options?: { algorithm?: 'token_bucket' | 'sliding_window'; cost?: number; burstMultiplier?: number }): Promise<RateLimitResult>`
- **Token Bucket Engine (`src/lib/tokenBucket.ts`)**: $O(1)$ constant-time calculation replenishing $\frac{\text{limitPerMinute}}{60}\text{ tokens/sec}$ continuously. Supports bursts up to bucket capacity and automatic memory eviction.
- **Sliding Window Log Engine**: Rolling 60-second window count against `ApiLog` for strict database audit verification.

### 3. Automated Test Command Contract
- Command: `npm test`
- Runner: Node ESM Test Runner with Web API loader
- Total Tests: **72 passed, 0 failed (100%)**
- Test Coverage:
  - `timeEngine.test.mjs` (8 tests)
  - `apiKey.test.mjs` (8 tests)
  - `tokenBucket.test.mjs` (9 tests)
  - `endpoints.test.mjs` (7 tests)
  - `analytics_empirical_challenge.mjs` (29 tests)
  - `adversarial_telemetry_stress.mjs` (11 tests)

---

## Code Layout
```
c:\Users\rajaa\Desktop\website\
├── package.json                   # Dependencies, build/lint/test scripts
├── vercel.json                    # Universal CORS configuration
├── wallpaper\                     # Standalone Windows desktop live wallpaper
│   ├── index.html                 # Offline WebGL Three.js Earth
│   ├── LivelyProperties.json      # Lively Wallpaper manifest
│   └── README.md
├── src\
│   ├── app\
│   │   ├── page.tsx               # Homepage with 3D globe & city clocks
│   │   ├── compare\page.tsx       # Timezone comparison matrix & scrubber
│   │   ├── wallpaper\page.tsx     # Clean full-screen web wallpaper
│   │   ├── dashboard\page.tsx     # Developer API keys & usage telemetry
│   │   ├── admin\page.tsx         # Admin control panel & global metrics
│   │   ├── login\page.tsx         # User authentication form
│   │   ├── api\
│   │   │   ├── analytics\route.ts # Analytics aggregation route
│   │   │   ├── v1\
│   │   │   │   ├── time\route.ts
│   │   │   │   ├── compare\route.ts
│   │   │   │   └── zones\route.ts
│   │   │   └── ...
│   ├── components\
│   │   ├── globe\GlobeCanvas.tsx  # 3D WebGL globe interactive canvas
│   │   ├── layout\Navbar.tsx
│   │   └── ...
│   ├── lib\
│   │   ├── timeEngine.ts          # Core astronomical & timezone calculator
│   │   ├── cities.ts              # 70+ global cities catalog
│   │   ├── tokenBucket.ts         # O(1) Token Bucket rate limiting engine
│   │   ├── apiKey.ts              # Key generation, hashing, rate limiter router
│   │   ├── auth.ts                # Session verification
│   │   └── mongodb.ts
│   └── models\
│       ├── ApiKey.ts
│       ├── ApiLog.ts
│       └── User.ts
└── tests\                         # Automated test suites (72 tests)
    ├── timeEngine.test.mjs
    ├── apiKey.test.mjs
    ├── tokenBucket.test.mjs
    ├── endpoints.test.mjs
    ├── analytics_empirical_challenge.mjs
    └── adversarial_telemetry_stress.mjs
```
