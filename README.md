# Candidate & Vacancy Ranking System

Full-stack submission for Jobseeker.Company's Full Stack Engineer technical test.

Manages candidate profiles and job vacancies, and ranks candidates against a
vacancy's weighted criteria using a pluggable strategy registry.

> Confidential technical-test submission. Not for publication — see §14.

---

## 1. Tech stack

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js | 24 (>=24.11 required) |
| Backend | NestJS + Fastify adapter | 12.0.4 |
| ORM | TypeORM | 1.1.1 |
| Database | PostgreSQL | 17 |
| Cache | Redis | 8 |
| Validation | class-validator / class-transformer | 0.15.1 / 0.5.1 |
| Backend tests | Jest + ts-jest | 30.5.2 / 29.4.12 |
| Frontend | React + Vite + TypeScript | 19.3.0 / 8.3.0 / 6.0.3 |
| Routing | React Router | 8.4.0 |
| Server state | TanStack Query | 5.103.2 |
| Forms | React Hook Form + Zod | 7.88.0 / 4.6.5 |
| Styling | Tailwind CSS (CSS-first) | 4.3.3 |
| HTTP client | Axios | 1.20.0 |
| Containers | Docker + Compose | api / web / postgres / redis |

**TypeScript is pinned to 6.0.3 on purpose.** `typescript@latest` is 7.0.2, but
`ts-jest` declares `typescript: ">=4.3 <7"` and `@nestjs/cli@12` depends on
`~6.0.2`. Installing the latest breaks both the build and the test runner. See
`docs/STACK-CONSTRAINTS.md` for the full version rationale and the breaking-change
traps this repo already accounts for.

---

## 2. Prerequisites

- Node.js >= 24.11.0 and npm >= 11
- Docker + Docker Compose (for the containerised path, and for Postgres/Redis if
  you run the API on the host)

No local Postgres or Redis install is required — both come from Compose.

---

## 3. Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

That brings up, in order:

| Service | URL / port | Notes |
|---|---|---|
| `postgres` | `localhost:5432` | healthchecked via `pg_isready`, data on a named volume |
| `redis` | `localhost:6379` | healthchecked via `redis-cli ping` |
| `migrate` | — | one-shot; applies migrations then exits |
| `api` | http://localhost:3000 | waits for Postgres healthy, Redis healthy, and `migrate` to succeed |
| `web` | http://localhost:8080 | nginx serving the built SPA, proxying `/api` → `api:3000` |

Load the sample data:

```bash
docker compose --profile seed run --rm seed
```

Open http://localhost:8080 for the dashboard.

---

## 4. Running without Docker

```bash
npm install

# Postgres + Redis only
docker compose up -d postgres redis

npm run migration:run
npm run seed

# API on :3000 and the Vite dev server on :5173, together
npm run dev
```

Or separately:

```bash
npm run dev:api     # nest start --watch  → :3000
npm run dev:web     # vite                 → :5173
```

The Vite dev server proxies `/api/*` to `http://localhost:3000/*`, stripping the
`/api` prefix. The API itself has no prefix — the brief mandates `/candidates`
and `/vacancies` at the root.

---

## 5. Environment variables

Copy `.env.example` to `.env`. Compose reads it automatically.

| Variable | Default | Used by |
|---|---|---|
| `PORT` | `3000` | api |
| `NODE_ENV` | `development` | api |
| `DB_HOST` | `localhost` | api (Compose overrides to `postgres`) |
| `DB_PORT` | `5432` | api |
| `DB_USERNAME` | `postgres` | api |
| `DB_PASSWORD` | `postgres` | api |
| `DB_DATABASE` | `jobseeker_test` | api |
| `REDIS_HOST` | `localhost` | api (Compose overrides to `redis`) |
| `REDIS_PORT` | `6379` | api |
| `REDIS_RANKING_TTL_SECONDS` | `60` | api |
| `REDIS_CRITERIA_TTL_SECONDS` | `300` | api |
| `WEB_ORIGIN` | `http://localhost:5173,http://localhost:8080` | api CORS allow-list |
| `VITE_API_BASE_URL` | `/api` | web |

`.env` is gitignored. No credential is hardcoded in source; Compose reads
everything from the environment with non-secret local defaults.

---

## 6. Migrations and seed

```bash
npm run migration:run        # apply
npm run migration:revert     # roll back the last migration
npm run migration:show       # list applied/pending
npm run migration:generate -- src/database/migrations/<Name>
npm run seed                 # idempotent
```

Schema changes go through TypeORM migrations. `synchronize` is off everywhere.
The migration implements a real `down()`.

The seed uses fixed UUIDs and replaces each seeded vacancy's criteria, so running
it repeatedly is a no-op rather than a duplicate generator. Verified: two
consecutive runs leave exactly 4 candidates / 2 vacancies / 6 criteria.

