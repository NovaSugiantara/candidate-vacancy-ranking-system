import { Injectable } from '@nestjs/common';
import type { Candidate } from '../../candidates/entities/candidate.entity';
import { CriterionGender } from '../../shared/enums/criterion-gender.enum';
import { CriterionType } from '../../shared/enums/criterion-type.enum';
import type { VacancyCriterion } from '../../vacancies/entities/vacancy-criterion.entity';
import type { CriterionStrategy } from './criterion-strategy.interface';

@Injectable()
export class GenderCriterionStrategy implements CriterionStrategy {
  readonly type = CriterionType.GENDER;

  isMatch(candidate: Candidate, criterion: VacancyCriterion, _asOf: Date): boolean {
    if (criterion.gender === CriterionGender.ANY) {
      return true;
    }
    return String(criterion.gender) === String(candidate.gender);
  }
}
