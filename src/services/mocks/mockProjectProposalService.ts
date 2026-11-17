import type {
  ProjectProposalCard,
  ProjectProposalCategory,
  ProjectProposalCreateRequest,
  ProjectProposalPatchRequest,
  ProjectProposalStatus,
} from '../../types/domain'
import type { ProjectProposalService } from '../projectProposalService'
import { readAuthSession } from '../sessionStorage'
import { simulateNetworkDelay } from './delay'
import { isArrayOf, readMockState, writeMockState } from './storage'
import { initialMockProjectProposals } from './projectProposals'

const STORAGE_KEY = 'oportuniza.mock.project-proposals.v2'

function isProjectProposalCategory(value: unknown): value is ProjectProposalCategory {
  return value === 'RESEARCH' || value === 'EXTENSION' || value === 'INNOVATION' || value === null
}

function isProjectProposalStatus(value: unknown): value is ProjectProposalStatus {
  return value === 'OPEN' || value === 'IN_PROGRESS' || value === 'CLOSED'
}

function isProjectProposal(value: unknown): value is ProjectProposalCard {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value
    && typeof value.id === 'number'
    && 'studentId' in value
    && typeof value.studentId === 'number'
    && 'title' in value
    && typeof value.title === 'string'
    && 'description' in value
    && typeof value.description === 'string'
    && 'status' in value
    && isProjectProposalStatus(value.status)
    && 'publishedAt' in value
    && (typeof value.publishedAt === 'string' || value.publishedAt === null)
    && 'desiredSkills' in value
    && Array.isArray(value.desiredSkills)
    && value.desiredSkills.every((skill) => typeof skill === 'string')
    && 'category' in value
    && isProjectProposalCategory(value.category)
    && 'seeksAdvisor' in value
    && (typeof value.seeksAdvisor === 'boolean' || value.seeksAdvisor === null)
    && 'authorIds' in value
    && Array.isArray(value.authorIds)
    && value.authorIds.length > 0
    && value.authorIds.every((authorId) => Number.isSafeInteger(authorId) && authorId > 0)
    && value.authorIds.includes(value.studentId)
}

let proposals = readMockState(
  STORAGE_KEY,
  initialMockProjectProposals,
  (value): value is ProjectProposalCard[] => isArrayOf(value, isProjectProposal),
)

function getStudentId() {
  const session = readAuthSession()
  if (!session || session.user.role !== 'STUDENT') {
    throw new Error('Entre como discente para gerenciar suas propostas.')
  }
  return session.user.profile.id
}

function saveProposals() {
  writeMockState(STORAGE_KEY, proposals)
}

export const mockProjectProposalService: ProjectProposalService = {
  async list() {
    await simulateNetworkDelay()
    return structuredClone(proposals)
  },

  async listByStudent() {
    await simulateNetworkDelay()
    const studentId = getStudentId()
    return structuredClone(proposals.filter((proposal) => proposal.studentId === studentId))
  },

  async create(input: ProjectProposalCreateRequest) {
    await simulateNetworkDelay()
    const studentId = getStudentId()
    const title = input.title.trim()
    const description = input.description.trim()
    if (!title || !description) throw new Error('Informe o título e a descrição da proposta.')
    if (!input.desiredSkills.every((skill) => typeof skill === 'string' && skill.trim())) {
      throw new Error('Remova competências vazias da lista.')
    }

    const proposal: ProjectProposalCard = {
      id: Math.max(0, ...proposals.map((item) => item.id)) + 1,
      studentId,
      title,
      description,
      status: input.status ?? 'OPEN',
      publishedAt: input.publishedAt ?? new Date().toISOString(),
      desiredSkills: [...new Set(input.desiredSkills.map((skill) => skill.trim()))],
      category: input.category,
      seeksAdvisor: input.seeksAdvisor,
      authorIds: [studentId],
    }
    proposals = [proposal, ...proposals]
    saveProposals()
    return structuredClone(proposal)
  },

  async patch(proposalId: number, input: ProjectProposalPatchRequest) {
    await simulateNetworkDelay()
    const studentId = getStudentId()
    const current = proposals.find((item) => item.id === proposalId)
    if (!current) throw new Error('Proposta não encontrada.')
    if (!current.authorIds.includes(studentId)) {
      throw new Error('Você não pode alterar uma proposta de outro discente.')
    }

    const updated: ProjectProposalCard = {
      ...current,
      title: input.title?.trim() || current.title,
      description: input.description?.trim() || current.description,
      desiredSkills: input.desiredSkills ?? current.desiredSkills,
      status: input.status ?? current.status,
      publishedAt: input.publishedAt ?? current.publishedAt,
    }
    proposals = proposals.map((item) => item.id === proposalId ? updated : item)
    saveProposals()
    return structuredClone(updated)
  },
}