---

## 7. API overview

All routes are at the root. No authentication (out of scope per the brief).

| Method | Path | Purpose | Success |
|---|---|---|---|
| `POST` | `/candidates` | Create a candidate | `201` |
| `GET` | `/candidates` | List candidates (paginated, searchable, sortable) | `200` |
| `GET` | `/candidates/:id` | Candidate detail | `200` |
| `PATCH` | `/candidates/:id` | Partial update | `200` |
| `DELETE` | `/candidates/:id` | Soft delete | `204` |
| `POST` | `/vacancies` | Create a vacancy with criteria | `201` |
| `GET` | `/vacancies` | List vacancies with criteria | `200` |
| `GET` | `/vacancies/:id` | Vacancy detail | `200` |
| `PATCH` | `/vacancies/:id` | Update vacancy / replace criteria | `200` |
| `DELETE` | `/vacancies/:id` | Delete vacancy (criteria cascade) | `204` |
| `GET` | `/vacancies/:vacancyId/ranking` | Rank candidates for the vacancy | `200` |

### Query parameters

List endpoints (`/candidates`, `/vacancies`): `page` (>=1, default 1), `limit`
(1–100, default 20), `search`, `sortBy`, `sortOrder` (`asc`|`desc`).
An unknown `sortBy` is rejected with `400` — it is never interpolated into SQL.

Ranking endpoint: `page`, `limit`, `search`, `minScore`.

### List envelope

```json
{
  "data": [ /* resources */ ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

Single-resource endpoints return the resource object directly.

### Error envelope

Every error, without exception:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Email must be valid" }],
  "timestamp": "2026-09-22T00:00:00.000Z",
  "path": "/candidates"
}
```

`errors` is `[]` for non-validation failures. A duplicate email is `409` with
`errors: [{ "field": "email", "message": "Email already exists" }]`. Unknown
failures are `500` with a generic message; the real error is logged server-side
and never returned.

Every response carries an `x-request-id` header (an inbound one is reused when
present), and that id appears in every log line for the request.

### Postman

`postman/jobseeker-technical-test.json` — import it, set `baseUrl`, and run the
folders top to bottom. `candidateId` and `vacancyId` are captured automatically
from the create responses.

---

## 8. Ranking

**Score = the sum of `weight` over every criterion the candidate matches.**
Criteria are boolean pass/fail; there is no partial credit.

| Criterion | Match condition |
|---|---|
| `AGE` | `minAge <= age <= maxAge`, inclusive. Age = completed years today. |
| `GENDER` | `ANY` always matches; otherwise exact equality with the candidate's gender. |
| `SALARY_RANGE` | `minSalary <= currentSalary <= maxSalary`, inclusive. |

Ordering: **score descending**, then **name ascending** (case-insensitive), then
`id` ascending so equal-name ties are still deterministic.

Processing order: score every active candidate → sort → apply `search` → apply
`minScore` → paginate. Candidates scoring `0` are retained unless `minScore > 0`.

Response:

```json
{
  "vacancy": { "id": "uuid", "name": "Junior Software Engineer" },
  "results": [
    {
      "candidateId": "uuid",
      "name": "Alice Adams",
      "email": "alice.adams@example.test",
      "score": 9,
      "matchedCriteria": [
        { "type": "AGE", "weight": 3, "matched": true },
        { "type": "GENDER", "weight": 1, "matched": true },
        { "type": "SALARY_RANGE", "weight": 5, "matched": true }
      ]
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 4, "totalPages": 1 }
}
```

### Seeded candidates — the deck's own example data

`docs/SAMPLE.md` carries the candidate, vacancy and ranking tables from the
assessment deck. The seed uses those candidates verbatim:

| Name | Email | Birthdate | Gender | Current salary |
|---|---|---|---|---|
| Siti Rahayu | siti.r@example.com | 1996-05-15 | FEMALE | 5,500,000 |
| Budi Santoso | budi.s@example.com | 1989-11-20 | MALE | 8,000,000 |
| Indah Lestari | indah.l@example.com | 2002-03-01 | FEMALE | 4,000,000 |

The two vacancies, their criteria and their weights also match the deck exactly.

### Ranking the seeded data

`docs/SAMPLE.md` is the source of truth and is never edited. It carries the
candidate data, the vacancy criteria and two expected rankings; the seed uses all
of it verbatim.

**Ranking Example 2 (Vacancy B) reproduces exactly**, asserted by
`test/unit/ranking-acceptance.spec.ts`:

| Vacancy | Ranking |
|---|---|
| Senior Data Scientist | Budi Santoso `12`, Indah Lestari `0`, Siti Rahayu `0` |

The alphabetical tie-break is demonstrated by its two candidates sitting on `0`.

**Ranking Example 1 (Vacancy A) reproduces two of its three scores**, because
`SAMPLE.md` contradicts itself:

