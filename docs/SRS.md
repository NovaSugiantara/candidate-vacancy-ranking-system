# Software Requirements Specification (SRS)
## Candidate & Vacancy Ranking System

**Version:** 1.0
**Related document:** PRD.md
**Status:** Draft

---

## 1. Introduction

### 1.1 Purpose
This SRS translates the PRD into concrete functional and non-functional
requirements, data model, and API contract for the backend engineer(s)
implementing the system.

### 1.2 Scope
A single backend service exposing a REST API for:
- Candidate CRUD (create/read/update/delete)
- Vacancy CRUD (with nested, typed, weighted criteria)
- Candidate ranking against a vacancy

### 1.3 Technology Stack (mandated)
| Layer | Technology |
|---|---|
| Backend framework | NestJS (Node.js v24) |
| HTTP adapter | Fastify |
| ORM | TypeORM |
| Database | PostgreSQL (v8) |
| Cache | Redis (v8) |
| API documentation | Postman |
| Version control | Gitlab |

---

## 2. Functional Requirements

### FR-1 — Create Candidate
- **Input:** name (string), email (string, unique), birthdate (date), gender
  (enum: MALE/FEMALE), currentSalary (number).
- **Validation:** email must be unique and well-formed; all fields required.
- **Output:** 201 Created with the created candidate resource.
- **Error:** 409 Conflict if email already exists; 400 Bad Request on invalid
  payload.

### FR-2 — List Candidates
- **Output:** 200 OK, array of all candidates.
- Should support pagination as a non-breaking future enhancement (see NFR-4).

### FR-3 — Update Candidate
- **Input:** candidate ID (path param), partial or full candidate fields.
- **Output:** 200 OK with updated resource.
- **Error:** 404 Not Found if ID doesn't exist; 409 Conflict if new email
  collides with another candidate.

### FR-4 — Delete Candidate
- **Input:** candidate ID.
- **Output:** 200/204 on success.
- **Error:** 404 Not Found if ID doesn't exist.

### FR-5 — Create Vacancy
- **Input:** name (string), criteria (array, min length 1). Each criterion has a
  `type` (`AGE` | `GENDER` | `SALARY_RANGE`), type-specific fields, and an
  optional `weight` (integer, default **1**).
- **Validation:** at least one criterion required; criterion fields validated
  per type (e.g., `minAge <= maxAge`).
- **Output:** 201 Created.

### FR-6 — List Vacancies
- **Output:** 200 OK, array of vacancies including their criteria.

### FR-7 — Update Vacancy
- **Input:** vacancy ID, updated name and/or criteria (full replace or granular
  add/update/remove of individual criteria — implementation choice, document in
  Postman).
- **Output:** 200 OK with updated resource.
- **Error:** 404 Not Found.

### FR-8 — Delete Vacancy
- **Input:** vacancy ID.
- **Output:** 200/204 on success.
- **Error:** 404 Not Found.

### FR-9 — Rank Candidates for a Vacancy
- **Input:** vacancy ID (path/query param).
- **Process:**
  1. Load vacancy and its criteria.
  2. Load all candidates (see NFR-3 for batching/caching at scale).
  3. For each candidate, for each criterion, evaluate match (boolean) using the
     strategy registered for that criterion's `type`.
  4. Score = sum of `weight` for every matched criterion.
  5. Sort descending by score; break ties alphabetically by candidate name.
- **Output:** 200 OK, array of `{ candidateId, name, email, score }`, sorted.
- **Error:** 404 Not Found if vacancy doesn't exist.

### FR-10 — Criterion Matching Rules (v1)
| Criterion | Match condition |
|---|---|
| Age | `minAge <= candidateAge <= maxAge` (age derived from birthdate as of "today") |
| Gender | `criterion.gender == ANY` OR `criterion.gender == candidate.gender` |
| Salary Range | `minSalary <= candidate.currentSalary <= maxSalary` |

---

## 3. Data Model

### 3.1 `Candidate`
| Field | Type | Constraints |
|---|---|---|
| id | UUID / serial | PK |
| name | varchar | required |
| email | varchar | required, unique |
| birthdate | date | required |
| gender | enum(MALE, FEMALE) | required |
| currentSalary | numeric | required |
| createdAt / updatedAt | timestamp | auto |

### 3.2 `Vacancy`
| Field | Type | Constraints |
|---|---|---|
| id | UUID / serial | PK |
| name | varchar | required |
| createdAt / updatedAt | timestamp | auto |

### 3.3 `VacancyCriterion` (polymorphic / single-table with discriminator, or
per-type tables — see §6 Extensibility)
| Field | Type | Constraints |
|---|---|---|
| id | UUID / serial | PK |
| vacancyId | FK → Vacancy | required |
| type | enum(AGE, GENDER, SALARY_RANGE, ...) | required |
| weight | int | required, default 1 |
| minAge / maxAge | int, nullable | used when type = AGE |
| gender | enum(MALE, FEMALE, ANY), nullable | used when type = GENDER |
| minSalary / maxSalary | numeric, nullable | used when type = SALARY_RANGE |

