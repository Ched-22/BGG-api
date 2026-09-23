import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

function warnOnMisconfiguredPasswordResetEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const logger = new Logger('Bootstrap');
  const isLocalUrl = (url?: string) => !url || /localhost|127\.0\.0\.1/.test(url);

  if (isLocalUrl(process.env.ADMIN_APP_URL)) {
    logger.warn(
      'ADMIN_APP_URL não está definido para um domínio de produção — os links de "esqueci minha senha" do Admin ficarão inacessíveis.',
    );
  }
  if (isLocalUrl(process.env.MOBILE_APP_URL)) {
    logger.warn(
      'MOBILE_APP_URL não está definido para um domínio de produção — os links de "esqueci minha senha" do Mobile ficarão inacessíveis.',
    );
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  if (smtpHost && /ethereal\.email/i.test(smtpHost) && !hasResend) {
    logger.warn(
      'SMTP_HOST aponta para o relay de teste do Ethereal — nenhum e-mail (incluindo reset de senha) será entregue de verdade. Configure SMTP_HOST/SMTP_USER/SMTP_PASS de produção ou RESEND_API_KEY.',
    );
  }
}

async function bootstrap() {
  warnOnMisconfiguredPasswordResetEnv();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  const envOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'https://bgggarage.com',
      ...(process.env.ADMIN_APP_URL ? [process.env.ADMIN_APP_URL] : []),
      ...(process.env.MOBILE_APP_URL ? [process.env.MOBILE_APP_URL] : []),
      ...envOrigins,
    ],
    credentials: true,
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API a correr na porta ${port} (prefixo /api)`);
}
bootstrap();