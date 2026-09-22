import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { createValidationPipe } from '../../src/common/pipes/validation-pipe.factory';
import { Vacancy } from '../../src/vacancies/entities/vacancy.entity';
import { VacancyCriterion } from '../../src/vacancies/entities/vacancy-criterion.entity';

type CriterionBody = {
  id: string;
  type: string;
  weight: number;
  minAge: number | null;
  maxAge: number | null;
  gender: string | null;
  minSalary: number | null;
  maxSalary: number | null;
};

type VacancyBody = {
  id: string;
  name: string;
  description: string;
  criteria: CriterionBody[];
  createdAt: string;
  updatedAt: string;
};

type ErrorBody = {
  statusCode: number;
  message: string;
  errors: Array<{ field: string; message: string }>;
};

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function fullCriteria(): Array<Record<string, unknown>> {
  return [
    { type: 'AGE', weight: 3, minAge: 22, maxAge: 30 },
    { type: 'GENDER', weight: 1, gender: 'ANY' },
    { type: 'SALARY_RANGE', weight: 5, minSalary: 4500000, maxSalary: 6500000 },
  ];
}

describe('Vacancies (e2e)', () => {
  let app: NestFastifyApplication;
  let fastify: FastifyInstance;
  let dataSource: DataSource;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    fastify = app.getHttpAdapter().getInstance();
    await fastify.ready();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await dataSource.getRepository(Vacancy).delete(createdIds);
    }
    await app.close();
  });

  it('creates a vacancy with all three criterion types', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: {
        name: uniqueName('e2e-create'),
        description: 'E2E vacancy with three criteria',
        criteria: fullCriteria(),
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<VacancyBody>();
    expect(typeof body.id).toBe('string');
    expect(body.name).toMatch(/^e2e-create-/);
    expect(body.criteria).toHaveLength(3);
    expect(body.criteria.map((c) => c.type).sort()).toEqual([
      'AGE',
      'GENDER',
      'SALARY_RANGE',
    ]);

    const age = body.criteria.find((c) => c.type === 'AGE');
    expect(age?.minAge).toBe(22);
    expect(age?.maxAge).toBe(30);
    expect(age?.gender).toBeNull();
    expect(age?.minSalary).toBeNull();

    const gender = body.criteria.find((c) => c.type === 'GENDER');
    expect(gender?.gender).toBe('ANY');
    expect(gender?.minAge).toBeNull();

    const salary = body.criteria.find((c) => c.type === 'SALARY_RANGE');
    expect(typeof salary?.minSalary).toBe('number');
    expect(salary?.minSalary).toBe(4500000);
    expect(salary?.maxSalary).toBe(6500000);

    createdIds.push(body.id);
  });

  it('rejects a vacancy with no criteria', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: { name: 'No Criteria', description: 'missing criteria' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<ErrorBody>();
    expect(body.message).toBe('Validation failed');
    expect(body.errors.some((e) => e.field === 'criteria')).toBe(true);
  });

  it('rejects a vacancy with an empty criteria array', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: {
        name: 'Empty Criteria',
        description: 'empty criteria',
        criteria: [],
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<ErrorBody>();
    expect(body.errors.some((e) => e.field === 'criteria')).toBe(true);
  });

  it('persists a default weight of 1 when omitted', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: {
        name: uniqueName('e2e-weight'),
        description: 'weight omitted',
        criteria: [{ type: 'AGE', minAge: 25, maxAge: 35 }],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<VacancyBody>();
    expect(body.criteria).toHaveLength(1);
    expect(body.criteria[0].weight).toBe(1);
    createdIds.push(body.id);

    const stored = await dataSource
      .getRepository(VacancyCriterion)
      .findOneBy({ vacancyId: body.id });
    expect(stored?.weight).toBe(1);
  });

  it('rejects an AGE criterion where minAge exceeds maxAge', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: {
        name: 'Bad Age',
        description: 'minAge > maxAge',
        criteria: [{ type: 'AGE', weight: 1, minAge: 40, maxAge: 20 }],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a SALARY_RANGE criterion where minSalary exceeds maxSalary', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: {
        name: 'Bad Salary',
        description: 'minSalary > maxSalary',
        criteria: [
          { type: 'SALARY_RANGE', weight: 1, minSalary: 9000000, maxSalary: 1000000 },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects an AGE criterion carrying a gender field', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: {
        name: 'Age With Gender',
        description: 'extra gender field on AGE',
        criteria: [{ type: 'AGE', weight: 1, minAge: 22, maxAge: 30, gender: 'ANY' }],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('replaces criteria atomically on PATCH', async () => {
    const create = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: {
        name: uniqueName('e2e-replace'),
        description: 'before replace',
        criteria: fullCriteria(),
      },
    });
    const id = create.json<VacancyBody>().id;
    createdIds.push(id);

    const patch = await fastify.inject({
      method: 'PATCH',
      url: `/vacancies/${id}`,
      payload: {
        criteria: [{ type: 'GENDER', weight: 7, gender: 'MALE' }],
      },
    });

    expect(patch.statusCode).toBe(200);
    const body = patch.json<VacancyBody>();
    expect(body.criteria).toHaveLength(1);
    expect(body.criteria[0].type).toBe('GENDER');
    expect(body.criteria[0].gender).toBe('MALE');
    expect(body.criteria[0].weight).toBe(7);

    const stored = await dataSource
      .getRepository(VacancyCriterion)
      .find({ where: { vacancyId: id } });
    expect(stored).toHaveLength(1);
    expect(stored[0].type).toBe('GENDER');
    expect(stored[0].gender).toBe('MALE');
  });

  it('rejects PATCH with an empty criteria array', async () => {
    const create = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: {
        name: uniqueName('e2e-patch-empty'),
        description: 'patch empty criteria',
        criteria: [{ type: 'GENDER', weight: 1, gender: 'ANY' }],
      },
    });
    const id = create.json<VacancyBody>().id;
    createdIds.push(id);

    const patch = await fastify.inject({
      method: 'PATCH',
      url: `/vacancies/${id}`,
      payload: { criteria: [] },
    });

    expect(patch.statusCode).toBe(400);
  });

  it('returns 404 for an unknown vacancy id', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: `/vacancies/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(404);
  });

  it('deletes a vacancy and 404s on subsequent reads', async () => {
    const create = await fastify.inject({
      method: 'POST',
      url: '/vacancies',
      payload: {
        name: uniqueName('e2e-delete'),
        description: 'to delete',
        criteria: [{ type: 'GENDER', weight: 1, gender: 'ANY' }],
      },
    });
    const id = create.json<VacancyBody>().id;
    createdIds.push(id);

    const del = await fastify.inject({
      method: 'DELETE',
      url: `/vacancies/${id}`,
    });
    expect(del.statusCode).toBe(204);
    expect(del.body).toBe('');

    const detail = await fastify.inject({
      method: 'GET',
      url: `/vacancies/${id}`,
    });
    expect(detail.statusCode).toBe(404);
  });
});
