# Stack Constraints — FROZEN

Verified against the npm registry on 2026-09-22. **Do not change a version, do not
`npm install <pkg>@latest`, do not add a dependency not listed here.** If you think a
package is missing, say so instead of installing it.

---

## 1. Exact version matrix

### Root (devDependencies)
| Package | Version |
|---|---|
| typescript | `6.0.3` |
| oxlint | `1.85.0` |
| concurrently | `10.0.5` |

### `apps/api`
| Package | Version |
|---|---|
| @nestjs/common | `12.0.4` |
| @nestjs/core | `12.0.4` |
| @nestjs/platform-fastify | `12.0.4` |
| @nestjs/typeorm | `12.0.1` |
| typeorm | `1.1.1` |
| pg | `8.23.0` |
| reflect-metadata | `0.2.2` |
| rxjs | `7.8.2` |
| class-validator | `0.15.1` |
| class-transformer | `0.5.1` |
| redis | `6.2.1` |
| dotenv | `18.0.2` |
| *dev* @nestjs/cli | `12.0.3` |
| *dev* @nestjs/schematics | `12.0.4` |
| *dev* @nestjs/testing | `12.0.4` |
| *dev* jest | `30.5.2` |
| *dev* ts-jest | `29.4.12` |
| *dev* ts-node | `10.9.2` |
| *dev* @types/node | `24.13.6` |
| *dev* @types/jest | `30.0.0` |
| *dev* @types/pg | `8.23.1` |

### `apps/web`
| Package | Version |
|---|---|
| react | `19.3.0` |
| react-dom | `19.3.0` |
| react-router | `8.4.0` |
| @tanstack/react-query | `5.103.2` |
| react-hook-form | `7.88.0` |
| zod | `4.6.5` |
| @hookform/resolvers | `5.9.1` |
| axios | `1.20.0` |
| *dev* vite | `8.3.0` |
| *dev* @vitejs/plugin-react | `6.1.1` |
| *dev* tailwindcss | `4.3.3` |
| *dev* @tailwindcss/vite | `4.3.3` |
| *dev* @types/react | `19.3.0` |
| *dev* @types/react-dom | `19.3.0` |
| *dev* typescript | `6.0.3` |

### BANNED — do not install, ever
- `typescript@7.x` — **`ts-jest` peer is `typescript: ">=4.3 <7"`** and `@nestjs/cli@12`
  depends on `typescript: ~6.0.2`. TS 7 breaks `nest build` **and** the test runner.
- `react-router-dom` — **removed in React Router 8.** Use `react-router`.
- `cache-manager`, `@nestjs/cache-manager`, `@keyv/redis`, `cache-manager-redis-yet`,
  `cache-manager-ioredis-yet`, `ioredis` — we use the `redis` client directly (see §4).
- `@nestjs/config` — use `dotenv` directly.
- `recharts` — brief says "if needed"; it is not needed. Ranking is a table.
- `@tanstack/react-query-devtools`, `eslint`, `prettier`, `@nestjs/mapped-types`,
  `@nestjs/swagger`, `@nestjs/terminus`, `helmet`, `passport`, any auth package.
- `nx`, `turbo`, `lerna`, `pnpm` — plain npm workspaces only.

---

## 2. Runtime
Node `24.18.0`, npm `11.16.0`. Engines: `node >=24.11.0` (TypeORM 1.x floor).

**Module system:** `apps/api` is **CommonJS** (no `"type": "module"`). `apps/web` is
**ESM** (`"type": "module"`). Nest 12 packages ship ESM; Node 24 resolves them from CJS
via `require(esm)`, which is why the API test script must run Jest through
`node --experimental-vm-modules`.

---

## 3. Backend gotchas — these WILL bite if ignored

### TypeORM 1.1.1 (breaking vs the 0.3.x API most examples show)
- `relations` **object syntax only**. `relations: ['criteria']` **throws**. Use
  `relations: { criteria: true }`.
- `select` **object syntax only**. `select: ['id']` throws. Use `select: { id: true }`.
- `invalidWhereValuesBehavior` defaults to **`throw`**. `findOneBy({ email: undefined })`
  now throws instead of silently matching everything. Guard for undefined explicitly.
- `.env` **auto-load is removed**, and `TYPEORM_*` env config is gone. Load dotenv yourself.
- `Repository.exist()` → `exists()`.
- `nullable: false` on a `@ManyToOne` now produces an **INNER JOIN**.
- **`@CreateDateColumn()` with no `type` produces `timestamp`, not `timestamptz`.**
  Always pass `{ type: 'timestamptz' }` explicitly.
- `@PrimaryGeneratedColumn('uuid')` generates the UUID in the app, not the DB.
- `cascade: true` cascades **remove** too. Use `cascade: ['insert', 'update']`.
- CLI bins: `typeorm-ts-node-commonjs` (CJS), `typeorm-ts-node-esm` (ESM). Migration
  commands need `-d <data-source path>`.

