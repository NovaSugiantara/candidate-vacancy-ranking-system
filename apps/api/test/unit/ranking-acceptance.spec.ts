import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Candidate } from '../../src/candidates/entities/candidate.entity';
import { RankingCacheService } from '../../src/common/cache/ranking-cache.service';
import { AppLoggerService } from '../../src/common/logging/app-logger.service';
import { RankingQueryDto } from '../../src/ranking/dto/ranking-query.dto';
import { RankingService } from '../../src/ranking/ranking.service';
import { AgeCriterionStrategy } from '../../src/ranking/strategies/age-criterion.strategy';
import { CriterionStrategyRegistry } from '../../src/ranking/strategies/criterion-strategy.registry';
import { GenderCriterionStrategy } from '../../src/ranking/strategies/gender-criterion.strategy';
import { SalaryRangeCriterionStrategy } from '../../src/ranking/strategies/salary-range-criterion.strategy';
import { CandidateGender } from '../../src/shared/enums/candidate-gender.enum';
import { CriterionGender } from '../../src/shared/enums/criterion-gender.enum';
import { CriterionType } from '../../src/shared/enums/criterion-type.enum';
import { ClockService } from '../../src/shared/time/clock.service';
import { Vacancy } from '../../src/vacancies/entities/vacancy.entity';
import { VacancyCriterion } from '../../src/vacancies/entities/vacancy-criterion.entity';

/**
 * Acceptance cases taken verbatim from docs/SAMPLE.md, which holds the tables
 * published in the assessment deck.
 *
 * The clock is pinned because those tables are date-dependent. Vacancy B scores
 * Siti Rahayu 0, which only holds while she is under 30 — she turns 30 on
 * 2026-05-15, so the published tables stop reproducing after that date. Age
 * boundaries are inclusive, so this is a correctness property of the rules, not
 * a quirk of the fixture.
 */
const DECK_REFERENCE_DATE = new Date('2026-04-15T00:00:00.000Z');

const VACANCY_A_ID = 'deck-vacancy-a';
const VACANCY_B_ID = 'deck-vacancy-b';

function candidate(
  id: string,
  name: string,
  email: string,
  birthdate: string,
  gender: CandidateGender,
  currentSalary: number,
): Candidate {
  return Object.assign(new Candidate(), {
    id,
    name,
    email,
    birthdate,
    gender,
    currentSalary,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deletedAt: null,
  });
}

function criterion(overrides: Partial<VacancyCriterion>): VacancyCriterion {
  return Object.assign(new VacancyCriterion(), {
    id: overrides.id ?? 'criterion',
    vacancyId: overrides.vacancyId ?? VACANCY_A_ID,
    type: overrides.type ?? CriterionType.AGE,
    weight: overrides.weight ?? 1,
    minAge: null,
    maxAge: null,
    gender: null,
    minSalary: null,
    maxSalary: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  });
}

function deckCandidates(): Candidate[] {
  return [
    candidate(
      'deck-c1',
      'Siti Rahayu',
      'siti.r@example.com',
      '1996-05-15',
      CandidateGender.FEMALE,
      5_500_000,
    ),
    candidate(
      'deck-c2',
      'Budi Santoso',
      'budi.s@example.com',
      '1989-11-20',
      CandidateGender.MALE,
      8_000_000,
    ),
    candidate(
      'deck-c3',
      'Indah Lestari',
      'indah.l@example.com',
      '2002-03-01',
      CandidateGender.FEMALE,
      4_000_000,
    ),
  ];
}

function vacancyA(): Vacancy {
  return Object.assign(new Vacancy(), {
    id: VACANCY_A_ID,
    name: 'Junior Software Engineer',
    description: '',
    criteria: [
      criterion({
        id: 'deck-a1',
        vacancyId: VACANCY_A_ID,
        type: CriterionType.AGE,
        weight: 3,
        minAge: 22,
        maxAge: 30,
      }),
      criterion({
        id: 'deck-a2',
        vacancyId: VACANCY_A_ID,
        type: CriterionType.GENDER,
        weight: 1,
        gender: CriterionGender.ANY,
      }),
      criterion({
        id: 'deck-a3',
        vacancyId: VACANCY_A_ID,
        type: CriterionType.SALARY_RANGE,
        weight: 5,
        minSalary: 4_500_000,
        maxSalary: 6_500_000,
      }),
    ],
    createdAt: new Date(0),
    updatedAt: new Date(0),
  });
}

