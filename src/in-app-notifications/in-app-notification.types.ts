export const IN_APP_NOTIFICATION_TYPES = {
  QUOTE_PENDING_APPROVAL: 'QUOTE_PENDING_APPROVAL',
  QUOTE_APPROVED: 'QUOTE_APPROVED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_SCHEDULED: 'TASK_SCHEDULED',
  CHECKLIST_ENTRY_PENDING: 'CHECKLIST_ENTRY_PENDING',
  CHECKLIST_EXIT_PENDING: 'CHECKLIST_EXIT_PENDING',
  QA_PENDING_REVIEW: 'QA_PENDING_REVIEW',
  TASK_COMPLETED: 'TASK_COMPLETED',
} as const;

export type InAppNotificationType =
  (typeof IN_APP_NOTIFICATION_TYPES)[keyof typeof IN_APP_NOTIFICATION_TYPES];

export type InAppNotificationAction = {
  target: string;
  id: string;
  route?: string;
};

export type CreateInAppNotificationInput = {
  type: InAppNotificationType;
  title: string;
  body: string;
  severity?: string;
  meta?: Record<string, unknown>;
  action?: InAppNotificationAction | null;
};

export type InAppNotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: string;
  readAt: string | null;
  createdAt: string;
  action: InAppNotificationAction | null;
  derived?: boolean;
};
