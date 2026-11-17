import type { DeliverableService } from '../deliverableService'
import type { DeliverableCreateRequest, DeliverablePatchRequest, DeliverableResponse } from '../../types/domain'
import { readAuthSession } from '../sessionStorage'
import { initialMockProjects } from './projects'
import { simulateNetworkDelay } from './delay'
import { isArrayOf, readMockState, writeMockState } from './storage'
import { initialMockDeliverables } from './deliverables'

const STORAGE_KEY = 'oportuniza.mock.deliverables.v2'

function isDeliverable(value: unknown): value is DeliverableResponse {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value && typeof value.id === 'number'
    && 'projectId' in value && typeof value.projectId === 'number'
    && 'title' in value && typeof value.title === 'string'
    && 'deadline' in value && typeof value.deadline === 'string'
}

let deliverables = readMockState(STORAGE_KEY, initialMockDeliverables, (value): value is DeliverableResponse[] => (
  isArrayOf(value, isDeliverable)
))

function save() {
  writeMockState(STORAGE_KEY, deliverables)
}

function getSession() {
  const session = readAuthSession()
  if (!session) throw new Error('Entre na plataforma para consultar os entregáveis.')
  return session
}

function getVisibleProjectIds() {
  const { user } = getSession()
  return initialMockProjects
    .filter((project) => user.role === 'STUDENT'
      ? project.memberIds.includes(user.profile.id)
      : project.advisorIds.includes(user.profile.id))
    .map((project) => project.id)
}

export const mockDeliverableService: DeliverableService = {
  async list() {
    await simulateNetworkDelay()
    const projectIds = getVisibleProjectIds()
    return structuredClone(deliverables.filter((item) => projectIds.includes(item.projectId)))
  },

  async listByProject(projectId) {
    await simulateNetworkDelay()
    const projectIds = getVisibleProjectIds()
    if (!projectIds.includes(projectId)) throw new Error('Você não participa deste projeto.')
    return structuredClone(deliverables.filter((item) => item.projectId === projectId))
  },

  async createForProject(projectId, input: DeliverableCreateRequest) {
    await simulateNetworkDelay()
    const session = getSession()
    const project = initialMockProjects.find((item) => item.id === projectId)
    if (
      session.user.role !== 'PROFESSOR'
      || !project?.advisorIds.includes(session.user.profile.id)
    ) {
      throw new Error('Somente o docente orientador pode criar entregáveis.')
    }
    if (!input.title.trim() || !input.deadline || input.deadline < new Date().toISOString().slice(0, 10)) {
      throw new Error('Informe um título e um prazo válido para o entregável.')
    }
    if (deliverables.some((item) => item.projectId === projectId && item.title === input.title.trim())) {
      throw new Error('Já existe um entregável com esse título neste projeto.')
    }

    const created: DeliverableResponse = {
      id: Math.max(0, ...deliverables.map((item) => item.id)) + 1,
      projectId,
      title: input.title.trim(),
      deadline: input.deadline,
    }
    deliverables = [...deliverables, created]
    save()
    return structuredClone(created)
  },

  async patch(deliverableId, input: DeliverablePatchRequest) {
    await simulateNetworkDelay()
    const session = getSession()
    const current = deliverables.find((item) => item.id === deliverableId)
    const project = current
      ? initialMockProjects.find((item) => item.id === current.projectId)
      : undefined
    if (
      !current
      || session.user.role !== 'PROFESSOR'
      || !project?.advisorIds.includes(session.user.profile.id)
    ) {
      throw new Error('Você não pode atualizar este entregável.')
    }

    const updated = {
      ...current,
      title: input.title?.trim() || current.title,
      deadline: input.deadline ?? current.deadline,
    }
    deliverables = deliverables.map((item) => item.id === deliverableId ? updated : item)
    save()
    return structuredClone(updated)
  },
}
