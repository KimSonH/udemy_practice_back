import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { TrimSearchPipe } from './common/trim-search.pipe';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new TrimSearchPipe(),
    new ValidationPipe({
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          field: error.property,
          message: error.constraints[Object.keys(error.constraints).join(', ')],
        }));
        return new BadRequestException(result);
      },
      stopAtFirstError: true,
    }),
  );

  app.enableCors({
    origin: corsOrigins(),
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept',
    credentials: true,
  });

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ResponseInterceptor(),
  );

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  const config = new DocumentBuilder()
    .setTitle('Udemy Practice API')
    .setDescription('API documentation for the Udemy Practice')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.use(cookieParser());
  app.disable('x-powered-by');

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();

/**
 * Sites allowed to call the API from a browser. The front and the admin upload
 * videos straight to /gumroad/upload, so their production domains must be
 * listed or the browser hides the response and the upload looks failed.
 * CORS_ORIGINS is a comma-separated list; exact origins, no trailing slash.
 */
function corsOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return fromEnv.length
    ? fromEnv
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://courses.udemygrowth.asia',
        'https://udemy-practice-front.vercel.app',
        'https://udemy-practice-admin.vercel.app',
      ];
}
