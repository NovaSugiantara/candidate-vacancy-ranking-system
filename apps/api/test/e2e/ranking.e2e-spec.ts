import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { Candidate } from '../../src/candidates/entities/candidate.entity';
import { createValidationPipe } from '../../src/common/pipes/validation-pipe.factory';
import { Vacancy } from '../../src/vacancies/entities/vacancy.entity';

type CandidateBody = {
  id: string;
};

type VacancyBody = {
  id: string;
};

type RankedCandidate = {
  candidateId: string;
  name: string;
  email: string;
  score: number;
  matchedCriteria: Array<{ type: string; weight: number; matched: boolean }>;
};

type RankingBody = {
  vacancy: { id: string; name: string };
  results: RankedCandidate[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const AGE_WEIGHT = 3;
const GENDER_WEIGHT = 2;
const SALARY_WEIGHT = 5;
const TIED_SCORE = AGE_WEIGHT + GENDER_WEIGHT + SALARY_WEIGHT;

const TIED_FIRST_NAME = 'Aaa Tied';
const TIED_SECOND_NAME = 'Bbb Tied';
const ZERO_SCORE_NAME = 'Zzz Miss';

/**
 * Birthdates are relative to today so the expected scores hold whenever the
 * suite runs. Pinned dates would start failing once a candidate aged out of
 * the fixture's range.
 */
function yearsAgo(years: number): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

describe('Ranking (e2e)', () => {
  let app: NestFastifyApplication;
  let fastify: FastifyInstance;
  let dataSource: DataSource;
  let vacancyId: string;

  const candidateIds: string[] = [];
  const vacancyIds: string[] = [];
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const createCandidate = async (
    name: string,
    yearsOld: number,
    gender: string,
    currentSalary: number,
  ): Promise<void> => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/candidates',
      payload: {
        name,
        email: `${name.replace(/\s+/g, '.').toLowerCase()}-${stamp}@example.test`,
        birthdate: yearsAgo(yearsOld),
        gender,
        currentSalary,
      },
    });

    expect(response.statusCode).toBe(201);
    candidateIds.push(response.json<CandidateBody>().id);
  };

  const fetchRanking = async (query = ''): Promise<RankingBody> => {
    const response = await fastify.inject({
      method: 'GET',
      url: `/vacancies/${vacancyId}/ranking${query}`,
    });

    expect(response.statusCode).toBe(200);
    return response.json<RankingBody>();
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    fastify = app.getHttpAdapter().getInstance();
    await fastify.ready();
    dataSource = app.get(DataSource);

    // Two identical candidates, so only the alphabetical tie-break can order them.
    await createCandidate(TIED_FIRST_NAME, 30, 'FEMALE', 5_000_000);
    await createCandidate(TIED_SECOND_NAME, 30, 'FEMALE', 5_000_000);
    // Matches no criterion: must still be returned, with a score of 0.
    await createCandidate(ZERO_SCORE_NAME, 50, 'MALE', 99_000_000);

    const vacancyResponse = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: {
        name: `Ranking Fixture ${stamp}`,
        description: 'Fixture vacancy used by the ranking e2e suite.',
        criteria: [
          { type: 'AGE', minAge: 25, maxAge: 35, weight: AGE_WEIGHT },
          { type: 'GENDER', gender: 'FEMALE', weight: GENDER_WEIGHT },
          {
            type: 'SALARY_RANGE',
            minSalary: 4_000_000,
            maxSalary: 6_000_000,
            weight: SALARY_WEIGHT,
          },
        ],
      },
    });

    expect(vacancyResponse.statusCode).toBe(201);
    vacancyId = vacancyResponse.json<VacancyBody>().id;
    vacancyIds.push(vacancyId);
  });

  afterAll(async () => {
    if (candidateIds.length > 0) {
      await dataSource.getRepository(Candidate).delete(candidateIds);
    }
    if (vacancyIds.length > 0) {
      await dataSource.getRepository(Vacancy).delete(vacancyIds);
    }
    await app.close();
  });

  it('sums the weight of every matched criterion', async () => {
    const body = await fetchRanking('?search=Tied');
    const tied = body.results.find((result) => result.name === TIED_FIRST_NAME);

    expect(tied?.score).toBe(TIED_SCORE);
  });

  it('returns zero-score candidates instead of dropping them', async () => {
    const body = await fetchRanking('?search=Zzz');
    const missed = body.results.find((result) => result.name === ZERO_SCORE_NAME);

    expect(missed?.score).toBe(0);
    expect(missed?.matchedCriteria.every((criterion) => !criterion.matched)).toBe(true);
  });

  it('orders equal scores alphabetically by name', async () => {
    const body = await fetchRanking('?search=Tied');

    expect(body.results.map((result) => result.name)).toStrictEqual([
      TIED_FIRST_NAME,
      TIED_SECOND_NAME,
    ]);
    expect(body.results[0]?.score).toBe(body.results[1]?.score);
  });

  it('sorts the whole result set by score descending', async () => {
    const body = await fetchRanking();
    const scores = body.results.map((result) => result.score);

    expect(scores).toStrictEqual([...scores].sort((left, right) => right - left));
  });

  it('reports every criterion with its weight and match flag', async () => {
    const body = await fetchRanking('?search=Tied');
    const tied = body.results.find((result) => result.name === TIED_FIRST_NAME);

    expect(tied?.matchedCriteria.map((criterion) => criterion.type)).toStrictEqual([
      'AGE',
      'GENDER',
      'SALARY_RANGE',
    ]);
    expect(tied?.matchedCriteria.every((criterion) => criterion.matched)).toBe(true);
    expect(tied?.matchedCriteria.reduce((sum, criterion) => sum + criterion.weight, 0)).toBe(
      TIED_SCORE,
    );
  });

  it('filters by minScore', async () => {
    const atThreshold = await fetchRanking(`?search=Tied&minScore=${TIED_SCORE}`);
    expect(atThreshold.pagination.total).toBe(2);

    const aboveThreshold = await fetchRanking(`?search=Tied&minScore=${TIED_SCORE + 1}`);
    expect(aboveThreshold.pagination.total).toBe(0);
    expect(aboveThreshold.results).toHaveLength(0);
  });

  it('paginates the ranked results', async () => {
    const firstPage = await fetchRanking('?search=Tied&limit=1&page=1');
    expect(firstPage.results[0]?.name).toBe(TIED_FIRST_NAME);
    expect(firstPage.pagination).toStrictEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });

    const secondPage = await fetchRanking('?search=Tied&limit=1&page=2');
    expect(secondPage.results[0]?.name).toBe(TIED_SECOND_NAME);
  });

  it('serves a repeated request consistently', async () => {
    const first = await fetchRanking('?search=Tied');
    const second = await fetchRanking('?search=Tied');

    expect(second.results).toStrictEqual(first.results);
    expect(second.vacancy).toStrictEqual(first.vacancy);
  });

  it('404s for an unknown vacancy', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: `/vacancies/${randomUUID()}/ranking`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json<{ message: string }>().message).toBe('Vacancy not found');
  });
});
