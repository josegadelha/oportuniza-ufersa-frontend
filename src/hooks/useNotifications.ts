import { useCallback, useEffect, useState } from 'react'
import { getServiceErrorMessage } from '../services/errorMessage'
import {
  NOTIFICATION_CREATED_EVENT,
  notificationService,
} from '../services/notificationService'
import type { NotificationResponse } from '../types/domain'

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setNotifications(await notificationService.list())
    } catch (loadError) {
      setError(getServiceErrorMessage(loadError, 'Não foi possível carregar as notificações.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true
    const handleNotificationCreated = (event: Event) => {
      const notification = (event as CustomEvent<NotificationResponse>).detail
      setNotifications((current) => [
        notification,
        ...current.filter((item) => item.id !== notification.id),
      ])
    }

    window.addEventListener(NOTIFICATION_CREATED_EVENT, handleNotificationCreated)
    notificationService.list()
      .then((items) => {
        if (isCurrent) setNotifications(items)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(getServiceErrorMessage(loadError, 'Não foi possível carregar as notificações.'))
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
      window.removeEventListener(NOTIFICATION_CREATED_EVENT, handleNotificationCreated)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: number) => {
    setError(null)
    try {
      const updatedNotification = await notificationService.markAsRead(notificationId)
      setNotifications((current) => current.map((notification) => (
        notification.id === updatedNotification.id ? updatedNotification : notification
      )))
      return true
    } catch (markError) {
      setError(getServiceErrorMessage(markError, 'Não foi possível atualizar a notificação.'))
      return false
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    setError(null)
    try {
      const updatedNotifications = await notificationService.markAllAsRead()
      const updatedById = new Map(
        updatedNotifications.map((notification) => [notification.id, notification]),
      )
      setNotifications((current) => current.map((notification) => (
        updatedById.get(notification.id) ?? notification
      )))
      return true
    } catch (markError: unknown) {
      setError(getServiceErrorMessage(markError, 'Não foi possível atualizar as notificações.'))
      return false
    }
  }, [])

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.isRead).length,
    isLoading,
    error,
    reload,
    markAsRead,
    markAllAsRead,
  }
}