- §2 puts Vacancy A's salary minimum at **Rp 4.500.000**
- §3 gives Indah Lestari a total of **9** (age `3` + gender `1` + salary `5`)
- §1 gives Indah a salary of **Rp 4.000.000**

For §3 to hold the minimum must be at most `4.000.000`. Both cannot be true. This
implementation keeps §2 as written and reports the consequence, rather than
editing the supplied fixture to make a derived example come out right:

| Vacancy A | This implementation | `SAMPLE.md` §3 |
|---|---|---|
| Siti Rahayu | `9` | `9` |
| Indah Lestari | `4` | `9` |
| Budi Santoso | `1` | `1` |
| Order | Siti, Indah, Budi | Indah, Siti, Budi |

The alternative is to set the minimum to `4.000.000`, which makes §3 reproduce
exactly including its `9-9` tie. That trades a written requirement for a derived
example, which is the spec owner's call rather than the implementer's, so the
criteria stand as written and the difference is surfaced instead.

**The deck's tables are a snapshot in time, not timeless.** Vacancy B scores Siti
Rahayu `0`, which holds only while she is under 30. She turns 30 on 2026-05-15 and
`30–45` is inclusive, so after that date she earns the age weight and the
published values stop reproducing. The acceptance suite pins `ClockService` to
`2026-04-15`, inside the window, and asserts the deck's numbers there.

> **Note on the ground truth.** `AGENTS.md` points at "Vacancy A / Vacancy B
> scoring tables in `docs/PRD.md` §6.3". `PRD.md` §6.3 is prose only; the tables
> themselves live in `docs/SAMPLE.md`.

---

## 9. Caching strategy

Redis caches the ranking result, not the candidate rows.

| Key | TTL |
|---|---|
| `ranking:v1:vacancy:<vacancyId>:results` | `REDIS_RANKING_TTL_SECONDS` (60s) |
| `ranking:v1:vacancy:<vacancyId>:criteria` | `REDIS_CRITERIA_TTL_SECONDS` (300s) |
| `ranking:v1:vacancy-index` (set of vacancy ids holding a cached ranking) | none |

Query parameters are **not** part of the key. Filtering, `minScore` and
pagination are applied in memory to the cached base ranking, which avoids a
cache-key explosion for what is a small, derived result set.

Invalidation:

| Mutation | Effect |
|---|---|
| Candidate created / updated / soft-deleted | every cached ranking is dropped (read the index set, delete all derived keys, drop the index) |
| Vacancy created | nothing to invalidate |
| Vacancy updated (incl. criteria replacement) | that vacancy's `results` + `criteria` keys dropped, id removed from the index |
| Vacancy deleted | same as above |

**Redis is fail-open.** Every cache operation is wrapped: on failure the service
logs exactly one `WARN` per request (carrying the request id) and serves from
Postgres. A Redis outage degrades latency, never correctness. Connect is lazy and
the offline queue is disabled, so a down Redis cannot hang a request.

No sensitive data is cached — only candidate id, name, email, score and matched
criteria weights, all of which are already in the ranking response.

---

## 10. Extending the criteria types

Criteria evaluation is a strategy registry. `RankingService` contains **no**
`if (criterion.type === 'AGE')` branching, and does not change when a new
criterion type is added.

```
src/ranking/strategies/
  criterion-strategy.interface.ts   ← CriterionStrategy { type; isMatch(candidate, criterion, asOf) }
  age-criterion.strategy.ts
  gender-criterion.strategy.ts
  salary-range-criterion.strategy.ts
  criterion-strategy.registry.ts    ← Map<CriterionType, CriterionStrategy>
```

To add, say, a minimum-years-of-experience criterion:

1. Add the enum member to `CriterionType`.
2. Add a strategy class implementing `CriterionStrategy`.
3. Register it in `ranking.module.ts` (one line) and in the registry.
4. Add the columns (or a JSONB `params` column) via a migration, and extend the
   criterion DTO + the shape CHECK constraint.

`RankingService.rank()` itself is untouched. The registry throws at startup if a
declared criterion type has no strategy, so a half-finished addition fails loudly
at boot rather than silently scoring every candidate zero.

---

## 11. Scalability

The design target is a correct, non-degenerate ranking at 100k+ candidates.

**What is implemented**

- **One query per cold ranking.** All active candidates load in a single query;
  criteria are loaded with the vacancy via `relations: { criteria: true }`. There
  is no database access inside the candidate loop and no N+1.
- **Pure in-memory evaluation.** Strategies are pure functions over already-loaded
  objects, so evaluation cost is `O(candidates x criteria)` with no I/O.
- **Database-side indexes** for the paths that actually filter: the partial unique
  index on `lower(email) WHERE deleted_at IS NULL`, and
  `idx_vacancy_criteria_vacancy_id` for the criteria join.
