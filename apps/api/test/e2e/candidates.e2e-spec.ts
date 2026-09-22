import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { createValidationPipe } from '../../src/common/pipes/validation-pipe.factory';
import { Candidate } from '../../src/candidates/entities/candidate.entity';

type CandidateBody = {
  id: string;
  name: string;
  email: string;
  birthdate: string;
  gender: string;
  currentSalary: number;
  createdAt: string;
  updatedAt: string;
};

type ListBody = {
  data: CandidateBody[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ErrorBody = {
  statusCode: number;
  message: string;
  errors: Array<{ field: string; message: string }>;
};

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.test`;
}

describe('Candidates (e2e)', () => {
  let app: NestFastifyApplication;
  let fastify: FastifyInstance;
  let dataSource: DataSource;
  const createdIds: string[] = [];

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
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await dataSource.getRepository(Candidate).delete(createdIds);
    }
    await app.close();
  });

  it('creates a candidate and returns the persisted shape', async () => {
    const email = uniqueEmail('e2e-create');
    const response = await fastify.inject({
      method: 'POST',
      url: '/candidates',
      payload: {
        name: 'E2E Candidate',
        email,
        birthdate: '1995-04-12',
        gender: 'FEMALE',
        currentSalary: 4500000.5,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<CandidateBody>();
    expect(typeof body.id).toBe('string');
    expect(body.name).toBe('E2E Candidate');
    expect(body.email).toBe(email);
    expect(body.birthdate).toBe('1995-04-12');
    expect(body.gender).toBe('FEMALE');
    expect(typeof body.currentSalary).toBe('number');
    expect(body.currentSalary).toBe(4500000.5);
    expect(body).not.toHaveProperty('deletedAt');
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(body.updatedAt))).toBe(false);
    createdIds.push(body.id);
  });

  it('rejects a duplicate email with 409', async () => {
    const email = uniqueEmail('e2e-dup');
    const payload = {
      name: 'Dup Candidate',
      email,
      birthdate: '1990-01-01',
      gender: 'MALE',
      currentSalary: 1000,
    };

    const first = await fastify.inject({
      method: 'POST',
      url: '/candidates',
      payload,
    });
    expect(first.statusCode).toBe(201);
    createdIds.push(first.json<CandidateBody>().id);

    const duplicate = await fastify.inject({
      method: 'POST',
      url: '/candidates',
      payload,
    });
    expect(duplicate.statusCode).toBe(409);
    const body = duplicate.json<ErrorBody>();
    expect(body.statusCode).toBe(409);
    expect(body.message).toBe('Email already exists');
    expect(body.errors[0].field).toBe('email');
  });

  it('rejects an invalid email with 400', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/candidates',
      payload: {
        name: 'Bad Email',
        email: 'not-an-email',
        birthdate: '1995-04-12',
        gender: 'FEMALE',
        currentSalary: 1000,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<ErrorBody>();
    expect(body.message).toBe('Validation failed');
    expect(body.errors[0].field).toBe('email');
  });

  it('returns 404 when patching a missing candidate', async () => {
    const response = await fastify.inject({
      method: 'PATCH',
      url: `/candidates/${randomUUID()}`,
      payload: { name: 'Updated' },
    });
    expect(response.statusCode).toBe(404);
  });

  it('returns 404 when deleting a missing candidate', async () => {
    const response = await fastify.inject({
      method: 'DELETE',
      url: `/candidates/${randomUUID()}`,
    });
    expect(response.statusCode).toBe(404);
  });

  it('returns the list envelope', async () => {
    const email = uniqueEmail('e2e-list');
    const created = await fastify.inject({
      method: 'POST',
      url: '/candidates',
      payload: {
        name: 'Listed Candidate',
        email,
        birthdate: '1994-04-04',
        gender: 'FEMALE',
        currentSalary: 3000,
      },
    });
    const id = created.json<CandidateBody>().id;
    createdIds.push(id);

    const response = await fastify.inject({
      method: 'GET',
      url: `/candidates?search=${encodeURIComponent('e2e-list')}&page=1&limit=10`,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<ListBody>();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
    expect(typeof body.pagination.total).toBe('number');
    expect(typeof body.pagination.totalPages).toBe('number');
    expect(body.data.some((candidate) => candidate.id === id)).toBe(true);
  });

  it('soft-deletes a candidate and hides it from reads', async () => {
    const email = uniqueEmail('e2e-del');
    const created = await fastify.inject({
      method: 'POST',
      url: '/candidates',
      payload: {
        name: 'To Delete',
        email,
        birthdate: '1993-03-03',
        gender: 'MALE',
        currentSalary: 2000,
      },
    });
    const id = created.json<CandidateBody>().id;
    createdIds.push(id);

    const del = await fastify.inject({
      method: 'DELETE',
      url: `/candidates/${id}`,
    });
    expect(del.statusCode).toBe(204);
    expect(del.body).toBe('');

    const detail = await fastify.inject({
      method: 'GET',
      url: `/candidates/${id}`,
    });
    expect(detail.statusCode).toBe(404);

    const list = await fastify.inject({
      method: 'GET',
      url: '/candidates?limit=100',
    });
    const body = list.json<ListBody>();
    expect(body.data.some((candidate) => candidate.id === id)).toBe(false);
  });
});
