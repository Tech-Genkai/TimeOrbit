# E2E Test Infra: TimeOrbit

## Test Philosophy
- Requirement-driven, opaque-box & deterministic unit/integration testing.
- Test suites must execute rapidly and reliably without external database dependencies by mocking Mongoose models and utilizing standard Web API Request/Response abstractions.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Scenarios.

---

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Scenario) |
|---|---------|----------------------|:-----------------:|:-----------------:|:----------------------:|:-----------------:|
| F1 | `timeEngine.getCityTime` | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F2 | `timeEngine.calculateSolarState` | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F3 | `timeEngine.compareCities` | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F4 | `apiKey.generateApiKey` | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F5 | `apiKey.hashApiKey` | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F6 | `apiKey.validateApiKey` | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F7 | `apiKey.checkRateLimit` | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F8 | `GET /api/v1/time` | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F9 | `GET /api/v1/compare` | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F10 | `GET /api/v1/zones` | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F11 | `GET /api/analytics` | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |

---

## Test Architecture
- **Test Runner**: Vitest (`vitest run`), configured in `vitest.config.ts`.
- **Environment**: Node environment with Web API globals (`Request`, `Response`, `Headers`, `crypto`, `Intl`).
- **Path Aliases**: `@/*` mapped to `src/*`.
- **Mocking**: Model mocks for `ApiKey` and `ApiLog` via Vitest `vi.mock()`.
- **Location**: All tests located under `tests/`:
  - `tests/timeEngine.test.ts`
  - `tests/apiKey.test.ts`
  - `tests/endpoints.test.ts`

---

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | International Remote Team Coordination across New York, London, and Tokyo on New Year's Eve | F1, F3, F8, F9 | High |
| 2 | Astronomical Solar Tracking at Equator vs. Arctic Circle during Summer & Winter Solstices | F1, F2 | High |
| 3 | Full Developer API Key Lifecycle: Generation, Hash Verification, Status Gating (Pending -> Approved -> Revoked) | F4, F5, F6 | Medium |
| 4 | High-Frequency API Burst & Rate-Limit 429 Exhaustion Simulation | F6, F7, F8 | High |
| 5 | Enterprise Analytics Aggregation: Telemetry Query with Dual Auth (JWT & API Key) & Role Scoping | F6, F11 | High |

---

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature covering standard operational happy paths.
- Tier 2: ≥5 boundary & corner cases per feature (negative UTC offsets, fractional +05:30/+05:45 offsets, day boundaries, leap year 2024-02-29, midnight/noon transitions, rate limit exhaustion).
- Tier 3: Pairwise interaction coverage (API Key Auth + Time conversion; API Key Auth + Rate Limiting + Analytics logging).
- Tier 4: ≥5 realistic end-to-end workload application scenarios.
- Command: `npm test` executes with 100% pass rate.
