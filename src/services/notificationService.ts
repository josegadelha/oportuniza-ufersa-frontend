import { notificationService as apiNotificationService } from './api/notificationService'
import { mockNotificationService } from './mocks/mockNotificationService'
import type { NotificationCreateRequest, NotificationResponse } from '../types/domain'

export interface NotificationService {
  list(): Promise<NotificationResponse[]>
  create(input: NotificationCreateRequest): Promise<NotificationResponse>
  markAsRead(notificationId: number): Promise<NotificationResponse>
  markAllAsRead(): Promise<NotificationResponse[]>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const notificationService: NotificationService = USE_MOCKS
  ? mockNotificationService
  : apiNotificationService

export const NOTIFICATION_CREATED_EVENT = 'oportuniza:notification-created'