> Alternative: a JSONB `params` column instead of nullable typed columns, to
> ease adding new criteria types without migrations (trade-off: less DB-level
> validation). Either is acceptable; document the choice in the README.

---

## 4. API Endpoints (summary — full contract lives in the Postman collection)

| Method | Path | Purpose |
|---|---|---|
| POST | `/candidates` | Create candidate |
| GET | `/candidates` | List candidates |
| PATCH/PUT | `/candidates/:id` | Update candidate |
| DELETE | `/candidates/:id` | Delete candidate |
| POST | `/vacancies` | Create vacancy (+criteria) |
| GET | `/vacancies` | List vacancies |
| PATCH/PUT | `/vacancies/:id` | Update vacancy (+criteria) |
| DELETE | `/vacancies/:id` | Delete vacancy |
| GET | `/vacancies/:id/ranking` | Rank all candidates for this vacancy |

---

## 5. Non-Functional Requirements

- **NFR-1 Correctness:** Ranking output must match the two worked examples in
  the assessment brief exactly.
- **NFR-2 Validation:** Use `class-validator`/`class-transformer` (or Fastify
  schema validation) on all DTOs; reject invalid input with 400 and a clear
  error body.
- **NFR-3 Performance/Scalability:** Ranking must not degrade linearly with
  poor query patterns as candidate volume grows (see §7).
- **NFR-4 Extensibility:** New criteria types must be addable via a new
  strategy class + registration, without modifying the ranking engine's core
  loop (Open/Closed Principle).
- **NFR-5 Observability:** Structured logging (e.g., via Nest's Logger) at
  INFO level for request-level events (vacancy created, ranking requested,
  duration), WARN/ERROR for failures — never per-candidate/per-criterion debug
  logs in production paths.
- **NFR-6 Documentation:** Postman collection covering all endpoints with
  example requests/responses, importable and runnable.
- **NFR-7 Testability:** Core ranking/scoring logic covered by unit tests
  (pure functions, no DB dependency) plus at least a few e2e tests for the
  CRUD + ranking endpoints.

---

## 6. Extensibility Design (Bonus Point 1)

Use a **Strategy pattern** for criteria evaluation:

```
interface CriterionStrategy {
  type: CriterionType;
  isMatch(candidate: Candidate, criterion: VacancyCriterion): boolean;
}
```

Each criterion type (Age, Gender, SalaryRange, and future types like
Education, Location, YearsOfExperience) implements this interface and is
registered in a `CriterionStrategyRegistry` (e.g., a NestJS provider keyed by
`type`, using `@Injectable()` + a map or NestJS's multi-provider pattern).

The ranking service depends only on the registry interface, so adding a new
criterion type requires:
1. A new strategy class implementing `isMatch`.
2. Registering it in the module (one line).
3. (If typed columns are used) a migration for new optional columns, or none
   at all if a JSONB `params` column is used.

No changes to `RankingService.rank()` itself are needed.

## 7. Scalability Approach for Ranking (Bonus Point 2)

As candidate volume grows (e.g., 100k+ candidates per ranking request):

1. **Avoid N+1 queries:** Load the full candidate set for a ranking request in
   one paginated/streamed query rather than per-candidate queries.
2. **Push filtering to the database where possible:** For criteria with clear
   SQL predicates (age range from birthdate, salary range), pre-filter or
   pre-score in SQL/TypeORM query builder instead of loading every candidate
   into memory when only a subset can possibly match.
3. **Batching:** Process candidates in batches (e.g., 1,000 at a time) using
   cursor-based pagination (`WHERE id > lastId ORDER BY id LIMIT n`) to bound
   memory usage, streaming partial results into an in-memory top-N heap if
   only the top results are needed by the client.
4. **Caching (Redis):**
   - Cache a vacancy's criteria (rarely change relative to ranking reads) with
     an invalidation on vacancy update/delete.
   - Optionally cache full ranking results per vacancy for a short TTL (e.g.,
     30–60s), invalidated when candidates or the vacancy's criteria change —
     useful if the ranking endpoint is polled frequently.
5. **Async/background computation:** For very large candidate pools, consider
   computing rankings as a background job (queue-based) and serving the last
   computed snapshot + "recomputing" status, rather than computing synchronously
   on every request.
6. **Horizontal scaling:** Stateless API pods behind a load balancer; Redis as
   shared cache; read replicas for PostgreSQL if read load from ranking
   dominates.

---

## 8. Traceability Matrix (PRD → SRS)

| PRD Feature | SRS Requirement(s) |
|---|---|
| Candidate CRUD | FR-1 – FR-4 |
| Vacancy CRUD | FR-5 – FR-8 |
| Candidate Ranking | FR-9, FR-10, §6, §7 |
| Extensibility (bonus) | NFR-4, §6 |
| Scalability (bonus) | NFR-3, §7 |
