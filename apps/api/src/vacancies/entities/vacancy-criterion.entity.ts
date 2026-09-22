import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';
import { CriterionGender } from '../../shared/enums/criterion-gender.enum';
import { CriterionType } from '../../shared/enums/criterion-type.enum';
import { Vacancy } from './vacancy.entity';

@Entity({ name: 'vacancy_criteria' })
@Index('idx_vacancy_criteria_vacancy_id', ['vacancyId'])
@Check('chk_vacancy_criteria_weight_positive', '"weight" > 0')
@Check(
  'chk_vacancy_criteria_shape',
  `(
    ("type" = 'AGE' AND "min_age" IS NOT NULL AND "max_age" IS NOT NULL AND "min_age" <= "max_age" AND "gender" IS NULL AND "min_salary" IS NULL AND "max_salary" IS NULL)
    OR
    ("type" = 'GENDER' AND "min_age" IS NULL AND "max_age" IS NULL AND "gender" IS NOT NULL AND "min_salary" IS NULL AND "max_salary" IS NULL)
    OR
    ("type" = 'SALARY_RANGE' AND "min_age" IS NULL AND "max_age" IS NULL AND "gender" IS NULL AND "min_salary" IS NOT NULL AND "max_salary" IS NOT NULL AND "min_salary" <= "max_salary")
  )`,
)
export class VacancyCriterion {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ type: 'uuid', name: 'vacancy_id' })
  vacancyId: string;

  @ManyToOne(() => Vacancy, (vacancy) => vacancy.criteria, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'vacancy_id', referencedColumnName: 'id' })
  vacancy: Vacancy;

  @Column({
    type: 'enum',
    enum: CriterionType,
    enumName: 'criterion_type',
    name: 'type',
  })
  type: CriterionType;

  @Column({ type: 'integer', default: 1, name: 'weight' })
  weight: number;

  @Column({ type: 'smallint', nullable: true, name: 'min_age' })
  minAge: number | null;

  @Column({ type: 'smallint', nullable: true, name: 'max_age' })
  maxAge: number | null;

  @Column({
    type: 'enum',
    enum: CriterionGender,
    enumName: 'criterion_gender',
    nullable: true,
    name: 'gender',
  })
  gender: CriterionGender | null;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
    name: 'min_salary',
  })
  minSalary: number | null;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
    name: 'max_salary',
  })
  maxSalary: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
