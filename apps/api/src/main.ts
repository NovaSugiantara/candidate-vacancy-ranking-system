import 'reflect-metadata';
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logging/app-logger.service';
import { createValidationPipe } from './common/pipes/validation-pipe.factory';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function isSaneRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value);
}

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT ?? 3000);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      genReqId: (request: IncomingMessage) => {
        const incomingRequestId = request.headers['x-request-id'];
        return isSaneRequestId(incomingRequestId)
          ? incomingRequestId
          : randomUUID();
      },
    }),
  );
  const webOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: webOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(createValidationPipe());

  await app.listen(port, '0.0.0.0');
  app.get(AppLoggerService).info(`api.started port=${port}`);
}

void bootstrap();
