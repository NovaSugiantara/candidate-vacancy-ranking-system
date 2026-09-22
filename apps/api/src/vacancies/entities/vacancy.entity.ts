import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VacancyCriterion } from './vacancy-criterion.entity';

@Entity({ name: 'vacancies' })
export class Vacancy {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ type: 'varchar', length: 160, name: 'name' })
  name: string;

  @Column({ type: 'text', name: 'description' })
  description: string;

  @OneToMany(() => VacancyCriterion, (criterion) => criterion.vacancy, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  criteria: VacancyCriterion[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
