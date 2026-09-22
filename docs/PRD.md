# Product Requirements Document (PRD)
## Candidate & Vacancy Ranking System — Full Stack Engineer Technical Test

**Company:** Jobseeker.Company
**Document owner:** Engineering Candidate (Assessment Author)
**Status:** Draft
**Version:** 1.0
**Last updated:** 2026-09-22

---

## 1. Background

Jobseeker.Company connects people with opportunities. Recruiters currently lack a
lightweight, rule-based system to store candidate profiles, define job vacancies with
explicit matching criteria, and automatically rank candidates against those criteria.
This document defines the product requirements for a backend system that solves
this problem, as specified in the "Assessment Test — Full Stack Engineer" brief.

## 2. Objective

Develop a backend application that manages candidate profiles and job vacancies,
and that can rank candidates against a given vacancy's criteria, producing an
objective, weighted match score.

## 3. Goals

- Allow recruiters (system users) to create, view, update, and delete candidate
  profiles.
- Allow recruiters to create, view, update, and delete job vacancies, each with a
  configurable, weighted set of matching criteria.
- Automatically rank all candidates against a vacancy's criteria and return a
  sorted list of matches with a transparent score.
- Ensure the design is extensible so new criteria types (beyond age, gender, and
  salary) can be added later with minimal rework.
- Ensure the ranking process remains performant as the candidate pool grows.

## 4. Non-Goals (Out of Scope)

- Authentication/authorization, multi-tenant support, or recruiter user accounts
  (not specified in the brief; may be a future enhancement).
- A front-end UI. The deliverable is a backend API, documented via Postman.
- Resume parsing, interview scheduling, or offer management.
- Real production deployment/publishing — per the brief, the output is a dummy
  project for evaluation purposes only and will not be published.

## 5. Target Users

| User | Description | Needs |
|---|---|---|
| Recruiter / HR Ops | Uses the API (directly or via a future UI) to manage candidates and vacancies | Fast CRUD, reliable ranking, clear results |
| Hiring Manager | Consumes ranked candidate lists for a vacancy | Trustworthy, explainable scoring |
| Engineering reviewer (Jobseeker.Company) | Evaluates the technical test submission | Clean code, correct logic, good documentation |

## 6. Core Features

### 6.1 Candidate Management
- **Create:** Add a candidate profile with Name, Email (unique), Birthdate, Gender,
  Current Salary.
- **Read:** List all candidate profiles.
- **Update:** Modify an existing candidate profile.
- **Delete:** Remove a candidate profile.

### 6.2 Vacancy Management
- **Create:** Add a vacancy with a Name and one or more criteria. Supported
  criteria types at launch:
  - Age Criteria (min age, max age, weight)
  - Gender Criteria (Male / Female / Any, weight)
  - Salary Range Criteria (min salary, max salary, weight)
  - If a weight is not explicitly provided for a criterion, it defaults to **1**.
- **Read:** List all vacancies (with their criteria).
- **Update:** Modify a vacancy, including adding/removing/editing its criteria.
- **Delete:** Remove a vacancy.

### 6.3 Candidate Ranking
- Given a vacancy, score every candidate by **summing the weight of each criterion
  the candidate matches**.
- Return the ranked list (candidate ID, Name, Email, Score) sorted by score
  descending.
- **Tie-breaking rule:** candidates with equal scores are ordered alphabetically by
  name (confirmed by the worked examples in the brief).

## 7. Success Metrics / Acceptance Criteria

- All CRUD endpoints for candidates and vacancies work as specified and are
  documented in a Postman collection.
- The ranking algorithm reproduces the two worked examples in the brief exactly
  (Vacancy A and Vacancy B scoring tables).
- Adding a new criterion type requires touching a small, well-isolated part of the
  codebase (strategy/plugin-style design), not the core ranking loop.
- The ranking endpoint returns correct results at scale (see SRS §7 for scalability
  approach) without unnecessary N+1 queries.
- Logging exists for key operations without flooding logs (e.g., no per-record logs
  inside ranking loops).

## 8. Assumptions

- "Weight not provided → default to 1" (the sentence in the source deck is
  truncated but the intent is the standard default for a scoring weight).
- Salary and age criteria are evaluated as inclusive ranges (`min <= value <= max`).
- Gender "Any" criterion always counts as a match regardless of candidate gender.
- A single environment (dev) is sufficient for the assessment; no staging/prod
  distinction required.

## 9. Risks / Open Questions

- Should partial credit be given for "close but not matching" ranges (e.g., age
  off by one year)? **Assumption: No** — criteria are matched as boolean
  pass/fail per the brief's "summing the weight of each matched criterion."
- Should deleting a vacancy/candidate be a hard delete or soft delete? **Assumption:
  hard delete**, as no soft-delete requirement is stated.

## 10. Optional Enhancement: Simple UI (Not Required)

Not part of the graded requirements, but may be added as a personal bonus for
demo purposes during the interview.

- **Stack:** React + Vite (simple SPA, no SSR needed).
- **Scope (keep minimal):**
  - Candidate list + create/edit/delete form.
  - Vacancy list + create/edit/delete form (with dynamic criteria rows:
    Age / Gender / Salary Range, each with a weight input).
  - A "Rank candidates" view per vacancy showing the sorted score table.
- **Integration:** Calls the existing backend REST API directly (no new
  backend endpoints needed); configure the API base URL via a Vite env var
  (`VITE_API_BASE_URL`).
- **Explicitly out of scope for this optional UI:** auth/login, styling
  polish, routing beyond 2–3 simple views, state management libraries (local
  component state / basic fetch is enough).
- **Not evaluated:** per the assessment brief, only the backend deliverables
  (API, Postman docs, ranking logic, extensibility/scalability write-up) are
  part of the formal submission. The UI, if built, is purely optional and
  should not take time away from the core backend requirements.

## 11. Deliverables

1. Source code in a Gitlab repository.
2. Postman collection (and/or OpenAPI export) documenting all endpoints.
3. README with setup/run instructions.
4. Brief write-up of the scalability approach for ranking at volume (bonus point).
