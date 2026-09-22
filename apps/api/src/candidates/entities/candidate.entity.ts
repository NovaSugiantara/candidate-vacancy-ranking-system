import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';
import { CandidateGender } from '../../shared/enums/candidate-gender.enum';

@Entity({ name: 'candidates' })
@Check('chk_candidates_current_salary_nonnegative', '"current_salary" >= 0')
// ponytail: the migration owns this functional partial index because decorators cannot express it reliably.
@Index('uq_candidates_email_active', { synchronize: false })
export class Candidate {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ type: 'varchar', length: 120, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 254, name: 'email' })
  email: string;

  @Column({ type: 'date', name: 'birthdate' })
  birthdate: string;

  @Column({
    type: 'enum',
    enum: CandidateGender,
    enumName: 'candidate_gender',
    name: 'gender',
  })
  gender: CandidateGender;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: numericTransformer,
    name: 'current_salary',
  })
  currentSalary: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
