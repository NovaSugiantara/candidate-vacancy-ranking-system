import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { ApiFieldError } from '../types/api-error.type';

function flattenValidationErrors(
  errors: readonly ValidationError[],
  parentPath = '',
): ApiFieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownErrors = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    const childErrors = flattenValidationErrors(error.children ?? [], field);

    return [...ownErrors, ...childErrors];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    stopAtFirstError: false,
    exceptionFactory: (validationErrors: ValidationError[]) =>
      new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: flattenValidationErrors(validationErrors),
      }),
  });
}
