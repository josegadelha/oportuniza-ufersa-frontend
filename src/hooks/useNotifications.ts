import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { getServiceErrorMessage } from '../services/errorMessage'
import {
  NOTIFICATION_CREATED_EVENT,
  NOTIFICATION_UPDATED_EVENT,
  notificationService,
} from '../services/notificationService'
import type { NotificationResponse } from '../types/domain'

function isAbortError(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError'))
}

type NotificationUpdatedEvent = NotificationResponse | {
  proposalId: number
  recipientId: number
  isRead: true
}

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
      if (!isAbortError(loadError)) {
        setError(getServiceErrorMessage(loadError, 'Não foi possível carregar as notificações.'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const handleNotificationCreated = (event: Event) => {
      const notification = (event as CustomEvent<NotificationResponse>).detail
      setError(null)
      setNotifications((current) => [
        notification,
        ...current.filter((item) => item.id !== notification.id),
      ])
    }
    const handleNotificationUpdated = (event: Event) => {
      const notification = (event as CustomEvent<NotificationUpdatedEvent>).detail
      setError(null)
      setNotifications((current) => current.map((item) => {
        if ('id' in notification) {
          return item.id === notification.id ? notification : item
        }
        return item.recipientId === notification.recipientId
          && item.type === 'PROPOSAL_INVITE'
          && item.projectProposalId === notification.proposalId
          ? { ...item, isRead: true }
          : item
      }))
    }

    window.addEventListener(NOTIFICATION_CREATED_EVENT, handleNotificationCreated)
    window.addEventListener(NOTIFICATION_UPDATED_EVENT, handleNotificationUpdated)
    notificationService.list(controller.signal)
      .then((items) => {
        setNotifications(items)
      })
      .catch((loadError: unknown) => {
        if (!isAbortError(loadError)) {
          setError(getServiceErrorMessage(loadError, 'Não foi possível carregar as notificações.'))
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
    return () => {
      controller.abort()
      window.removeEventListener(NOTIFICATION_CREATED_EVENT, handleNotificationCreated)
      window.removeEventListener(NOTIFICATION_UPDATED_EVENT, handleNotificationUpdated)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: number) => {
    setError(null)
    try {
      const updatedNotification = await notificationService.markAsRead(notificationId)
      if (!updatedNotification) {
        await reload()
        return true
      }
      setNotifications((current) => current.map((notification) => (
        notification.id === updatedNotification.id ? updatedNotification : notification
      )))
      setError(null)
      return true
    } catch (markError) {
      if (!isAbortError(markError)) {
        setError(getServiceErrorMessage(markError, 'Não foi possível atualizar a notificação.'))
      }
      return false
    }
  }, [reload])

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
      setError(null)
      return true
    } catch (markError: unknown) {
      if (!isAbortError(markError)) {
        setError(getServiceErrorMessage(markError, 'Não foi possível atualizar as notificações.'))
      }
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
