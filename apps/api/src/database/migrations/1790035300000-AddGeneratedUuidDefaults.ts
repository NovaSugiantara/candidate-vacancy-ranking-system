import type { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = ['candidates', 'vacancies', 'vacancy_criteria'] as const;

/**
 * `@PrimaryGeneratedColumn('uuid')` on TypeORM 1.x delegates generation to the
 * database — the column is omitted from INSERT entirely. The initial migration
 * declared these id columns NOT NULL without a default, so every insert failed
 * with `null value in column "id" violates not-null constraint`.
 *
 * Postgres 13+ ships gen_random_uuid() in core, so no pgcrypto extension is needed.
 */
export class AddGeneratedUuidDefaults1790035300000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "id" DROP DEFAULT`);
    }
  }
}
