import { useCallback } from 'react'
import { getServiceErrorMessage } from '../services/errorMessage'
import {
  NOTIFICATION_CREATED_EVENT,
  NOTIFICATION_UPDATED_EVENT,
  notificationService,
} from '../services/notificationService'
import { readAuthSession } from '../services/sessionStorage'
import type {
  NotificationCreateRequest,
  NotificationResponse,
} from '../types/domain'
import type { ServiceResult } from '../services/result'

export function useNotificationActions() {
  const createNotification = useCallback(async (
    input: NotificationCreateRequest,
  ): Promise<ServiceResult<NotificationResponse>> => {
    try {
      const notification = await notificationService.create(input)
      const currentUserId = readAuthSession()?.user.profile.id
      if (notification.recipientId === currentUserId) {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_CREATED_EVENT, { detail: notification }))
      }
      return { success: true, data: notification }
    } catch (createError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(
          createError,
          'Não foi possível atualizar suas notificações.',
        ),
      }
    }
  }, [])

  const markProposalInviteAsRead = useCallback(async (
    proposalId: number,
  ): Promise<ServiceResult<number>> => {
    try {
      const updatedNotifications = await notificationService.markProposalInviteAsRead(proposalId)
      const currentUserId = readAuthSession()?.user.profile.id
      updatedNotifications.forEach((notification) => {
        if (notification.recipientId === currentUserId) {
          window.dispatchEvent(new CustomEvent(
            NOTIFICATION_UPDATED_EVENT,
            { detail: notification },
          ))
        }
      })
      if (updatedNotifications.length === 0) {
        window.dispatchEvent(new CustomEvent(
          NOTIFICATION_UPDATED_EVENT,
          { detail: { proposalId, recipientId: currentUserId, isRead: true } },
        ))
      }
      return { success: true, data: updatedNotifications.length }
    } catch (readError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(
          readError,
          'Não foi possível atualizar a notificação do convite.',
        ),
      }
    }
  }, [])

  return { createNotification, markProposalInviteAsRead }
}
