import type { CriterionType } from '../shared/enums/criterion-type.enum';

export type MatchedCriterion = {
  readonly type: CriterionType;
  readonly weight: number;
  readonly matched: boolean;
};

export type RankingResultItem = {
  readonly candidateId: string;
  readonly name: string;
  readonly email: string;
  readonly score: number;
  readonly matchedCriteria: readonly MatchedCriterion[];
};

export type VacancySummary = {
  readonly id: string;
  readonly name: string;
};

export type RankingResponse = {
  readonly vacancy: VacancySummary;
  readonly results: readonly RankingResultItem[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
};

export type CachedRanking = {
  readonly vacancy: VacancySummary;
  readonly results: readonly RankingResultItem[];
};
