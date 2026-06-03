import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly baseUrl = process.env.EVOLUTION_API_URL;
  private readonly apiKey = process.env.EVOLUTION_API_KEY;
  private readonly instance = process.env.EVOLUTION_INSTANCE;

  private formatPhone(phone: string): string {
    // Remove tudo excepto dígitos e garante código de país
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('351') || digits.startsWith('55')) return digits;
    return `351${digits}`; // Portugal por defeito
  }

  async sendMessage(phone: string, message: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        {
          number: this.formatPhone(phone),
          text: message,
        },
        {
          headers: {
            apikey: this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Mensagem enviada para ${phone}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem para ${phone}`, error.message);
      return false;
    }
  }

  async sendAppointmentConfirmation(
    phone: string,
    clientName: string,
    vehicleBrand: string,
    vehicleModel: string,
    scheduledAt: Date,
  ): Promise<boolean> {
    const date = scheduledAt.toLocaleDateString('pt-PT');
    const time = scheduledAt.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const message =
      `Olá ${clientName}! ✅\n\n` +
      `O seu agendamento foi confirmado.\n\n` +
      `🚗 Veículo: ${vehicleBrand} ${vehicleModel}\n` +
      `📅 Data: ${date}\n` +
      `🕐 Hora: ${time}\n\n` +
      `BGG Garage — Estética Automóvel`;

    return this.sendMessage(phone, message);
  }

  async sendAppointmentReminder(
    phone: string,
    clientName: string,
    scheduledAt: Date,
  ): Promise<boolean> {
    const time = scheduledAt.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const message =
      `Olá ${clientName}! 👋\n\n` +
      `Lembrete: tem um agendamento hoje às ${time}.\n\n` +
      `BGG Garage — Estética Automóvel`;

    return this.sendMessage(phone, message);
  }

  async sendServiceCompleted(
    phone: string,
    clientName: string,
    vehicleBrand: string,
    vehicleModel: string,
  ): Promise<boolean> {
    const message =
      `Olá ${clientName}! 🎉\n\n` +
      `O seu ${vehicleBrand} ${vehicleModel} está pronto!\n\n` +
      `Pode vir buscar o seu veículo.\n\n` +
      `BGG Garage — Estética Automóvel`;

    return this.sendMessage(phone, message);
  }
}