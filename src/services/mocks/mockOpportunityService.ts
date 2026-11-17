import type {
  OpportunityCreateRequest,
  OpportunityPatchRequest,
  OpportunityResponse,
  OpportunityUpdateRequest,
} from '../../types/domain'
import type { OpportunityService } from '../opportunityService'
import { readAuthSession } from '../sessionStorage'
import { initialMockOpportunities } from './opportunities'
import { simulateNetworkDelay } from './delay'
import { isArrayOf, readMockState, writeMockState } from './storage'

const STORAGE_KEY = 'oportuniza.mock.opportunities.v2'

function isOpportunity(value: unknown): value is OpportunityResponse {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value
    && typeof value.id === 'number'
    && 'professorId' in value
    && typeof value.professorId === 'number'
    && 'title' in value
    && typeof value.title === 'string'
    && 'description' in value
    && typeof value.description === 'string'
    && 'type' in value
    && typeof value.type === 'string'
    && 'positions' in value
    && typeof value.positions === 'number'
    && 'workloadHours' in value
    && typeof value.workloadHours === 'number'
    && 'remuneration' in value
    && typeof value.remuneration === 'number'
    && 'status' in value
    && typeof value.status === 'string'
    && 'requirements' in value
    && Array.isArray(value.requirements)
}

let opportunities = readMockState(
  STORAGE_KEY,
  initialMockOpportunities,
  (value): value is OpportunityResponse[] => isArrayOf(value, isOpportunity),
)

function getProfessorId() {
  const session = readAuthSession()
  if (!session) throw new Error('Entre na plataforma para gerenciar oportunidades.')
  if (session.user.role !== 'PROFESSOR') {
    throw new Error('Apenas docentes podem criar oportunidades.')
  }
  return session.user.profile.id
}

function validateOpportunity(input: OpportunityCreateRequest | OpportunityUpdateRequest) {
  if (!input.title.trim() || !input.description.trim()) {
    throw new Error('O título e a descrição da oportunidade são obrigatórios.')
  }
  if (!Number.isInteger(input.positions) || input.positions < 1) {
    throw new Error('A oportunidade precisa ter pelo menos uma vaga.')
  }
  if (!Number.isInteger(input.workloadHours) || input.workloadHours < 0) {
    throw new Error('A carga horária não pode ser negativa.')
  }
  if (!Number.isFinite(input.remuneration) || input.remuneration < 0) {
    throw new Error('A remuneração não pode ser negativa.')
  }
}

function getOpportunity(opportunityId: number) {
  const opportunity = opportunities.find((item) => item.id === opportunityId)
  if (!opportunity) throw new Error('Oportunidade não encontrada.')
  return opportunity
}

function saveOpportunities() {
  writeMockState(STORAGE_KEY, opportunities)
}

export const mockOpportunityService: OpportunityService = {
  async list() {
    await simulateNetworkDelay()
    return structuredClone(opportunities)
  },

  async listByProfessor() {
    await simulateNetworkDelay()
    const professorId = getProfessorId()
    return structuredClone(opportunities.filter((item) => item.professorId === professorId))
  },

  async getById(opportunityId) {
    await simulateNetworkDelay()
    return structuredClone(getOpportunity(opportunityId))
  },

  async create(input) {
    await simulateNetworkDelay()
    const professorId = getProfessorId()
    validateOpportunity(input)

    const opportunity: OpportunityResponse = {
      id: Math.max(0, ...opportunities.map((item) => item.id)) + 1,
      professorId,
      title: input.title,
      description: input.description,
      type: input.type,
      positions: input.positions,
      workloadHours: input.workloadHours,
      remuneration: input.remuneration,
      status: input.status ?? 'DRAFT',
      publishedAt: input.publishedAt ?? null,
      applicationDeadline: input.applicationDeadline ?? null,
      requirements: input.requirements ?? [],
    }

    opportunities = [...opportunities, opportunity]
    saveOpportunities()
    return structuredClone(opportunity)
  },

  async update(opportunityId: number, input: OpportunityUpdateRequest) {
    await simulateNetworkDelay()
    validateOpportunity(input)
    const current = getOpportunity(opportunityId)
    const updated: OpportunityResponse = {
      ...current,
      ...input,
      applicationDeadline: input.applicationDeadline,
      requirements: input.requirements ?? [],
    }
    opportunities = opportunities.map((item) => item.id === opportunityId ? updated : item)
    saveOpportunities()
    return structuredClone(updated)
  },

  async patch(opportunityId: number, input: OpportunityPatchRequest) {
    await simulateNetworkDelay()
    const current = getOpportunity(opportunityId)
    const updated: OpportunityResponse = {
      ...current,
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      type: input.type ?? current.type,
      positions: input.positions ?? current.positions,
      workloadHours: input.workloadHours ?? current.workloadHours,
      remuneration: input.remuneration ?? current.remuneration,
      status: input.status ?? current.status,
      publishedAt: input.publishedAt ?? current.publishedAt,
      applicationDeadline: input.applicationDeadline ?? current.applicationDeadline,
      requirements: input.requirements ?? current.requirements,
    }
    validateOpportunity(updated)
    opportunities = opportunities.map((item) => item.id === opportunityId ? updated : item)
    saveOpportunities()
    return structuredClone(updated)
  },

  async remove(opportunityId: number) {
    await simulateNetworkDelay()
    getOpportunity(opportunityId)
    opportunities = opportunities.filter((item) => item.id !== opportunityId)
    saveOpportunities()
  },
}
