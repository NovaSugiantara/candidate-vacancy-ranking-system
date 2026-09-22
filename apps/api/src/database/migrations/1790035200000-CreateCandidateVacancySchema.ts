import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCandidateVacancySchema1790035200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "candidate_gender" AS ENUM ('MALE', 'FEMALE')`);
    await queryRunner.query(
      `CREATE TYPE "criterion_type" AS ENUM ('AGE', 'GENDER', 'SALARY_RANGE')`,
    );
    await queryRunner.query(`CREATE TYPE "criterion_gender" AS ENUM ('MALE', 'FEMALE', 'ANY')`);

    await queryRunner.query(`
      CREATE TABLE "candidates" (
        "id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "email" varchar(254) NOT NULL,
        "birthdate" date NOT NULL,
        "gender" "candidate_gender" NOT NULL,
        "current_salary" numeric(15,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" timestamptz NULL,
        CONSTRAINT "pk_candidates" PRIMARY KEY ("id"),
        CONSTRAINT "chk_candidates_current_salary_nonnegative" CHECK ("current_salary" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "vacancies" (
        "id" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "description" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pk_vacancies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "vacancy_criteria" (
        "id" uuid NOT NULL,
        "vacancy_id" uuid NOT NULL,
        "type" "criterion_type" NOT NULL,
        "weight" integer NOT NULL DEFAULT 1,
        "min_age" smallint NULL,
        "max_age" smallint NULL,
        "gender" "criterion_gender" NULL,
        "min_salary" numeric(15,2) NULL,
        "max_salary" numeric(15,2) NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pk_vacancy_criteria" PRIMARY KEY ("id"),
        CONSTRAINT "fk_vacancy_criteria_vacancy" FOREIGN KEY ("vacancy_id") REFERENCES "vacancies"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_vacancy_criteria_weight_positive" CHECK ("weight" > 0),
        CONSTRAINT "chk_vacancy_criteria_shape" CHECK (
          (
            "type" = 'AGE'
            AND "min_age" IS NOT NULL
            AND "max_age" IS NOT NULL
            AND "min_age" <= "max_age"
            AND "gender" IS NULL
            AND "min_salary" IS NULL
            AND "max_salary" IS NULL
          )
          OR (
            "type" = 'GENDER'
            AND "min_age" IS NULL
            AND "max_age" IS NULL
            AND "gender" IS NOT NULL
            AND "min_salary" IS NULL
            AND "max_salary" IS NULL
          )
          OR (
            "type" = 'SALARY_RANGE'
            AND "min_age" IS NULL
            AND "max_age" IS NULL
            AND "gender" IS NULL
            AND "min_salary" IS NOT NULL
            AND "max_salary" IS NOT NULL
            AND "min_salary" <= "max_salary"
          )
        )
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_candidates_email_active"
      ON "candidates" (lower("email"))
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_vacancy_criteria_vacancy_id"
      ON "vacancy_criteria" ("vacancy_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_vacancy_criteria_vacancy_id"`);
    await queryRunner.query(`DROP INDEX "uq_candidates_email_active"`);
    await queryRunner.query(`DROP TABLE "vacancy_criteria"`);
    await queryRunner.query(`DROP TABLE "vacancies"`);
    await queryRunner.query(`DROP TABLE "candidates"`);
    await queryRunner.query(`DROP TYPE "criterion_gender"`);
    await queryRunner.query(`DROP TYPE "criterion_type"`);
    await queryRunner.query(`DROP TYPE "candidate_gender"`);
  }
}
