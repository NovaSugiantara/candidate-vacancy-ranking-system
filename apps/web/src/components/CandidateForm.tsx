import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ApiError } from '../api/client';
import { type Candidate, type CandidateInput, candidateGenders } from '../api/types';
import {
  candidateFormSchema,
  type CandidateFormInput,
  type CandidateFormValues,
} from '../lib/schemas';

type CandidateFormProps = {
  readonly candidate?: Candidate;
  readonly onCancel: () => void;
  readonly onSubmit: (input: CandidateInput) => Promise<void>;
  readonly submitLabel: string;
};

const toDefaultValues = (candidate?: Candidate): CandidateFormInput => ({
  name: candidate?.name ?? '',
  email: candidate?.email ?? '',
  birthdate: candidate?.birthdate ?? '',
  gender: candidate?.gender ?? 'MALE',
  currentSalary: candidate?.currentSalary ?? 0,
});

export const CandidateForm = ({
  candidate,
  onCancel,
  onSubmit,
  submitLabel,
}: CandidateFormProps) => {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<CandidateFormInput, undefined, CandidateFormValues>({
    defaultValues: toDefaultValues(candidate),
    resolver: zodResolver(candidateFormSchema),
  });

  const setServerError = (field: string, message: string) => {
    switch (field) {
      case 'birthdate':
        setError('birthdate', { type: 'server', message });
        return;
      case 'currentSalary':
        setError('currentSalary', { type: 'server', message });
        return;
      case 'email':
        setError('email', { type: 'server', message });
        return;
      case 'gender':
        setError('gender', { type: 'server', message });
        return;
      case 'name':
        setError('name', { type: 'server', message });
        return;
      default:
        setError('root', { type: 'server', message });
    }
  };

  const submitForm = async (values: CandidateFormValues) => {
    try {
      await onSubmit(values);
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
            : 'The candidate could not be saved. Please try again.',
      });
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(submitForm)}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="candidate-name">Name</label>
          <input
            aria-describedby={errors.name ? 'candidate-name-error' : undefined}
            aria-invalid={errors.name ? true : undefined}
            autoComplete="name"
            id="candidate-name"
            {...register('name')}
          />
          {errors.name ? (
            <p className="field-error" id="candidate-name-error">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="candidate-email">Email</label>
          <input
            aria-describedby={errors.email ? 'candidate-email-error' : undefined}
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            id="candidate-email"
            type="email"
            {...register('email')}
          />
          {errors.email ? (
            <p className="field-error" id="candidate-email-error">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="candidate-birthdate">Birth date</label>
          <input
            aria-describedby={errors.birthdate ? 'candidate-birthdate-error' : undefined}
            aria-invalid={errors.birthdate ? true : undefined}
            id="candidate-birthdate"
            type="date"
            {...register('birthdate')}
          />
          {errors.birthdate ? (
            <p className="field-error" id="candidate-birthdate-error">
              {errors.birthdate.message}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="candidate-gender">Gender</label>
          <select
            aria-describedby={errors.gender ? 'candidate-gender-error' : undefined}
            aria-invalid={errors.gender ? true : undefined}
            id="candidate-gender"
            {...register('gender')}
          >
            {candidateGenders.map((gender) => (
              <option key={gender} value={gender}>
                {gender === 'FEMALE' ? 'Female' : 'Male'}
              </option>
            ))}
          </select>
          {errors.gender ? (
            <p className="field-error" id="candidate-gender-error">
              {errors.gender.message}
            </p>
          ) : null}
        </div>

        <div className="field field-span-full">
          <label htmlFor="candidate-current-salary">Current salary</label>
          <input
            aria-describedby={errors.currentSalary ? 'candidate-current-salary-error' : undefined}
            aria-invalid={errors.currentSalary ? true : undefined}
            id="candidate-current-salary"
            min="0"
            step="1"
            type="number"
            {...register('currentSalary', { valueAsNumber: true })}
          />
          {errors.currentSalary ? (
            <p className="field-error" id="candidate-current-salary-error">
              {errors.currentSalary.message}
            </p>
          ) : null}
        </div>
      </div>

      {errors.root ? <p className="field-error criteria-error">{errors.root.message}</p> : null}

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
