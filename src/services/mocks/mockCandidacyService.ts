import type {
  CandidacyCreateRequest,
  CandidacyPatchRequest,
  CandidacyResponse,
  CandidacyUpdateRequest,
} from '../../types/domain'
import type { CandidacyService } from '../candidacyService'
import { readAuthSession } from '../sessionStorage'
import { simulateNetworkDelay } from './delay'
import { initialMockCandidacies } from './candidacies'
import { isArrayOf, readMockState, writeMockState } from './storage'

const STORAGE_KEY = 'oportuniza.mock.candidacies.v2'

function isCandidacy(value: unknown): value is CandidacyResponse {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value
    && typeof value.id === 'number'
    && 'studentId' in value
    && typeof value.studentId === 'number'
    && 'opportunityId' in value
    && typeof value.opportunityId === 'number'
    && 'appliedAt' in value
    && typeof value.appliedAt === 'string'
    && 'status' in value
    && typeof value.status === 'string'
}

let candidacies = readMockState(
  STORAGE_KEY,
  initialMockCandidacies,
  (value): value is CandidacyResponse[] => isArrayOf(value, isCandidacy),
)

function getCandidacy(candidacyId: number) {
  const candidacy = candidacies.find((item) => item.id === candidacyId)
  if (!candidacy) throw new Error('Candidatura não encontrada.')
  return candidacy
}

function saveCandidacies() {
  writeMockState(STORAGE_KEY, candidacies)
}

function isValidStatusTransition(current: CandidacyResponse['status'], next: CandidacyResponse['status']) {
  const transitions: Record<CandidacyResponse['status'], CandidacyResponse['status'][]> = {
    IN_SELECTION: ['HISTORY_REVIEW', 'REJECTED', 'WITHDRAWN'],
    HISTORY_REVIEW: ['INTERVIEW', 'REJECTED', 'WITHDRAWN'],
    INTERVIEW: ['FINAL_REVIEW', 'REJECTED', 'WITHDRAWN'],
    FINAL_REVIEW: ['APPROVED', 'REJECTED', 'WITHDRAWN'],
    APPROVED: [],
    REJECTED: [],
    WITHDRAWN: [],
  }
  return transitions[current].includes(next)
}

export const mockCandidacyService: CandidacyService = {
  async list() {
    await simulateNetworkDelay()
    return structuredClone(candidacies)
  },

  async listByStudent() {
    await simulateNetworkDelay()
    const session = readAuthSession()
    if (!session || session.user.role !== 'STUDENT') {
      throw new Error('Entre como discente para consultar suas candidaturas.')
    }
    return structuredClone(candidacies.filter((item) => item.studentId === session.user.profile.id))
  },

  async listByOpportunity(opportunityId: number) {
    await simulateNetworkDelay()
    return structuredClone(candidacies.filter((item) => item.opportunityId === opportunityId))
  },

  async getById(candidacyId: number) {
    await simulateNetworkDelay()
    return structuredClone(getCandidacy(candidacyId))
  },

  async create(input: CandidacyCreateRequest) {
    await simulateNetworkDelay()
    if (!Number.isInteger(input.studentId) || !Number.isInteger(input.opportunityId)) {
      throw new Error('Informe o estudante e a oportunidade para registrar a candidatura.')
    }
    if (candidacies.some(
      (item) => item.studentId === input.studentId && item.opportunityId === input.opportunityId,
    )) {
      throw new Error('Este estudante já se candidatou a esta oportunidade.')
    }

    const candidacy: CandidacyResponse = {
      id: Math.max(0, ...candidacies.map((item) => item.id)) + 1,
      studentId: input.studentId,
      opportunityId: input.opportunityId,
      appliedAt: input.appliedAt ?? new Date().toISOString().slice(0, 19),
      status: input.status ?? 'IN_SELECTION',
    }
    candidacies = [...candidacies, candidacy]
    saveCandidacies()
    return structuredClone(candidacy)
  },

  async update(candidacyId: number, input: CandidacyUpdateRequest) {
    await simulateNetworkDelay()
    const current = getCandidacy(candidacyId)
    if (!isValidStatusTransition(current.status, input.status)) {
      throw new Error('Transição de status inválida para a candidatura.')
    }
    const updated: CandidacyResponse = { ...current, ...input }
    candidacies = candidacies.map((item) => item.id === candidacyId ? updated : item)
    saveCandidacies()
    return structuredClone(updated)
  },

  async patch(candidacyId: number, input: CandidacyPatchRequest) {
    await simulateNetworkDelay()
    const current = getCandidacy(candidacyId)
    const updated: CandidacyResponse = {
      ...current,
      studentId: input.studentId ?? current.studentId,
      opportunityId: input.opportunityId ?? current.opportunityId,
      appliedAt: input.appliedAt ?? current.appliedAt,
      status: input.status ?? current.status,
    }
    candidacies = candidacies.map((item) => item.id === candidacyId ? updated : item)
    saveCandidacies()
    return structuredClone(updated)
  },

  async remove(candidacyId: number) {
    await simulateNetworkDelay()
    getCandidacy(candidacyId)
    candidacies = candidacies.filter((item) => item.id !== candidacyId)
    saveCandidacies()
  },
}
