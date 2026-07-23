import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST?.trim();
    if (!host) return null;

    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    return this.transporter;
  }

  private canStubSend(): boolean {
    return Boolean(process.env.WEEKLY_REPORT_EMAIL_OVERRIDE?.trim());
  }

  private getResendApiKey(): string | null {
    return process.env.RESEND_API_KEY?.trim() || null;
  }

  private async sendViaResend(from: string, input: SendMailInput): Promise<void> {
    const apiKey = this.getResendApiKey();
    if (!apiKey) return;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ServiceUnavailableException(
        `Falha ao enviar e-mail via Resend (${response.status}): ${body}`,
      );
    }
  }

  async sendMail(input: SendMailInput): Promise<void> {
    const from = process.env.MAIL_FROM?.trim() || 'Black Green Garage <noreply@bgggarage.com>';
    const transporter = this.getTransporter();

    if (transporter) {
      const info = await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        this.logger.log(`Preview do e-mail: ${previewUrl}`);
      }
      return;
    }

    if (this.getResendApiKey()) {
      await this.sendViaResend(from, input);
      this.logger.log(`E-mail enviado via Resend para ${input.to}`);
      return;
    }

    if (this.canStubSend()) {
      this.logger.log(
        `[mail stub] To: ${input.to} | Subject: ${input.subject}\n${input.text}`,
      );
      return;
    }

    throw new ServiceUnavailableException('Serviço de e-mail não configurado (SMTP_HOST ou RESEND_API_KEY).');
  }
}
