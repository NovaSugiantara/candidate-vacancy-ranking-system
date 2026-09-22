# Example Data & Ranking Scenarios

Tables extracted from the "Assessment Test — Full Stack Engineer" PDF, converted
to Markdown for easy reference/seeding.

---

## 1. Candidate Data Example

| Field | Candidate 1 | Candidate 2 | Candidate 3 |
|---|---|---|---|
| Name | Siti Rahayu | Budi Santoso | Indah Lestari |
| Email | siti.r@example.com | budi.s@example.com | indah.l@example.com |
| Birthdate | 1996-05-15 | 1989-11-20 | 2002-03-01 |
| Gender | FEMALE | MALE | FEMALE |
| Current Salary | Rp. 5.500.000 | Rp. 8.000.000 | Rp. 4.000.000 |

---

## 2. Vacancy Data Example

### Vacancy A: "Junior Software Engineer"

| Criteria Type | Details | Weight |
|---|---|---|
| Age Criteria | Min Age: 22, Max Age: 30 | 3 |
| Gender Criteria | Gender: ANY | 1 |
| Salary Range Criteria | Min Salary: Rp. 4.500.000, Max Salary: Rp. 6.500.000 | 5 |

### Vacancy B: "Senior Data Scientist"

| Criteria Type | Details | Weight |
|---|---|---|
| Age Criteria | Min Age: 30, Max Age: 45 | 4 |
| Gender Criteria | Gender: MALE | 2 |
| Salary Range Criteria | Min Salary: Rp. 7.500.000, Max Salary: Rp. 10.000.000 | 6 |

---

## 3. Candidate Ranking Examples

### Ranking Example 1 — Vacancy A: "Junior Software Engineer"

**Criteria:** Age 22–30 (Weight: 3) · Gender ANY (Weight: 1) · Salary Rp.4.500.000–Rp.6.500.000 (Weight: 5)

**Scoring breakdown**

| Candidate Name | Age (22–30) | Gender (ANY) | Current Salary (Rp.4.5M–Rp.6.5M) | Total Score |
|---|---|---|---|---|
| Siti Rahayu | 3 | 1 | 5 | 3 + 1 + 5 = **9** |
| Budi Santoso | 0 | 1 | 0 | 0 + 1 + 0 = **1** |
| Indah Lestari | 3 | 1 | 5 | 3 + 1 + 5 = **9** |

**Ranked candidates for Vacancy A**

| Rank | Candidate Name | Email | Score |
|---|---|---|---|
| 1 | Indah Lestari | indah.l@example.com | 9 |
| 2 | Siti Rahayu | siti.r@example.com | 9 |
| 3 | Budi Santoso | budi.s@example.com | 1 |

> Note: In case of a tie in scores, candidates are ordered alphabetically by
> name (Indah Lestari before Siti Rahayu).

---

### Ranking Example 2 — Vacancy B: "Senior Data Scientist"

**Criteria:** Age 30–45 (Weight: 4) · Gender MALE (Weight: 2) · Salary Rp.7.500.000–Rp.10.000.000 (Weight: 6)

**Scoring breakdown**

| Candidate Name | Age (30–45) | Gender (MALE) | Current Salary (Rp.7.5M–Rp.10M) | Total Score |
|---|---|---|---|---|
| Siti Rahayu | 0 | 0 | 0 | 0 + 0 + 0 = **0** |
| Budi Santoso | 4 | 2 | 6 | 4 + 2 + 6 = **12** |
| Indah Lestari | 0 | 0 | 0 | 0 + 0 + 0 = **0** |

**Ranked candidates for Vacancy B**

| Rank | Candidate Name | Email | Score |
|---|---|---|---|
| 1 | Budi Santoso | budi.s@example.com | 12 |
| 2 | Indah Lestari | indah.l@example.com | 0 |
| 3 | Siti Rahayu | siti.r@example.com | 0 |

> Note: In case of a tie in scores, candidates are ordered alphabetically by
> name (Indah Lestari before Siti Rahayu).

---

## 4. Usage

These tables are the **ground-truth acceptance cases** referenced in
`SRS.md §8` and `AGENTS.md §5` — any change to the ranking logic should be
verified against Ranking Example 1 and Ranking Example 2 above (e.g., as a
seed script + unit test fixture).