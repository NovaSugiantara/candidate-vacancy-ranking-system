import type {
  CandidateGender,
  CriterionGender,
  CriterionType,
  VacancyCriterion,
} from '../api/types';

const numberFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const formatNumber = (value: number): string => numberFormatter.format(value);

export const formatDate = (value: string): string =>
  dateFormatter.format(new Date(`${value}T00:00:00`));

export const formatCandidateGender = (value: CandidateGender): string => {
  switch (value) {
    case 'FEMALE':
      return 'Female';
    case 'MALE':
      return 'Male';
  }
};

export const formatCriterionGender = (value: CriterionGender): string => {
  switch (value) {
    case 'ANY':
      return 'Any gender';
    case 'FEMALE':
      return 'Female';
    case 'MALE':
      return 'Male';
  }
};

export const formatCriterionType = (value: CriterionType): string => {
  switch (value) {
    case 'AGE':
      return 'Age';
    case 'GENDER':
      return 'Gender';
    case 'SALARY_RANGE':
      return 'Salary range';
  }
};

export const formatCriterionSummary = (criterion: VacancyCriterion): string => {
  switch (criterion.type) {
    case 'AGE':
      return `Age ${criterion.minAge}-${criterion.maxAge}`;
    case 'GENDER':
      return formatCriterionGender(criterion.gender);
    case 'SALARY_RANGE':
      return `Salary ${formatNumber(criterion.minSalary)}-${formatNumber(criterion.maxSalary)}`;
  }
};
