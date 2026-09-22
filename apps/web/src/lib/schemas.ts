import { z } from 'zod';

import { candidateGenders, criterionGenders, criterionTypes } from '../api/types';

const nonNegativeInteger = z.coerce
  .number({ error: 'Enter a whole number.' })
  .int({ error: 'Enter a whole number.' })
  .nonnegative({ error: 'Value cannot be negative.' });

export const candidateFormSchema = z.object({
  name: z.string().trim().min(1, { error: 'Name is required.' }),
  email: z.email({ error: 'Enter a valid email address.' }),
  birthdate: z.iso.date({ error: 'Enter a valid birth date.' }),
  gender: z.enum(candidateGenders, { error: 'Choose a gender.' }),
  currentSalary: nonNegativeInteger,
});

export type CandidateFormInput = z.input<typeof candidateFormSchema>;
export type CandidateFormValues = z.output<typeof candidateFormSchema>;

export const criterionFormSchema = z
  .object({
    type: z.enum(criterionTypes),
    weight: z.coerce
      .number({ error: 'Enter a numeric weight.' })
      .positive({ error: 'Weight must be greater than zero.' }),
    minAge: nonNegativeInteger.optional(),
    maxAge: nonNegativeInteger.optional(),
    gender: z.enum(criterionGenders).optional(),
    minSalary: nonNegativeInteger.optional(),
    maxSalary: nonNegativeInteger.optional(),
  })
  .superRefine((criterion, context) => {
    switch (criterion.type) {
      case 'AGE':
        if (criterion.minAge === undefined) {
          context.addIssue({
            code: 'custom',
            path: ['minAge'],
            message: 'Minimum age is required.',
          });
        }
        if (criterion.maxAge === undefined) {
          context.addIssue({
            code: 'custom',
            path: ['maxAge'],
            message: 'Maximum age is required.',
          });
        }
        if (
          criterion.minAge !== undefined &&
          criterion.maxAge !== undefined &&
          criterion.minAge > criterion.maxAge
        ) {
          context.addIssue({
            code: 'custom',
            path: ['maxAge'],
            message: 'Maximum age must be at least the minimum age.',
          });
        }
        return;
      case 'GENDER':
        if (criterion.gender === undefined) {
          context.addIssue({
            code: 'custom',
            path: ['gender'],
            message: 'Choose a gender condition.',
          });
        }
        return;
      case 'SALARY_RANGE':
        if (criterion.minSalary === undefined) {
          context.addIssue({
            code: 'custom',
            path: ['minSalary'],
            message: 'Minimum salary is required.',
          });
        }
        if (criterion.maxSalary === undefined) {
          context.addIssue({
            code: 'custom',
            path: ['maxSalary'],
            message: 'Maximum salary is required.',
          });
        }
        if (
          criterion.minSalary !== undefined &&
          criterion.maxSalary !== undefined &&
          criterion.minSalary > criterion.maxSalary
        ) {
          context.addIssue({
            code: 'custom',
            path: ['maxSalary'],
            message: 'Maximum salary must be at least the minimum salary.',
          });
        }
        return;
    }
  });

export const vacancyFormSchema = z.object({
  name: z.string().trim().min(1, { error: 'Vacancy name is required.' }),
  description: z.string().trim().min(1, { error: 'A vacancy description is required.' }),
  criteria: z.array(criterionFormSchema).min(1, { error: 'Add at least one ranking criterion.' }),
});

export type VacancyFormInput = z.input<typeof vacancyFormSchema>;
export type VacancyFormValues = z.output<typeof vacancyFormSchema>;
