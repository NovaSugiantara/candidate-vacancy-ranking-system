import { z } from 'zod';

export const candidateGenders = ['MALE', 'FEMALE'] as const;
export const criterionTypes = ['AGE', 'GENDER', 'SALARY_RANGE'] as const;
export const criterionGenders = ['ANY', ...candidateGenders] as const;
export const sortOrders = ['asc', 'desc'] as const;

export type CandidateGender = (typeof candidateGenders)[number];
export type CriterionType = (typeof criterionTypes)[number];
export type CriterionGender = (typeof criterionGenders)[number];
export type SortOrder = (typeof sortOrders)[number];

export const candidateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.email(),
  birthdate: z.iso.date(),
  gender: z.enum(candidateGenders),
  currentSalary: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ageCriterionSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('AGE'),
  weight: z.number(),
  minAge: z.number(),
  maxAge: z.number(),
});

export const genderCriterionSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('GENDER'),
  weight: z.number(),
  gender: z.enum(criterionGenders),
});

export const salaryRangeCriterionSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('SALARY_RANGE'),
  weight: z.number(),
  minSalary: z.number(),
  maxSalary: z.number(),
});

export const vacancyCriterionSchema = z.discriminatedUnion('type', [
  ageCriterionSchema,
  genderCriterionSchema,
  salaryRangeCriterionSchema,
]);

export const vacancySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  criteria: z.array(vacancyCriterionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const matchedCriterionSchema = z.object({
  type: z.enum(criterionTypes),
  weight: z.number(),
  matched: z.boolean(),
});

export const rankedCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  name: z.string(),
  email: z.email(),
  score: z.number(),
  matchedCriteria: z.array(matchedCriterionSchema),
});

export const rankingSchema = z.object({
  vacancy: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  results: z.array(rankedCandidateSchema),
  pagination: paginationSchema,
});

export type Candidate = z.output<typeof candidateSchema>;
export type VacancyCriterion = z.output<typeof vacancyCriterionSchema>;
export type Vacancy = z.output<typeof vacancySchema>;
export type Pagination = z.output<typeof paginationSchema>;
export type RankedCandidate = z.output<typeof rankedCandidateSchema>;
export type Ranking = z.output<typeof rankingSchema>;

export type CandidateInput = Pick<
  Candidate,
  'name' | 'email' | 'birthdate' | 'gender' | 'currentSalary'
>;

export type VacancyCriterionInput = {
  readonly type: CriterionType;
  readonly weight: number;
  readonly minAge?: number;
  readonly maxAge?: number;
  readonly gender?: CriterionGender;
  readonly minSalary?: number;
  readonly maxSalary?: number;
};

export type VacancyInput = {
  readonly name: string;
  readonly description: string;
  readonly criteria: readonly VacancyCriterionInput[];
};

export type PaginatedResponse<T> = {
  readonly data: readonly T[];
  readonly pagination: Pagination;
};

export type ListQuery = {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly sortBy?: string;
  readonly sortOrder?: SortOrder;
};

export type RankingQuery = {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly minScore?: number;
};
