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
import { mockProjectProposalService } from './mockProjectProposalService'
import { mockUserService } from './mockUserService'

const STORAGE_KEY = 'oportuniza.mock.notifications.v2'

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

let notifications = readMockState(
  STORAGE_KEY,
  initialMockNotifications,
  (value): value is NotificationResponse[] => isArrayOf(value, isNotification),
)

if (localStorage.getItem(STORAGE_KEY) === null) {
  writeMockState(STORAGE_KEY, notifications)
}

function refreshNotifications() {
  const storedNotifications = readMockState(
    STORAGE_KEY,
    notifications,
    (value): value is NotificationResponse[] => isArrayOf(value, isNotification),
  )
  notifications = deduplicateProposalInvites(storedNotifications)
  if (notifications.length !== storedNotifications.length) {
    writeMockState(STORAGE_KEY, notifications)
  }
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

function getRecipientId() {
  const session = readAuthSession()
  if (!session) throw new Error('Entre para consultar suas notificações.')
  return session.user.profile.id
}

async function syncPendingProposalInvites(recipientId: number) {
  const deduplicatedNotifications = deduplicateProposalInvites(notifications)
  let hasUpdates = deduplicatedNotifications.length !== notifications.length
  if (hasUpdates) notifications = deduplicatedNotifications

  const proposals = await mockProjectProposalService.list()

  for (const proposal of proposals) {
    const pendingInvite = proposal.invites.find((invite) => (
      invite.userId === String(recipientId) && invite.status === 'pending'
    ))
    if (!pendingInvite || notifications.some((notification) => (
      notification.recipientId === recipientId
      && notification.type === 'PROPOSAL_INVITE'
      && notification.projectProposalId === proposal.id
    ))) {
      continue
    }

    const author = await mockUserService.getProfileById(proposal.studentId)
    refreshNotifications()
    if (notifications.some((notification) => (
      notification.recipientId === recipientId
      && notification.type === 'PROPOSAL_INVITE'
      && notification.projectProposalId === proposal.id
    ))) {
      continue
    }

    notifications = [...notifications, {
      id: Math.max(0, ...notifications.map((item) => item.id)) + 1,
      recipientId,
      title: 'Convite para proposta',
      message: `${author.profile.name} convidou você para a proposta '${proposal.title}'`,
      type: 'PROPOSAL_INVITE',
      isRead: false,
      sentAt: new Date().toISOString(),
      projectProposalId: proposal.id,
    }]
    hasUpdates = true
  }

  const normalizedNotifications = deduplicateProposalInvites(notifications)
  if (normalizedNotifications.length !== notifications.length) {
    notifications = normalizedNotifications
    hasUpdates = true
  }

  if (hasUpdates) writeMockState(STORAGE_KEY, notifications)
}

export const mockNotificationService: NotificationService = {
  async list() {
    await simulateNetworkDelay()
    refreshNotifications()
    const recipientId = getRecipientId()
    await syncPendingProposalInvites(recipientId)
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
    refreshNotifications()
    const recipientId = input.recipientId ?? getRecipientId()
    if (!input.title.trim() || !input.message.trim()) {
      throw new Error('Informe o título e a mensagem da notificação.')
    }

    if (input.type === 'PROPOSAL_INVITE' && input.projectProposalId !== undefined) {
      const existing = notifications.find((item) => (
        item.type === 'PROPOSAL_INVITE'
        && item.recipientId === recipientId
        && item.projectProposalId === input.projectProposalId
      ))
      if (existing) {
        if (existing.isRead) {
          const reopened = {
            ...existing,
            title: input.title.trim(),
            message: input.message.trim(),
            isRead: false,
            sentAt: new Date().toISOString(),
          }
          notifications = notifications.map((item) => item.id === existing.id ? reopened : item)
          writeMockState(STORAGE_KEY, notifications)
          return structuredClone(reopened)
        }
        return structuredClone(existing)
      }
    }

    const notification: NotificationResponse = {
      id: Math.max(0, ...notifications.map((item) => item.id)) + 1,
      recipientId,
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type,
      isRead: false,
      sentAt: new Date().toISOString(),
      projectProposalId: input.projectProposalId,
    }
    notifications = [...notifications, notification]
    writeMockState(STORAGE_KEY, notifications)
    return structuredClone(notification)
  },

  async markAsRead(notificationId) {
    await simulateNetworkDelay()
    refreshNotifications()
    const recipientId = getRecipientId()
    const notification = notifications.find(
      (item) => item.id === notificationId && item.recipientId === recipientId,
    )
    if (!notification) return null

    const updatedNotification = { ...notification, isRead: true }
    notifications = notifications.map((item) => (
      item.id === notificationId ? updatedNotification : item
    ))
    writeMockState(STORAGE_KEY, notifications)
    return structuredClone(updatedNotification)
  },

  async markAllAsRead() {
    await simulateNetworkDelay()
    refreshNotifications()
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

  async markProposalInviteAsRead(proposalId) {
    await simulateNetworkDelay()
    refreshNotifications()
    const recipientId = getRecipientId()
    const updatedNotifications = notifications.map((notification) => (
      notification.recipientId === recipientId
        && notification.type === 'PROPOSAL_INVITE'
        && notification.projectProposalId === proposalId
        ? { ...notification, isRead: true }
        : notification
    ))
    const updated = updatedNotifications.filter((notification) => (
      notification.recipientId === recipientId
      && notification.type === 'PROPOSAL_INVITE'
      && notification.projectProposalId === proposalId
    ))
    if (updated.length > 0) {
      notifications = updatedNotifications
      writeMockState(STORAGE_KEY, notifications)
    }
    return structuredClone(updated)
  },
}
