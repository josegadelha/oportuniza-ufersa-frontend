import { api } from './api'
import { readAuthSession } from '../sessionStorage'
import type { NotificationCreateRequest, NotificationResponse } from '../../types/domain'
import type { NotificationService } from '../notificationService'

// The backend currently exposes notification reads and updates, but no create endpoint.
let nextLocalNotificationId = -1
let localActionNotifications: NotificationResponse[] = []

export const notificationService: NotificationService = {
  async list(): Promise<NotificationResponse[]> {
    const { data } = await api.get<NotificationResponse[]>('/notifications')
    const recipientId = readAuthSession()?.user.profile.id
    const localNotifications = localActionNotifications
      .filter((notification) => notification.recipientId === recipientId)
      .reverse()
    return [...localNotifications, ...data]
  },

  async create(input: NotificationCreateRequest): Promise<NotificationResponse> {
    const session = readAuthSession()
    if (!session) throw new Error('Entre para consultar suas notificações.')
    if (!input.title.trim() || !input.message.trim()) {
      throw new Error('Informe o título e a mensagem da notificação.')
    }

    const notification: NotificationResponse = {
      id: nextLocalNotificationId,
      recipientId: input.recipientId ?? session.user.profile.id,
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type,
      isRead: false,
      sentAt: new Date().toISOString().slice(0, 10),
    }
    nextLocalNotificationId -= 1
    localActionNotifications = [...localActionNotifications, notification]
    return structuredClone(notification)
  },

  async markAsRead(notificationId: number): Promise<NotificationResponse> {
    if (notificationId < 0) {
      const notification = localActionNotifications.find((item) => item.id === notificationId)
      if (!notification) throw new Error('Notificação não encontrada.')
      const updatedNotification = { ...notification, isRead: true }
      localActionNotifications = localActionNotifications.map((item) => (
        item.id === notificationId ? updatedNotification : item
      ))
      return structuredClone(updatedNotification)
    }

    const { data } = await api.patch<NotificationResponse>(
      `/notifications/${notificationId}/read`,
    )
    return data
  },

  async markAllAsRead(): Promise<NotificationResponse[]> {
    const notifications = await this.list()
    return Promise.all(
      notifications
        .filter((notification) => !notification.isRead)
        .map((notification) => this.markAsRead(notification.id)),
    )
  },
}
