import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
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

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return Object.assign(new Candidate(), {
    id: 'candidate-1',
    name: 'Alice Adams',
    email: 'alice.adams@example.test',
    birthdate: '1998-06-15',
    gender: CandidateGender.FEMALE,
    currentSalary: 5_500_000,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deletedAt: null,
    ...overrides,
  });
}

function makeCriterion(overrides: Partial<VacancyCriterion> = {}): VacancyCriterion {
  return Object.assign(new VacancyCriterion(), {
    id: 'criterion-1',
    vacancyId: 'vacancy-a',
    type: CriterionType.AGE,
    weight: 1,
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

function makeVacancy(overrides: Partial<Vacancy> = {}): Vacancy {
  return Object.assign(new Vacancy(), {
    id: 'vacancy-a',
    name: 'Junior Software Engineer',
    description: '',
    criteria: [],
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  });
}

function vacancyA(): Vacancy {
  return makeVacancy({
    id: 'vacancy-a',
    name: 'Junior Software Engineer',
    criteria: [
      makeCriterion({
        id: 'crit-a1',
        vacancyId: 'vacancy-a',
        type: CriterionType.AGE,
        weight: 3,
        minAge: 22,
        maxAge: 30,
      }),
      makeCriterion({
        id: 'crit-a2',
        vacancyId: 'vacancy-a',
        type: CriterionType.GENDER,
        weight: 1,
        gender: CriterionGender.ANY,
      }),
      makeCriterion({
        id: 'crit-a3',
        vacancyId: 'vacancy-a',
        type: CriterionType.SALARY_RANGE,
        weight: 5,
        minSalary: 4_000_000,
        maxSalary: 6_500_000,
      }),
    ],
  });
}

function vacancyB(): Vacancy {
  return makeVacancy({
    id: 'vacancy-b',
    name: 'Senior Data Scientist',
    criteria: [
      makeCriterion({
        id: 'crit-b1',
        vacancyId: 'vacancy-b',
        type: CriterionType.AGE,
        weight: 4,
        minAge: 30,
        maxAge: 45,
      }),
      makeCriterion({
        id: 'crit-b2',
        vacancyId: 'vacancy-b',
        type: CriterionType.GENDER,
        weight: 2,
        gender: CriterionGender.MALE,
      }),
      makeCriterion({
        id: 'crit-b3',
        vacancyId: 'vacancy-b',
        type: CriterionType.SALARY_RANGE,
        weight: 6,
        minSalary: 7_500_000,
        maxSalary: 10_000_000,
      }),
    ],
  });
}

function seedCandidates(): Candidate[] {
  return [
    makeCandidate({
      id: 'cand-alice',
      name: 'Alice Adams',
      email: 'alice.adams@example.test',
      birthdate: '1998-06-15',
      gender: CandidateGender.FEMALE,
      currentSalary: 5_500_000,
    }),
    makeCandidate({
      id: 'cand-bob',
      name: 'Bob Brown',
      email: 'bob.brown@example.test',
      birthdate: '1996-01-10',
      gender: CandidateGender.MALE,
      currentSalary: 8_000_000,
    }),
    makeCandidate({
      id: 'cand-carol',
      name: 'Carol Clark',
      email: 'carol.clark@example.test',
      birthdate: '1997-07-20',
      gender: CandidateGender.FEMALE,
      currentSalary: 5_000_000,
    }),
    makeCandidate({
      id: 'cand-david',
      name: 'David Diaz',
      email: 'david.diaz@example.test',
      birthdate: '1980-03-05',
      gender: CandidateGender.MALE,
      currentSalary: 11_000_000,
    }),
  ];
}

function defaultQuery(overrides: Partial<RankingQueryDto> = {}): RankingQueryDto {
  return { page: 1, limit: 20, ...overrides };
}

type TestContext = {
  service: RankingService;
  candidateRepository: { find: jest.Mock };
  vacancyRepository: { findOne: jest.Mock };
  rankingCache: { get: jest.Mock; set: jest.Mock };
};

async function createService(): Promise<TestContext> {
  const cacheStore = new Map<string, unknown>();
  const rankingCache = {
    get: jest.fn(async (key: string): Promise<unknown> =>
      cacheStore.has(key) ? cacheStore.get(key) : null,
    ),
    set: jest.fn(async (key: string, value: unknown, _ttl: number): Promise<void> => {
      cacheStore.set(key, value);
    }),
    del: jest.fn(async (_key: string): Promise<void> => undefined),
    invalidateAllRankings: jest.fn(async (): Promise<void> => undefined),
    invalidateVacancy: jest.fn(async (_id: string): Promise<void> => undefined),
  };
  const candidateRepository = { find: jest.fn() };
  const vacancyRepository = { findOne: jest.fn() };

  const moduleRef = await Test.createTestingModule({
    providers: [
      RankingService,
      AgeCriterionStrategy,
      GenderCriterionStrategy,
      SalaryRangeCriterionStrategy,
      CriterionStrategyRegistry,
      { provide: getRepositoryToken(Candidate), useValue: candidateRepository },
      { provide: getRepositoryToken(Vacancy), useValue: vacancyRepository },
      { provide: RankingCacheService, useValue: rankingCache },
      { provide: ClockService, useValue: { now: () => new Date(2026, 8, 22, 12, 0, 0) } },
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
    rankingCache,
  };
}

describe('RankingService', () => {
  it('scores vacancy A correctly', async () => {
    const { service, candidateRepository, vacancyRepository } = await createService();
    vacancyRepository.findOne.mockResolvedValue(vacancyA());
    candidateRepository.find.mockResolvedValue(seedCandidates());

    const response = await service.rank('vacancy-a', defaultQuery());

    expect(response.vacancy).toEqual({
      id: 'vacancy-a',
      name: 'Junior Software Engineer',
    });
    expect(response.results.map((r) => r.name)).toEqual([
      'Alice Adams',
      'Carol Clark',
      'Bob Brown',
      'David Diaz',
    ]);
    expect(response.results.map((r) => r.score)).toEqual([9, 9, 4, 1]);
    expect(response.pagination.total).toBe(4);
  });

  it('scores vacancy B correctly, retaining zero-score candidates', async () => {
    const { service, candidateRepository, vacancyRepository } = await createService();
    vacancyRepository.findOne.mockResolvedValue(vacancyB());
    candidateRepository.find.mockResolvedValue(seedCandidates());

    const response = await service.rank('vacancy-b', defaultQuery());

    expect(response.results.map((r) => r.name)).toEqual([
      'Bob Brown',
      'David Diaz',
      'Alice Adams',
      'Carol Clark',
    ]);
    expect(response.results.map((r) => r.score)).toEqual([12, 2, 0, 0]);
  });

  it('breaks score ties alphabetically (Alice before Carol)', async () => {
    const { service, candidateRepository, vacancyRepository } = await createService();
    vacancyRepository.findOne.mockResolvedValue(vacancyA());
    candidateRepository.find.mockResolvedValue(seedCandidates());

    const response = await service.rank('vacancy-a', defaultQuery());
    const names = response.results.map((r) => r.name);

    expect(names.indexOf('Alice Adams')).toBeLessThan(names.indexOf('Carol Clark'));
  });

  it('lists every criterion with its matched flag and weight', async () => {
    const { service, candidateRepository, vacancyRepository } = await createService();
    vacancyRepository.findOne.mockResolvedValue(vacancyA());
    candidateRepository.find.mockResolvedValue(seedCandidates());

    const response = await service.rank('vacancy-a', defaultQuery());

    expect(response.results[0].name).toBe('Alice Adams');
    expect(response.results[0].matchedCriteria).toEqual([
      { type: CriterionType.AGE, weight: 3, matched: true },
      { type: CriterionType.GENDER, weight: 1, matched: true },
      { type: CriterionType.SALARY_RANGE, weight: 5, matched: true },
    ]);
  });

  it('serves a second call from cache without touching the repository', async () => {
    const { service, candidateRepository, vacancyRepository } = await createService();
    vacancyRepository.findOne.mockResolvedValue(vacancyA());
    candidateRepository.find.mockResolvedValue(seedCandidates());

    await service.rank('vacancy-a', defaultQuery());
    await service.rank('vacancy-a', defaultQuery());

    expect(candidateRepository.find).toHaveBeenCalledTimes(1);
    expect(vacancyRepository.findOne).toHaveBeenCalledTimes(1);
  });

  it('filters by minScore', async () => {
    const { service, candidateRepository, vacancyRepository } = await createService();
    vacancyRepository.findOne.mockResolvedValue(vacancyA());
    candidateRepository.find.mockResolvedValue(seedCandidates());

    const response = await service.rank('vacancy-a', defaultQuery({ minScore: 5 }));

    expect(response.results.map((r) => r.name)).toEqual(['Alice Adams', 'Carol Clark']);
    expect(response.pagination.total).toBe(2);
  });

  it('filters by search over name and email', async () => {
    const { service, candidateRepository, vacancyRepository } = await createService();
    vacancyRepository.findOne.mockResolvedValue(vacancyA());
    candidateRepository.find.mockResolvedValue(seedCandidates());

    const byName = await service.rank('vacancy-a', defaultQuery({ search: 'carol' }));
    expect(byName.results.map((r) => r.name)).toEqual(['Carol Clark']);

    const byEmail = await service.rank('vacancy-a', defaultQuery({ search: 'DAVID.DIAZ' }));
    expect(byEmail.results.map((r) => r.name)).toEqual(['David Diaz']);
  });

  it('paginates and reports totalPages', async () => {
    const { service, candidateRepository, vacancyRepository } = await createService();
    vacancyRepository.findOne.mockResolvedValue(vacancyA());
    candidateRepository.find.mockResolvedValue(seedCandidates());

    const response = await service.rank('vacancy-a', defaultQuery({ page: 2, limit: 2 }));

    expect(response.results.map((r) => r.name)).toEqual(['Bob Brown', 'David Diaz']);
    expect(response.pagination).toEqual({ page: 2, limit: 2, total: 4, totalPages: 2 });
  });

  it('throws NotFoundException for an unknown vacancy', async () => {
    const { service, vacancyRepository } = await createService();
    vacancyRepository.findOne.mockResolvedValue(null);

    await expect(service.rank('missing', defaultQuery())).rejects.toBeInstanceOf(NotFoundException);
  });
});