- **Caching** absorbs repeat reads of the same vacancy ranking.
- **Pagination** bounds the response payload; `limit` is capped at 100.
- **Separation of concerns** — ranking lives in its own module and service, not in
  the vacancy controller.

**Documented next steps, not implemented** (they add real complexity and are not
justified at this data volume):

- Push the SQL-expressible predicates (age range from `birthdate`, salary range)
  into the query as a pre-filter, so candidates that cannot possibly match are
  never loaded.
- Cursor-batch the candidate load (`WHERE id > :last ORDER BY id LIMIT n`) and
  stream into a bounded top-N heap when only the top results are wanted.
- For very large pools, compute the ranking as a background job and serve the last
  snapshot with a `recomputing` flag instead of scoring synchronously per request.
- Read replicas for Postgres once ranking read load dominates.

---

## 12. Testing

```bash
npm run test        # unit tests
npm run test:e2e    # e2e (requires Postgres + Redis, migrated)
npm run test:cov    # unit coverage
npm run lint        # oxlint
npm run format:check
npm run build
```

The API test script runs Jest through `node --experimental-vm-modules` because
Nest 12 ships ESM packages that Jest's CJS runtime must be told to load.

Covered:

| Area | Tests |
|---|---|
| Strategies | age bounds inclusive, gender `ANY`/match/mismatch, salary bounds inclusive |
| Ranking | scores for both seeded vacancies, alphabetical tie-break, zero-score retention |
| Cache | first call populates, second is served from cache, candidate mutation invalidates |
| Candidates | create, duplicate email `409`, invalid payload `400`, not found `404`, soft delete |
| Vacancies | criteria required, empty criteria rejected, default weight `1`, `min > max` rejected, per-type shape enforcement, transactional criteria replacement, not found `404` |
| HTTP | error envelope shape on validation, `404` and `409` paths |

E2E specs bootstrap the real `AppModule` and drive the Fastify instance through
`.inject()` — no supertest dependency.

---

## 13. Project structure

```
apps/
  api/                        NestJS + Fastify
    src/
      candidates/             DTOs, entity, service, controller
      vacancies/              DTOs, criterion validation, entity, service, controller
      ranking/                service, controller, strategies/ (registry + 3 strategies)
      common/                 error filter, validation pipe, correlation, logger, redis cache
      config/                 database + redis config
      database/               data-source, migrations, seed
      shared/                 enums, clock
    test/
      unit/                   strategy + ranking + cache tests
      e2e/                    candidate, vacancy, ranking endpoint tests
  web/                        React + Vite dashboard
    src/
      api/                    axios client, typed endpoint wrappers
      components/             layout, modal, toast, states, pagination, forms, tables
      pages/                  dashboard, candidates, vacancies, ranking
      lib/                    zod schemas, formatters
    nginx.conf
postman/
  jobseeker-technical-test.json
docs/
  PRD.md  SRS.md              source requirements
  STACK-CONSTRAINTS.md        version matrix + breaking-change notes
docker-compose.yml
```

---

## 14. Technical decisions and deviations

**Deliberate deviations from the source docs, with reasons:**

1. **Soft delete instead of hard delete.** `docs/PRD.md` §9 assumed hard delete,
   but the brief requires ranking "all **active** candidates", which only means
   something if candidates can be deactivated. Email uniqueness is therefore a
   partial index so a deleted candidate releases its email.
2. **A frontend was built.** `docs/PRD.md` §4 lists a UI as a non-goal. The later
   brief mandates it, so the brief wins.
3. **PostgreSQL 17 and Redis 8, not "PostgreSQL v8 / Redis v8".** Postgres 8 is a
   1998 release. The brief itself instructs using a modern stable version.
4. **The PRD §6.3 acceptance tables do not exist.** See the note in §8.
5. **No `@nestjs/config`, no cache-manager, no Recharts.** The first two were
   replaced by `dotenv` and a direct Redis client (the raw client is needed for
   per-vacancy key invalidation regardless); Recharts was optional in the brief
   and the ranking is a table, so it was dropped rather than carried.

**Other decisions worth naming:**

- CommonJS for the API, ESM for the web app. Nest 12's own CJS template keeps
  Jest and ts-jest on the supported path; the web side is native ESM.
- Numeric salaries with a column transformer, because `pg` returns `numeric` as a
  string and the API contract says number.
- Request correlation via Fastify's `genReqId` + `AsyncLocalStorage`, avoiding a
  logging dependency.
- `limit` is capped at 100 to bound the ranking payload.

---

## 15. Confidentiality notice

This repository is a dummy technical-test submission for Jobseeker.Company's Full
Stack Engineer recruitment process and will not be published. Results should be
submitted to `joinus@jobseeker.company`, `narasurya@jobseeker.company`, and
`yudi.hermawan@jobseeker.company`.
