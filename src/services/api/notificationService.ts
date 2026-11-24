import { api } from './api'
import { readAuthSession } from '../sessionStorage'
import { isArrayOf, readMockState, writeMockState } from '../mocks/storage'
import type {
  NotificationCreateRequest,
  NotificationResponse,
  NotificationType,
} from '../../types/domain'
import type { NotificationService } from '../notificationService'

const LOCAL_NOTIFICATIONS_KEY = 'oportuniza.api.local-notifications.v1'

function isNotificationType(value: unknown): value is NotificationType {
  return value === 'NEW_OPPORTUNITY'
    || value === 'SELECTION_PROCESS_UPDATE'
    || value === 'PITCH_INTEREST'
    || value === 'PROPOSAL_INVITE'
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
    && (!('projectProposalId' in value)
      || (typeof value.projectProposalId === 'number' && Number.isSafeInteger(value.projectProposalId)))
}

function readLocalNotifications() {
  const storedNotifications = readMockState(
    LOCAL_NOTIFICATIONS_KEY,
    [] as NotificationResponse[],
    (value): value is NotificationResponse[] => isArrayOf(value, isNotification),
  )
  const deduplicatedNotifications = deduplicateProposalInvites(storedNotifications)
  if (deduplicatedNotifications.length !== storedNotifications.length) {
    writeMockState(LOCAL_NOTIFICATIONS_KEY, deduplicatedNotifications)
  }
  return deduplicatedNotifications
}

function deduplicateProposalInvites(items: NotificationResponse[]) {
  const result: NotificationResponse[] = []
  const inviteIndexByKey = new Map<string, number>()

  for (const notification of items) {
    if (notification.type !== 'PROPOSAL_INVITE' || notification.projectProposalId === undefined) {
      result.push(notification)
      continue
    }

    const key = `${notification.recipientId}:${notification.projectProposalId}`
    const existingIndex = inviteIndexByKey.get(key)
    if (existingIndex === undefined) {
      inviteIndexByKey.set(key, result.length)
      result.push(notification)
    } else if (notification.isRead === false && result[existingIndex].isRead) {
      result[existingIndex] = notification
    }
  }

  return result
}

function getNextLocalNotificationId(notifications: NotificationResponse[]) {
  return Math.min(0, ...notifications.map((notification) => notification.id)) - 1
}

export const notificationService: NotificationService = {
  async list(signal?: AbortSignal): Promise<NotificationResponse[]> {
    const { data } = await api.get<NotificationResponse[]>('/notifications', { signal })
    const recipientId = readAuthSession()?.user.profile.id
    const localNotifications = readLocalNotifications()
      .filter((notification) => notification.recipientId === recipientId)
      .sort((first, second) => (
        second.sentAt.localeCompare(first.sentAt) || second.id - first.id
      ))
    return deduplicateProposalInvites([
      ...localNotifications,
      ...data.filter((notification) => notification.recipientId === recipientId),
    ])
  },

  async create(input: NotificationCreateRequest, _signal?: AbortSignal): Promise<NotificationResponse> {
    const session = readAuthSession()
    if (!session) throw new Error('Entre para consultar suas notificações.')
    if (!input.title.trim() || !input.message.trim()) {
      throw new Error('Informe o título e a mensagem da notificação.')
    }

    const recipientId = input.recipientId ?? session.user.profile.id
    const localNotifications = readLocalNotifications()
    if (input.type === 'PROPOSAL_INVITE' && input.projectProposalId !== undefined) {
      const existingLocal = localNotifications.find((notification) => (
        notification.type === 'PROPOSAL_INVITE'
        && notification.recipientId === recipientId
        && notification.projectProposalId === input.projectProposalId
      ))
      if (existingLocal) {
        if (existingLocal.isRead) {
          const reopened = {
            ...existingLocal,
            title: input.title.trim(),
            message: input.message.trim(),
            isRead: false,
            sentAt: new Date().toISOString(),
          }
          writeMockState(
            LOCAL_NOTIFICATIONS_KEY,
            localNotifications.map((item) => item.id === existingLocal.id ? reopened : item),
          )
          return structuredClone(reopened)
        }
        return structuredClone(existingLocal)
      }
    }

    const notification: NotificationResponse = {
      id: getNextLocalNotificationId(localNotifications),
      recipientId,
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type,
      isRead: false,
      sentAt: new Date().toISOString(),
      projectProposalId: input.projectProposalId,
    }
    writeMockState(LOCAL_NOTIFICATIONS_KEY, [...localNotifications, notification])
    return structuredClone(notification)
  },

  async markAsRead(notificationId: number, signal?: AbortSignal): Promise<NotificationResponse | null> {
    if (notificationId < 0) {
      const recipientId = readAuthSession()?.user.profile.id
      const localNotifications = readLocalNotifications()
      const notification = localNotifications.find((item) => (
        item.id === notificationId && item.recipientId === recipientId
      ))
      if (!notification) return null

      const updatedNotification = { ...notification, isRead: true }
      writeMockState(
        LOCAL_NOTIFICATIONS_KEY,
        localNotifications.map((item) => (
          item.id === notificationId ? updatedNotification : item
        )),
      )
      return structuredClone(updatedNotification)
    }

    const { data } = await api.patch<NotificationResponse>(
      `/notifications/${notificationId}/read`,
      undefined,
      { signal },
    )
    return data
  },

  async markAllAsRead(signal?: AbortSignal): Promise<NotificationResponse[]> {
    const recipientId = readAuthSession()?.user.profile.id
    const [{ data }, localNotifications] = await Promise.all([
      api.get<NotificationResponse[]>('/notifications', { signal }),
      Promise.resolve(readLocalNotifications()),
    ])
    const updatedNotifications = await Promise.all(
      [
        ...localNotifications.filter((notification) => notification.recipientId === recipientId),
        ...data.filter((notification) => notification.recipientId === recipientId),
      ]
        .filter((notification) => !notification.isRead)
        .map((notification) => this.markAsRead(notification.id, signal)),
    )
    return updatedNotifications.filter(
      (notification): notification is NotificationResponse => notification !== null,
    )
  },

  async markProposalInviteAsRead(proposalId: number, signal?: AbortSignal) {
    const recipientId = readAuthSession()?.user.profile.id
    const [{ data }, localNotifications] = await Promise.all([
      api.get<NotificationResponse[]>('/notifications', { signal }),
      Promise.resolve(readLocalNotifications()),
    ])
    const updatedNotifications = await Promise.all(
      [
        ...localNotifications.filter((notification) => notification.recipientId === recipientId),
        ...data.filter((notification) => notification.recipientId === recipientId),
      ]
        .filter((notification) => (
          notification.recipientId === recipientId
          && notification.type === 'PROPOSAL_INVITE'
          && notification.projectProposalId === proposalId
          && !notification.isRead
        ))
        .map((notification) => this.markAsRead(notification.id, signal)),
    )
    return updatedNotifications.filter(
      (notification): notification is NotificationResponse => notification !== null,
    )
  },
}
