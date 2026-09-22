import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { RequestContextService } from './request-context.service';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const requestId = request.id;

    reply.header('x-request-id', requestId);

    return new Observable((subscriber) =>
      this.requestContext.run(requestId, () => next.handle().subscribe(subscriber)),
    );
  }
}
