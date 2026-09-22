import {
  ArgumentsHost,
  Catch,
  HttpException,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppLoggerService } from '../logging/app-logger.service';
import type { ApiError, ApiFieldError } from '../types/api-error.type';

type ValidationResponse = {
  readonly statusCode: 400;
  readonly message: 'Validation failed';
  readonly errors: readonly ApiFieldError[];
};

function isApiFieldError(value: unknown): value is ApiFieldError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'field' in value &&
    typeof value.field === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

function isValidationResponse(value: unknown): value is ValidationResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    value.statusCode === 400 &&
    'message' in value &&
    value.message === 'Validation failed' &&
    'errors' in value &&
    Array.isArray(value.errors) &&
    value.errors.every(isApiFieldError)
  );
}

function isUniqueViolation(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    value.code === '23505'
  );
}

function httpExceptionMessage(response: string | object): string {
  if (typeof response === 'string') {
    return response;
  }

  if ('message' in response) {
    if (typeof response.message === 'string') {
      return response.message;
    }
    if (Array.isArray(response.message)) {
      return response.message.filter((item) => typeof item === 'string').join(', ');
    }
  }

  return 'Request failed';
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const response = this.toResponse(exception, request.url);

    reply.status(response.statusCode).send(response);
  }

  private toResponse(exception: unknown, path: string): ApiError {
    if (isUniqueViolation(exception)) {
      return this.envelope(
        409,
        'Email already exists',
        [{ field: 'email', message: 'Email already exists' }],
        path,
      );
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (isValidationResponse(response)) {
        return this.envelope(400, response.message, response.errors, path);
      }

      return this.envelope(
        exception.getStatus(),
        httpExceptionMessage(response),
        [],
        path,
      );
    }

    this.logger.error('api.request.failed', exception);
    return this.envelope(500, 'Internal server error', [], path);
  }

  private envelope(
    statusCode: number,
    message: string,
    errors: readonly ApiFieldError[],
    path: string,
  ): ApiError {
    return {
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path,
    };
  }
}
