import type { Candidate } from '../../candidates/entities/candidate.entity';
import type { CriterionType } from '../../shared/enums/criterion-type.enum';
import type { VacancyCriterion } from '../../vacancies/entities/vacancy-criterion.entity';

export interface CriterionStrategy {
  readonly type: CriterionType;
  isMatch(candidate: Candidate, criterion: VacancyCriterion, asOf: Date): boolean;
}