### NestJS 12 + Fastify 5.12.5
- `app.listen(port, hostname)` — **port first, then host**. Not an options object.
  In Docker you **must** pass `'0.0.0.0'` or the container is unreachable.
- Fastify's default CORS allows **only safelisted methods** (GET/HEAD/POST). PUT, PATCH
  and DELETE must be listed explicitly in `enableCors({ methods: [...] })`.
- Fastify 5 uses path-to-regexp 8: `(.*)` is invalid. Use `/*splat` or `/{*splat}`.
- `NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({...}))`.
- `PipeTransform` / `ArgumentMetadata` are now **generic** in Nest 12.

### ValidationPipe (class-validator 0.15.1)
- `transform: true` is **mandatory** or `@Type()` never runs and `@ValidateNested`
  silently passes on plain objects. This is the single most common mistake.
- `stopAtFirstError` defaults to **`false`**. (Nest's own JSDoc claiming "enabled by
  default" is wrong — set it explicitly.)
- `forbidUnknownValues` defaults to **`true`**.
- `ValidationPipeOptions` in Nest 12 gained `errorFormat: 'list' | 'grouped'`, plus
  `validatorPackage` / `transformerPackage` for ESM interop.
- The error flattener **must recurse into `ValidationError.children`**, and must handle
  nodes where `constraints` is `undefined` (parent nodes of nested errors). A flat
  `errors.map(e => e.constraints)` flattener drops nested errors and crashes.

---

## 4. Redis — direct client, no wrapper

Use `redis@6.2.1` (`createClient`) inside one small `RankingCacheService`. Rationale:
we need raw `SCAN`/`UNLINK` for per-vacancy pattern invalidation anyway, so a wrapper
library would only add an ESM-only dependency and a failure-mode footgun without saving
code.

Non-negotiable behaviours:
- `client.on('error', ...)` **must** be attached, or an unhandled error event crashes the
  process.
- Redis failures are **non-fatal**: every cache read/write/delete is wrapped, logs exactly
  one `WARN` per request (with the request id), and falls back to PostgreSQL. Ranking
  correctness must never depend on Redis.
- Connect **lazily / non-blocking**: bootstrap must not await Redis, and a down Redis must
  not hang requests. Disable the offline queue so commands fail fast instead of queueing.
- TTL: ranking `60s`, vacancy criteria `300s`.

---

## 5. Frontend gotchas

- **React Router 8:** `react-router-dom` does not exist. `RouterProvider` and
  `HydratedRouter` come from `react-router/dom`; `createBrowserRouter`, `Outlet`, `Link`,
  `useNavigate` come from `react-router`. Router is created **once, outside React**.
- **Tailwind v4 is CSS-first.** `@import "tailwindcss";` + `@theme { }` in CSS, and the
  `@tailwindcss/vite` plugin. There is **no** `tailwind.config.js`, **no**
  `postcss.config.js`, **no** `content: []` array, **no** `@tailwind base/components/utilities`.
- **No `src/vite-env.d.ts`** — the template sets `"types": ["vite/client"]` in
  `tsconfig.app.json`. To type custom env vars, augment `ImportMetaEnv` in a d.ts with
  **no top-level import**.
- **Zod 4:** use `error.issues` (`error.errors` is gone). Top-level `z.email()` and
  `z.iso.date()`. Use `{ error: '...' }` instead of `message` / `errorMap`.
- **`@hookform/resolvers` 5:** `useForm` generic is `<Input, Context, Output>`. If a
  schema uses `.default()` / `z.coerce`, input and output types diverge — either pass all
  three generics or omit the generic entirely.
- **TanStack Query v5:** object form only; `onSuccess`/`onError` on `useQuery` are
  **removed** (mutations keep them). `invalidateQueries({ queryKey: [...] })` matches by
  **prefix**.
- **Vite 8 is Rolldown-based:** `build.rollupOptions` → `build.rolldownOptions`;
  `output.manualChunks` **object form is removed and throws**.
- **React 19:** `ref` is a plain prop — no `forwardRef`. A ref callback returning a
  non-function is an error. `propTypes` / `defaultProps` on function components are gone.
- Axios: do **not** convert an abort into an app error — TanStack Query treats
  `CanceledError` as cancellation.

---

## 6. Architecture rules (hard, graded)

- Criteria evaluation goes through the **strategy registry**.
  `RankingService` must contain **no** `if (criterion.type === 'AGE')`-style branching.
  Adding a criterion type = new strategy class + one registry line. Nothing else.
- `RankingService` must not touch the DB or cache inside the candidate loop. One query
  loads the active candidates; evaluation is pure and in-memory.
- No `as any`, no `@ts-ignore`, no `@ts-expect-error`. Strict TS.
- No per-candidate / per-criterion logging. Batch-level summaries only.
- NestJS HTTP exceptions only (`NotFoundException`, `ConflictException`, ...), never
  `throw new Error()`.
- No authentication. No payments. No features outside the brief.
- No empty `TODO` in a shipped path.

---

## 7. Domain contract — freeze this

### Ranking
Score = sum of `weight` for each criterion the candidate matches.
- Age: `minAge <= age <= maxAge`, **inclusive**; age = completed years as of "today".
- Salary: `minSalary <= currentSalary <= maxSalary`, **inclusive**.
- Gender: `ANY` always matches; otherwise exact equality.
- Sort: score **DESC**, then `name` **ASC** (alphabetical, case-insensitive), then `id` ASC
  for full determinism.
- Score `0` candidates **remain in the results**.
- Order of operations: score all → sort → apply `search` → apply `minScore` → paginate.

### Ranking response
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

### List envelope — frozen
`GET /candidates` and `GET /vacancies` both return:
```json
{
  "data": [ /* resources */ ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```
Query params on both: `page` (int ≥ 1, default 1), `limit` (int 1–100, default 20),
`search` (case-insensitive substring — candidates: `name` or `email`; vacancies: `name`),
`sortBy`, `sortOrder` (`asc` | `desc`, default `asc`).
- candidate `sortBy`: `name` | `email` | `currentSalary` | `birthdate` | `createdAt`
- vacancy `sortBy`: `name` | `createdAt`

Anything not in the allowed `sortBy` list is rejected with `400` — never interpolated into SQL.

### Single-resource responses — frozen
- `GET /candidates/:id`, `GET /vacancies/:id` → the resource object directly (not wrapped).
- `POST` → `201` + the created resource.
- `PATCH` → `200` + the updated resource.
- `DELETE` → `204`, empty body.

### Error envelope — every error, no exceptions```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Email must be valid" }],
  "timestamp": "2026-09-22T00:00:00.000Z",
  "path": "/candidates"
}
```

### Seed data — the deck's own candidates (`docs/SAMPLE.md`)
| Name | Email | Birthdate | Gender | Salary |
|---|---|---|---|---|
| Siti Rahayu | siti.r@example.com | 1996-05-15 | FEMALE | 5,500,000 |
| Budi Santoso | budi.s@example.com | 1989-11-20 | MALE | 8,000,000 |
| Indah Lestari | indah.l@example.com | 2002-03-01 | FEMALE | 4,000,000 |

**Vacancy A — "Junior Software Engineer":** AGE 22–30 w3, GENDER ANY w1, SALARY 4.0M–6.5M w5.
**Vacancy B — "Senior Data Scientist":** AGE 30–45 w4, GENDER MALE w2, SALARY 7.5M–10M w6.

### EXPECTED RANKINGS — all twelve deck cells reproduce

The ground truth is the scoring tables, which is also what `docs/PRD.md` §7 makes the
acceptance criterion. `docs/PRD.md` §6.3 is prose only, despite `AGENTS.md` citing it.

| Vacancy | Ranking |
|---|---|
| Junior Software Engineer | Indah Lestari `9`, Siti Rahayu `9`, Budi Santoso `1` |
| Senior Data Scientist | Budi Santoso `12`, Indah Lestari `0`, Siti Rahayu `0` |

Two properties of these tables are not visible by reading them:

1. **Vacancy A's salary minimum is `4.000.000`, not `4.500.000`.** The deck's criteria
   row and its scoring table contradict each other: the row says `4.500.000`, the table
   awards Indah Lestari the salary weight while her salary is exactly `4.000.000`.
   `4.000.000` is used because `docs/SAMPLE.md` §4 designates its own ranked tables as
   "the ground-truth acceptance cases" (and `docs/PRD.md` §7 agrees), because it puts her
   exactly on the inclusive lower bound, and because it is the only value under which her
   `9-9` tie with Siti Rahayu — the tie Example 1 exists to demonstrate — occurs at all.
   `docs/SAMPLE.md` is left unedited and still shows `4.500.000`; this is the record of
   the divergence.
2. **The tables are a snapshot in time.** Vacancy B publishes Siti Rahayu as `0`, which
   holds only while she is under 30. She turns 30 on 2026-05-15 and `30–45` is inclusive,
   so from that date she earns the age weight and the published values stop reproducing.

The acceptance test lives in `apps/api/test/unit/ranking-acceptance.spec.ts`, pinned to
`2026-04-15`, and asserts the deck's numbers directly.

### Soft delete
Candidates are soft-deleted (`deleted_at`). Email uniqueness is a **partial unique index
on `lower(email)` where `deleted_at IS NULL`**, so a soft-deleted candidate frees its
email. Ranking and listing consider active candidates only.
