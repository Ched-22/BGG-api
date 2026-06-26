import { WeeklyReportMetrics } from './weekly-reports.types';
import { formatEur, formatGeneratedAt, formatWeekLabel } from './weekly-report-dates';

export function buildEmailSubject(weekStart: string, weekEnd: string): string {
  return `BGG — Relatório semanal (${formatWeekLabel(weekStart, weekEnd)})`;
}

export function buildEmailBodies(
  metrics: WeeklyReportMetrics,
  adminAppUrl: string,
): { text: string; html: string } {
  const period = formatWeekLabel(metrics.weekStart, metrics.weekEnd);
  const generatedAt = formatGeneratedAt();
  const adminUrl = adminAppUrl || 'https://admin.bgggarage.com';

  const lines = [
    `Relatório semanal BGG (${period})`,
    '',
    `Serviços orçados: ${metrics.quotedServicesCount}`,
    `Serviços agendados: ${metrics.scheduledServicesCount}`,
    `Serviços finalizados: ${metrics.completedServicesCount}`,
    `Clientes novos: ${metrics.newClientsCount}`,
    `Valor total recebido: ${formatEur(metrics.totalRevenueReceived)}`,
    '',
    `Admin: ${adminUrl}`,
    `Gerado em ${generatedAt}`,
    'Black Gold Garage',
  ];

  const text = lines.join('\n');

  const html = `
<!DOCTYPE html>
<html lang="pt">
  <body style="font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.5; margin: 0; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto;">
      <div style="background: #8b7348; color: #fff; padding: 16px 20px; border-radius: 4px 4px 0 0;">
        <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9;">Black Gold Garage</div>
        <h1 style="margin: 8px 0 0; font-size: 22px;">Relatório semanal</h1>
        <div style="margin-top: 4px; font-size: 14px;">${period}</div>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 4px 4px;">
        <table style="width: 100%; border-collapse: collapse;">
          ${metricRow('Serviços orçados', String(metrics.quotedServicesCount))}
          ${metricRow('Serviços agendados', String(metrics.scheduledServicesCount))}
          ${metricRow('Serviços finalizados', String(metrics.completedServicesCount))}
          ${metricRow('Clientes novos', String(metrics.newClientsCount))}
          ${metricRow('Valor total recebido', formatEur(metrics.totalRevenueReceived), true)}
        </table>
        <p style="margin: 20px 0 0; font-size: 13px; color: #6b7280;">
          <a href="${adminUrl}" style="color: #8b7348;">Abrir painel admin</a><br />
          Gerado em ${generatedAt}
        </p>
      </div>
    </div>
  </body>
</html>`.trim();

  return { text, html };
}

function metricRow(label: string, value: string, highlight = false): string {
  const color = highlight ? '#8b7348' : '#1a1a1a';
  const weight = highlight ? '600' : '400';
  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">${label}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: ${color}; font-weight: ${weight};">${value}</td>
    </tr>`;
}