function vacancyB(): Vacancy {
  return Object.assign(new Vacancy(), {
    id: VACANCY_B_ID,
    name: 'Senior Data Scientist',
    description: '',
    criteria: [
      criterion({
        id: 'deck-b1',
        vacancyId: VACANCY_B_ID,
        type: CriterionType.AGE,
        weight: 4,
        minAge: 30,
        maxAge: 45,
      }),
      criterion({
        id: 'deck-b2',
        vacancyId: VACANCY_B_ID,
        type: CriterionType.GENDER,
        weight: 2,
        gender: CriterionGender.MALE,
      }),
      criterion({
        id: 'deck-b3',
        vacancyId: VACANCY_B_ID,
        type: CriterionType.SALARY_RANGE,
        weight: 6,
        minSalary: 7_500_000,
        maxSalary: 10_000_000,
      }),
    ],
    createdAt: new Date(0),
    updatedAt: new Date(0),
  });
}

function query(): RankingQueryDto {
  return Object.assign(new RankingQueryDto(), {
    page: 1,
    limit: 20,
    search: undefined,
    minScore: undefined,
  });
}

type Harness = {
  readonly service: RankingService;
  readonly candidateRepository: { find: jest.Mock };
  readonly vacancyRepository: { findOne: jest.Mock };
};

async function createService(): Promise<Harness> {
  const candidateRepository = { find: jest.fn() };
  const vacancyRepository = { findOne: jest.fn() };
  const rankingCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn(),
    invalidateAllRankings: jest.fn(),
    invalidateVacancy: jest.fn(),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      RankingService,
      CriterionStrategyRegistry,
      AgeCriterionStrategy,
      GenderCriterionStrategy,
      SalaryRangeCriterionStrategy,
      { provide: getRepositoryToken(Candidate), useValue: candidateRepository },
      { provide: getRepositoryToken(Vacancy), useValue: vacancyRepository },
      { provide: RankingCacheService, useValue: rankingCache },
      {
        provide: ClockService,
        useValue: { now: () => new Date(DECK_REFERENCE_DATE.getTime()) },
      },
      {
        provide: AppLoggerService,
        useValue: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      },
    ],
  }).compile();

  return {
    service: moduleRef.get(RankingService),
    candidateRepository,
    vacancyRepository,
  };
}

async function rank(harness: Harness, vacancy: Vacancy): Promise<Map<string, number>> {
  harness.vacancyRepository.findOne.mockResolvedValue(vacancy);
  harness.candidateRepository.find.mockResolvedValue(deckCandidates());

  const response = await harness.service.rank(vacancy.id, query());

  return new Map(response.results.map((result) => [result.name, result.score]));
}

describe('Ranking acceptance against the deck tables (docs/SAMPLE.md)', () => {
  it('reproduces Ranking Example 2 — Vacancy B exactly', async () => {
    const scores = await rank(await createService(), vacancyB());

    expect(scores.get('Budi Santoso')).toBe(12);
    expect(scores.get('Siti Rahayu')).toBe(0);
    expect(scores.get('Indah Lestari')).toBe(0);
  });

  it('reproduces Ranking Example 1 — Vacancy A for Siti Rahayu and Budi Santoso', async () => {
    const scores = await rank(await createService(), vacancyA());

    expect(scores.get('Siti Rahayu')).toBe(9);
    expect(scores.get('Budi Santoso')).toBe(1);
  });

  it('orders Vacancy B as the deck does, ties broken alphabetically', async () => {
    const harness = await createService();
    harness.vacancyRepository.findOne.mockResolvedValue(vacancyB());
    harness.candidateRepository.find.mockResolvedValue(deckCandidates());

    const response = await harness.service.rank(VACANCY_B_ID, query());

    expect(response.results.map((result) => `${result.name}:${result.score}`)).toStrictEqual([
      'Budi Santoso:12',
      'Indah Lestari:0',
      'Siti Rahayu:0',
    ]);
  });

  it('orders Vacancy A by score, then name, for the cells the deck fixes', async () => {
    const harness = await createService();
    harness.vacancyRepository.findOne.mockResolvedValue(vacancyA());
    harness.candidateRepository.find.mockResolvedValue(deckCandidates());

    const response = await harness.service.rank(VACANCY_A_ID, query());
    const order = response.results.map((result) => result.name);

    // The deck ranks Indah, Siti, Budi. Siti must outrank Budi either way.
    expect(order.indexOf('Siti Rahayu')).toBeLessThan(order.indexOf('Budi Santoso'));
  });

  it('scores Indah Lestari 4 on Vacancy A, contradicting the deck table', async () => {
    const scores = await rank(await createService(), vacancyA());

    // docs/SAMPLE.md claims 9 for Indah Lestari (age 3 + gender 1 + salary 5).
    // Her salary is Rp 4.000.000 and Vacancy A's range is Rp 4.500.000-6.500.000,
    // so the inclusive range excludes her and the salary weight cannot apply.
    // 3 + 1 = 4. Every other cell in both deck tables reproduces exactly, so one
    // of the two published numbers is wrong: either her salary or the minimum.
    expect(scores.get('Indah Lestari')).toBe(4);
  });
});
