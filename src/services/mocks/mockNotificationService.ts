import type {
  NotificationCreateRequest,
  NotificationResponse,
  NotificationType,
} from '../../types/domain'
import type { NotificationService } from '../notificationService'
import { readAuthSession } from '../sessionStorage'
import { isArrayOf, readMockState, writeMockState } from './storage'
import { simulateNetworkDelay } from './delay'
import { initialMockNotifications } from './notifications'

const STORAGE_KEY = 'oportuniza.mock.notifications.v2'

function isNotificationType(value: unknown): value is NotificationType {
  return value === 'NEW_OPPORTUNITY'
    || value === 'SELECTION_PROCESS_UPDATE'
    || value === 'PITCH_INTEREST'
}

function isNotification(value: unknown): value is NotificationResponse {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value
    && typeof value.id === 'number'
    && 'recipientId' in value
    && typeof value.recipientId === 'number'
    && 'title' in value
    && typeof value.title === 'string'
    && 'message' in value
    && typeof value.message === 'string'
    && 'type' in value
    && isNotificationType(value.type)
    && 'isRead' in value
    && typeof value.isRead === 'boolean'
    && 'sentAt' in value
    && typeof value.sentAt === 'string'
}

let notifications = readMockState(
  STORAGE_KEY,
  initialMockNotifications,
  (value): value is NotificationResponse[] => isArrayOf(value, isNotification),
)

function getRecipientId() {
  const session = readAuthSession()
  if (!session) throw new Error('Entre para consultar suas notificações.')
  return session.user.profile.id
}

export const mockNotificationService: NotificationService = {
  async list() {
    await simulateNetworkDelay()
    const recipientId = getRecipientId()
    return structuredClone(
      notifications
        .filter((notification) => notification.recipientId === recipientId)
        .sort((first, second) => (
          second.sentAt.localeCompare(first.sentAt) || second.id - first.id
        )),
    )
  },

  async create(input: NotificationCreateRequest) {
    await simulateNetworkDelay()
    const recipientId = input.recipientId ?? getRecipientId()
    if (!input.title.trim() || !input.message.trim()) {
      throw new Error('Informe o título e a mensagem da notificação.')
    }

    const notification: NotificationResponse = {
      id: Math.max(0, ...notifications.map((item) => item.id)) + 1,
      recipientId,
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type,
      isRead: false,
      sentAt: new Date().toISOString().slice(0, 10),
    }
    notifications = [...notifications, notification]
    writeMockState(STORAGE_KEY, notifications)
    return structuredClone(notification)
  },

  async markAsRead(notificationId) {
    await simulateNetworkDelay()
    const recipientId = getRecipientId()
    const notification = notifications.find(
      (item) => item.id === notificationId && item.recipientId === recipientId,
    )
    if (!notification) throw new Error('Notificação não encontrada.')

    const updatedNotification = { ...notification, isRead: true }
    notifications = notifications.map((item) => (
      item.id === notificationId ? updatedNotification : item
    ))
    writeMockState(STORAGE_KEY, notifications)
    return structuredClone(updatedNotification)
  },

  async markAllAsRead() {
    await simulateNetworkDelay()
    const recipientId = getRecipientId()
    notifications = notifications.map((notification) => (
      notification.recipientId === recipientId
        ? { ...notification, isRead: true }
        : notification
    ))
    writeMockState(STORAGE_KEY, notifications)
    return structuredClone(
      notifications
        .filter((notification) => notification.recipientId === recipientId)
        .sort((first, second) => (
          second.sentAt.localeCompare(first.sentAt) || second.id - first.id
        )),
    )
  },
}
