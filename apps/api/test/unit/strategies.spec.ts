import { Candidate } from '../../src/candidates/entities/candidate.entity';
import { AgeCriterionStrategy } from '../../src/ranking/strategies/age-criterion.strategy';
import { GenderCriterionStrategy } from '../../src/ranking/strategies/gender-criterion.strategy';
import { SalaryRangeCriterionStrategy } from '../../src/ranking/strategies/salary-range-criterion.strategy';
import { CandidateGender } from '../../src/shared/enums/candidate-gender.enum';
import { CriterionGender } from '../../src/shared/enums/criterion-gender.enum';
import { CriterionType } from '../../src/shared/enums/criterion-type.enum';
import { VacancyCriterion } from '../../src/vacancies/entities/vacancy-criterion.entity';

const AS_OF = new Date(2026, 8, 22, 12, 0, 0);

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return Object.assign(new Candidate(), {
    id: 'candidate-1',
    name: 'Alice Adams',
    email: 'alice.adams@example.test',
    birthdate: '1998-06-15',
    gender: CandidateGender.FEMALE,
    currentSalary: 5_500_000,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deletedAt: null,
    ...overrides,
  });
}

function makeCriterion(overrides: Partial<VacancyCriterion> = {}): VacancyCriterion {
  return Object.assign(new VacancyCriterion(), {
    id: 'criterion-1',
    vacancyId: 'vacancy-1',
    type: CriterionType.AGE,
    weight: 1,
    minAge: null,
    maxAge: null,
    gender: null,
    minSalary: null,
    maxSalary: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  });
}

describe('AgeCriterionStrategy', () => {
  const strategy = new AgeCriterionStrategy();

  it('matches a candidate exactly at minAge', () => {
    const candidate = makeCandidate({ birthdate: '2004-06-15' });
    const criterion = makeCriterion({ type: CriterionType.AGE, minAge: 22, maxAge: 30 });
    expect(strategy.isMatch(candidate, criterion, AS_OF)).toBe(true);
  });

  it('matches a candidate exactly at maxAge', () => {
    const candidate = makeCandidate({ birthdate: '1996-06-15' });
    const criterion = makeCriterion({ type: CriterionType.AGE, minAge: 22, maxAge: 30 });
    expect(strategy.isMatch(candidate, criterion, AS_OF)).toBe(true);
  });

  it('rejects a candidate one year below minAge', () => {
    const candidate = makeCandidate({ birthdate: '2005-06-15' });
    const criterion = makeCriterion({ type: CriterionType.AGE, minAge: 22, maxAge: 30 });
    expect(strategy.isMatch(candidate, criterion, AS_OF)).toBe(false);
  });

  it('rejects a candidate one year above maxAge', () => {
    const candidate = makeCandidate({ birthdate: '1995-06-15' });
    const criterion = makeCriterion({ type: CriterionType.AGE, minAge: 22, maxAge: 30 });
    expect(strategy.isMatch(candidate, criterion, AS_OF)).toBe(false);
  });

  it('computes one year younger when the birthday has not yet passed this year', () => {
    const candidate = makeCandidate({ birthdate: '2004-12-31' });
    const criterion = makeCriterion({ type: CriterionType.AGE, minAge: 21, maxAge: 21 });
    expect(strategy.isMatch(candidate, criterion, AS_OF)).toBe(true);
  });
});

describe('GenderCriterionStrategy', () => {
  const strategy = new GenderCriterionStrategy();

  it('ANY matches MALE and FEMALE', () => {
    const criterion = makeCriterion({
      type: CriterionType.GENDER,
      gender: CriterionGender.ANY,
    });
    expect(
      strategy.isMatch(makeCandidate({ gender: CandidateGender.MALE }), criterion, AS_OF),
    ).toBe(true);
    expect(
      strategy.isMatch(makeCandidate({ gender: CandidateGender.FEMALE }), criterion, AS_OF),
    ).toBe(true);
  });

  it('MALE matches MALE and not FEMALE', () => {
    const criterion = makeCriterion({
      type: CriterionType.GENDER,
      gender: CriterionGender.MALE,
    });
    expect(
      strategy.isMatch(makeCandidate({ gender: CandidateGender.MALE }), criterion, AS_OF),
    ).toBe(true);
    expect(
      strategy.isMatch(makeCandidate({ gender: CandidateGender.FEMALE }), criterion, AS_OF),
    ).toBe(false);
  });

  it('FEMALE matches FEMALE and not MALE', () => {
    const criterion = makeCriterion({
      type: CriterionType.GENDER,
      gender: CriterionGender.FEMALE,
    });
    expect(
      strategy.isMatch(makeCandidate({ gender: CandidateGender.FEMALE }), criterion, AS_OF),
    ).toBe(true);
    expect(
      strategy.isMatch(makeCandidate({ gender: CandidateGender.MALE }), criterion, AS_OF),
    ).toBe(false);
  });
});

describe('SalaryRangeCriterionStrategy', () => {
  const strategy = new SalaryRangeCriterionStrategy();

  it('matches a candidate exactly at minSalary', () => {
    const candidate = makeCandidate({ currentSalary: 4_500_000 });
    const criterion = makeCriterion({
      type: CriterionType.SALARY_RANGE,
      minSalary: 4_500_000,
      maxSalary: 6_500_000,
    });
    expect(strategy.isMatch(candidate, criterion, AS_OF)).toBe(true);
  });

  it('matches a candidate exactly at maxSalary', () => {
    const candidate = makeCandidate({ currentSalary: 6_500_000 });
    const criterion = makeCriterion({
      type: CriterionType.SALARY_RANGE,
      minSalary: 4_500_000,
      maxSalary: 6_500_000,
    });
    expect(strategy.isMatch(candidate, criterion, AS_OF)).toBe(true);
  });

  it('rejects a candidate below minSalary', () => {
    const candidate = makeCandidate({ currentSalary: 4_499_999 });
    const criterion = makeCriterion({
      type: CriterionType.SALARY_RANGE,
      minSalary: 4_500_000,
      maxSalary: 6_500_000,
    });
    expect(strategy.isMatch(candidate, criterion, AS_OF)).toBe(false);
  });

  it('rejects a candidate above maxSalary', () => {
    const candidate = makeCandidate({ currentSalary: 6_500_001 });
    const criterion = makeCriterion({
      type: CriterionType.SALARY_RANGE,
      minSalary: 4_500_000,
      maxSalary: 6_500_000,
    });
    expect(strategy.isMatch(candidate, criterion, AS_OF)).toBe(false);
  });
});
