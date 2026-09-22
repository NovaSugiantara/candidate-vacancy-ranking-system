import type { Control, FieldArrayWithId, FieldErrors, UseFormRegister } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { criterionGenders, criterionTypes, type CriterionType } from '../api/types';
import type { VacancyFormInput, VacancyFormValues } from '../lib/schemas';

type CriterionFieldsProps = {
  readonly control: Control<VacancyFormInput, undefined, VacancyFormValues>;
  readonly errors: FieldErrors<VacancyFormInput>;
  readonly fields: readonly FieldArrayWithId<VacancyFormInput, 'criteria'>[];
  readonly onAdd: () => void;
  readonly onRemove: (index: number) => void;
  readonly register: UseFormRegister<VacancyFormInput>;
};

type CriterionRowProps = Omit<CriterionFieldsProps, 'fields' | 'onAdd'> & {
  readonly fieldId: string;
  readonly index: number;
};

class CriterionTypeError extends Error {
  constructor() {
    super('The criterion type is not supported.');
    this.name = 'CriterionTypeError';
  }
}

const assertNever = (_value: never): never => {
  throw new CriterionTypeError();
};

const renderDetailFields = (
  type: CriterionType,
  index: number,
  register: UseFormRegister<VacancyFormInput>,
  errors: FieldErrors<VacancyFormInput>,
) => {
  const criterionErrors = errors.criteria?.[index];
  const fieldPath = `criteria.${index}` as const;

  switch (type) {
    case 'AGE':
      return (
        <div className="criterion-detail-grid">
          <div className="field">
            <label htmlFor={`criterion-${index}-min-age`}>Minimum age</label>
            <input
              aria-describedby={
                criterionErrors?.minAge ? `criterion-${index}-min-age-error` : undefined
              }
              aria-invalid={criterionErrors?.minAge ? true : undefined}
              id={`criterion-${index}-min-age`}
              min="0"
              step="1"
              type="number"
              {...register(`${fieldPath}.minAge`, { valueAsNumber: true })}
            />
            {criterionErrors?.minAge ? (
              <p className="field-error" id={`criterion-${index}-min-age-error`}>
                {criterionErrors.minAge.message}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor={`criterion-${index}-max-age`}>Maximum age</label>
            <input
              aria-describedby={
                criterionErrors?.maxAge ? `criterion-${index}-max-age-error` : undefined
              }
              aria-invalid={criterionErrors?.maxAge ? true : undefined}
              id={`criterion-${index}-max-age`}
              min="0"
              step="1"
              type="number"
              {...register(`${fieldPath}.maxAge`, { valueAsNumber: true })}
            />
            {criterionErrors?.maxAge ? (
              <p className="field-error" id={`criterion-${index}-max-age-error`}>
                {criterionErrors.maxAge.message}
              </p>
            ) : null}
          </div>
        </div>
      );
    case 'GENDER':
      return (
        <div className="criterion-detail-grid">
          <div className="field">
            <label htmlFor={`criterion-${index}-gender`}>Gender condition</label>
            <select
              aria-describedby={
                criterionErrors?.gender ? `criterion-${index}-gender-error` : undefined
              }
              aria-invalid={criterionErrors?.gender ? true : undefined}
              id={`criterion-${index}-gender`}
              {...register(`${fieldPath}.gender`)}
            >
              {criterionGenders.map((gender) => (
                <option key={gender} value={gender}>
                  {gender === 'ANY' ? 'Any gender' : gender === 'FEMALE' ? 'Female' : 'Male'}
                </option>
              ))}
            </select>
            {criterionErrors?.gender ? (
              <p className="field-error" id={`criterion-${index}-gender-error`}>
                {criterionErrors.gender.message}
              </p>
            ) : null}
          </div>
        </div>
      );
    case 'SALARY_RANGE':
      return (
        <div className="criterion-detail-grid">
          <div className="field">
            <label htmlFor={`criterion-${index}-min-salary`}>Minimum salary</label>
            <input
              aria-describedby={
                criterionErrors?.minSalary ? `criterion-${index}-min-salary-error` : undefined
              }
              aria-invalid={criterionErrors?.minSalary ? true : undefined}
              id={`criterion-${index}-min-salary`}
              min="0"
              step="1"
              type="number"
              {...register(`${fieldPath}.minSalary`, { valueAsNumber: true })}
            />
            {criterionErrors?.minSalary ? (
              <p className="field-error" id={`criterion-${index}-min-salary-error`}>
                {criterionErrors.minSalary.message}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor={`criterion-${index}-max-salary`}>Maximum salary</label>
            <input
              aria-describedby={
                criterionErrors?.maxSalary ? `criterion-${index}-max-salary-error` : undefined
              }
              aria-invalid={criterionErrors?.maxSalary ? true : undefined}
              id={`criterion-${index}-max-salary`}
              min="0"
              step="1"
              type="number"
              {...register(`${fieldPath}.maxSalary`, { valueAsNumber: true })}
            />
            {criterionErrors?.maxSalary ? (
              <p className="field-error" id={`criterion-${index}-max-salary-error`}>
                {criterionErrors.maxSalary.message}
              </p>
            ) : null}
          </div>
        </div>
      );
    default:
      return assertNever(type);
  }
};

const CriterionRow = ({
  control,
  errors,
  fieldId,
  index,
  onRemove,
  register,
}: CriterionRowProps) => {
  const type = useWatch({
    control,
    name: `criteria.${index}.type` as const,
  });
  const criterionErrors = errors.criteria?.[index];

  return (
    <fieldset className="criterion-row">
      <legend>Criterion {index + 1}</legend>
      <div className="criterion-row-grid">
        <div className="field">
          <label htmlFor={`criterion-${fieldId}-type`}>Criterion type</label>
          <select id={`criterion-${fieldId}-type`} {...register(`criteria.${index}.type` as const)}>
            {criterionTypes.map((criterionType) => (
              <option key={criterionType} value={criterionType}>
                {criterionType === 'AGE'
                  ? 'Age'
                  : criterionType === 'GENDER'
                    ? 'Gender'
                    : 'Salary range'}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`criterion-${fieldId}-weight`}>Weight</label>
          <input
            aria-describedby={
              criterionErrors?.weight ? `criterion-${fieldId}-weight-error` : undefined
            }
            aria-invalid={criterionErrors?.weight ? true : undefined}
            id={`criterion-${fieldId}-weight`}
            min="0.01"
            step="0.01"
            type="number"
            {...register(`criteria.${index}.weight` as const, { valueAsNumber: true })}
          />
          {criterionErrors?.weight ? (
            <p className="field-error" id={`criterion-${fieldId}-weight-error`}>
              {criterionErrors.weight.message}
            </p>
          ) : null}
        </div>
        <button
          aria-label={`Remove criterion ${index + 1}`}
          className="text-button text-button-danger"
          onClick={() => onRemove(index)}
          type="button"
        >
          Remove
        </button>
      </div>
      {renderDetailFields(type, index, register, errors)}
    </fieldset>
  );
};

export const CriterionFields = ({
  control,
  errors,
  fields,
  onAdd,
  onRemove,
  register,
}: CriterionFieldsProps) => (
  <section aria-labelledby="criteria-heading">
    <div className="criteria-header">
      <div>
        <h2 className="section-heading" id="criteria-heading">
          Ranking criteria
        </h2>
        <p className="section-description">
          Candidates receive the weight for every criterion they match.
        </p>
      </div>
      <button className="button button-secondary button-compact" onClick={onAdd} type="button">
        Add criterion
      </button>
    </div>
    <div className="criteria-list">
      {fields.map((field, index) => (
        <CriterionRow
          control={control}
          errors={errors}
          fieldId={field.id}
          index={index}
          key={field.id}
          onRemove={onRemove}
          register={register}
        />
      ))}
    </div>
    {errors.criteria?.root ? (
      <p className="field-error criteria-error">{errors.criteria.root.message}</p>
    ) : null}
  </section>
);
