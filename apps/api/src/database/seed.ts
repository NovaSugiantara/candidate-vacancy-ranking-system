import { Logger } from '@nestjs/common';
import dataSource from './data-source';

const logger = new Logger('DatabaseSeed');

async function seed(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      await manager.query(`
        INSERT INTO "candidates" (
          "id", "name", "email", "birthdate", "gender", "current_salary", "deleted_at"
        ) VALUES
          ('10000000-0000-4000-8000-000000000001', 'Siti Rahayu', 'siti.r@example.com', '1996-05-15', 'FEMALE', 5500000.00, NULL),
          ('10000000-0000-4000-8000-000000000002', 'Budi Santoso', 'budi.s@example.com', '1989-11-20', 'MALE', 8000000.00, NULL),
          ('10000000-0000-4000-8000-000000000003', 'Indah Lestari', 'indah.l@example.com', '2002-03-01', 'FEMALE', 4000000.00, NULL)
        ON CONFLICT ("id") DO UPDATE SET
          "name" = EXCLUDED."name",
          "email" = EXCLUDED."email",
          "birthdate" = EXCLUDED."birthdate",
          "gender" = EXCLUDED."gender",
          "current_salary" = EXCLUDED."current_salary",
          "deleted_at" = NULL,
          "updated_at" = CURRENT_TIMESTAMP
      `);

      await manager.query(`
        INSERT INTO "vacancies" ("id", "name", "description") VALUES
          ('20000000-0000-4000-8000-000000000001', 'Junior Software Engineer', 'Junior software engineering role.'),
          ('20000000-0000-4000-8000-000000000002', 'Senior Data Scientist', 'Senior data science role.')
        ON CONFLICT ("id") DO UPDATE SET
          "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "updated_at" = CURRENT_TIMESTAMP
      `);

      await manager.query(`
        DELETE FROM "vacancy_criteria"
        WHERE "vacancy_id" IN (
          '20000000-0000-4000-8000-000000000001',
          '20000000-0000-4000-8000-000000000002'
        )
      `);

      await manager.query(`
        INSERT INTO "vacancy_criteria" (
          "id", "vacancy_id", "type", "weight", "min_age", "max_age", "gender", "min_salary", "max_salary"
        ) VALUES
          ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'AGE', 3, 22, 30, NULL, NULL, NULL),
          ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'GENDER', 1, NULL, NULL, 'ANY', NULL, NULL),
          ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'SALARY_RANGE', 5, NULL, NULL, NULL, 4000000.00, 6500000.00),
          ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'AGE', 4, 30, 45, NULL, NULL, NULL),
          ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'GENDER', 2, NULL, NULL, 'MALE', NULL, NULL),
          ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'SALARY_RANGE', 6, NULL, NULL, NULL, 7500000.00, 10000000.00)
      `);
    });

    logger.log('Seeded 3 candidates, 2 vacancies, and 6 criteria');
  } finally {
    await dataSource.destroy();
  }
}

void seed().catch((error: unknown) => {
  const trace = error instanceof Error ? error.stack : String(error);
  logger.error('Database seed failed', trace);
  process.exitCode = 1;
});
