export type WeeklyReportMetrics = {
  weekStart: string;
  weekEnd: string;
  quotedServicesCount: number;
  scheduledServicesCount: number;
  completedServicesCount: number;
  newClientsCount: number;
  totalRevenueReceived: number;
  currency: string;
};

export type WeeklyReportResponse = WeeklyReportMetrics & {
  recipients: string[];
  sentAt: string | null;
  emailSubject: string;
};
