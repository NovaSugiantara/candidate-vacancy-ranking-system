import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';

import { ApiError } from '../api/client';
import type { Vacancy, VacancyCriterionInput, VacancyInput } from '../api/types';
import { vacancyFormSchema, type VacancyFormInput, type VacancyFormValues } from '../lib/schemas';
import { CriterionFields } from './CriterionFields';

type VacancyFormProps = {
  readonly onCancel: () => void;
  readonly onSubmit: (input: VacancyInput) => Promise<void>;
  readonly submitLabel: string;
  readonly vacancy?: Vacancy;
};

const createCriterion = (): VacancyFormInput['criteria'][number] => ({
  type: 'AGE',
  weight: 1,
  minAge: 18,
  maxAge: 65,
  gender: 'ANY',
  minSalary: 0,
  maxSalary: 0,
});

const toCriterionInput = (
  criterion: VacancyFormValues['criteria'][number],
): VacancyCriterionInput => {
  switch (criterion.type) {
    case 'AGE':
      return {
        type: criterion.type,
        weight: criterion.weight,
        minAge: criterion.minAge,
        maxAge: criterion.maxAge,
      };
    case 'GENDER':
      return {
        type: criterion.type,
        weight: criterion.weight,
        gender: criterion.gender,
      };
    case 'SALARY_RANGE':
      return {
        type: criterion.type,
        weight: criterion.weight,
        minSalary: criterion.minSalary,
        maxSalary: criterion.maxSalary,
      };
  }
};

const toDefaultValues = (vacancy?: Vacancy): VacancyFormInput => ({
  name: vacancy?.name ?? '',
  description: vacancy?.description ?? '',
  criteria: vacancy?.criteria.map((criterion) => {
    switch (criterion.type) {
      case 'AGE':
        return {
          type: criterion.type,
          weight: criterion.weight,
          minAge: criterion.minAge,
          maxAge: criterion.maxAge,
        };
      case 'GENDER':
        return {
          type: criterion.type,
          weight: criterion.weight,
          gender: criterion.gender,
        };
      case 'SALARY_RANGE':
        return {
          type: criterion.type,
          weight: criterion.weight,
          minSalary: criterion.minSalary,
          maxSalary: criterion.maxSalary,
        };
    }
  }) ?? [createCriterion()],
});

export const VacancyForm = ({ onCancel, onSubmit, submitLabel, vacancy }: VacancyFormProps) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<VacancyFormInput, undefined, VacancyFormValues>({
    defaultValues: toDefaultValues(vacancy),
    resolver: zodResolver(vacancyFormSchema),
  });
  const { append, fields, remove } = useFieldArray({
    control,
    name: 'criteria',
  });

  const setServerError = (field: string, message: string) => {
    switch (field) {
      case 'description':
        setError('description', { type: 'server', message });
        return;
      case 'name':
        setError('name', { type: 'server', message });
        return;
      default:
        setError('root', { type: 'server', message });
    }
  };

  const submitForm = async (values: VacancyFormValues) => {
    const input: VacancyInput = {
      name: values.name,
      description: values.description,
      criteria: values.criteria.map(toCriterionInput),
    };

    try {
      await onSubmit(input);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.length > 0) {
        error.fieldErrors.forEach((fieldError) => {
          setServerError(fieldError.field, fieldError.message);
        });
        return;
      }

      setError('root', {
        type: 'server',
        message:
          error instanceof ApiError
            ? error.message
            : 'The vacancy could not be saved. Please try again.',
      });
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(submitForm)}>
      <div className="form-grid">
        <div className="field field-span-full">
          <label htmlFor="vacancy-name">Vacancy name</label>
          <input
            aria-describedby={errors.name ? 'vacancy-name-error' : undefined}
            aria-invalid={errors.name ? true : undefined}
            id="vacancy-name"
            {...register('name')}
          />
          {errors.name ? (
            <p className="field-error" id="vacancy-name-error">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="field field-span-full">
          <label htmlFor="vacancy-description">Description</label>
          <textarea
            aria-describedby={errors.description ? 'vacancy-description-error' : undefined}
            aria-invalid={errors.description ? true : undefined}
            id="vacancy-description"
            {...register('description')}
          />
          {errors.description ? (
            <p className="field-error" id="vacancy-description-error">
              {errors.description.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="stack-compact">
        <CriterionFields
          control={control}
          errors={errors}
          fields={fields}
          onAdd={() => append(createCriterion())}
          onRemove={remove}
          register={register}
        />
        {errors.root ? <p className="field-error criteria-error">{errors.root.message}</p> : null}
      </div>

      <div className="form-actions">
        <button
          className="button button-secondary"
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button className="button button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving' : submitLabel}
        </button>
      </div>
    </form>
  );
};
