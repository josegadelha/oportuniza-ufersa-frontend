import type {
  ProjectProposalCard,
  ProjectProposalCategory,
  ProjectProposalCreateRequest,
  ProjectProposalPatchRequest,
  ProposalInviteDecision,
  ProjectProposalStatus,
} from '../../types/domain'
import type { ProjectProposalService } from '../projectProposalService'
import { readAuthSession } from '../sessionStorage'
import { simulateNetworkDelay } from './delay'
import { isArrayOf, readMockState, writeMockState } from './storage'
import { initialMockProjectProposals } from './projectProposals'
import { canViewStudentProposal } from '../studentProposalVisibility'
import { MOCK_USER_IDS } from './users'

const STORAGE_KEY = 'oportuniza.mock.project-proposals.v2'
const LEGACY_SEEDED_INVITE_MIGRATION_KEY = 'oportuniza.mock.project-proposals.mariana-invite-cleanup.v1'
type StoredProjectProposal = Omit<ProjectProposalCard, 'isPrivate' | 'seekingAdvisor' | 'invites'>
  & Partial<Pick<ProjectProposalCard, 'isPrivate' | 'seekingAdvisor' | 'invites'>>

function isProjectProposalCategory(value: unknown): value is ProjectProposalCategory {
  return value === 'RESEARCH' || value === 'EXTENSION' || value === 'INNOVATION' || value === null
}

function isProjectProposalStatus(value: unknown): value is ProjectProposalStatus {
  return value === 'OPEN' || value === 'IN_PROGRESS' || value === 'CLOSED'
}

function isProjectProposal(value: unknown): value is StoredProjectProposal {
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
    && (!('isPrivate' in value) || typeof value.isPrivate === 'boolean')
    && (!('seekingAdvisor' in value) || typeof value.seekingAdvisor === 'boolean')
    && (!('invites' in value) || (Array.isArray(value.invites)
      && value.invites.every((invite) => typeof invite === 'object'
        && invite !== null
        && 'userId' in invite
        && typeof invite.userId === 'string'
        && 'name' in invite
        && typeof invite.name === 'string'
        && 'role' in invite
        && (invite.role === 'student' || invite.role === 'professor')
        && 'status' in invite
        && (invite.status === 'pending' || invite.status === 'accepted'))))
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

let proposals: ProjectProposalCard[] = readMockState(
  STORAGE_KEY,
  initialMockProjectProposals,
  (value): value is StoredProjectProposal[] => isArrayOf(value, isProjectProposal),
).map((proposal) => ({
  ...proposal,
  isPrivate: proposal.isPrivate === true,
  seekingAdvisor: proposal.seekingAdvisor === true || (
    proposal.seekingAdvisor === undefined && proposal.seeksAdvisor === true
  ),
  invites: proposal.invites ?? [],
}))

if (localStorage.getItem(LEGACY_SEEDED_INVITE_MIGRATION_KEY) !== 'complete') {
  const cleanedProposals = proposals.map((proposal) => {
    if (
      proposal.studentId !== MOCK_USER_IDS.studentRobotics
      || proposal.title !== 'Protótipo reservado para laboratório de robótica'
    ) {
      return proposal
    }

    const invites = proposal.invites.filter((invite) => !(
      invite.userId === String(MOCK_USER_IDS.student)
      && invite.name === 'Mariana Costa'
      && invite.role === 'student'
      && invite.status === 'pending'
    ))
    return invites.length === proposal.invites.length ? proposal : { ...proposal, invites }
  })

  if (cleanedProposals.some((proposal, index) => proposal !== proposals[index])) {
    proposals = cleanedProposals
    writeMockState(STORAGE_KEY, proposals)
  }
  localStorage.setItem(LEGACY_SEEDED_INVITE_MIGRATION_KEY, 'complete')
}

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
    const currentUser = readAuthSession()?.user
    return structuredClone(proposals.filter((proposal) => (
      canViewStudentProposal(proposal, currentUser)
    )))
  },

  async listByStudent() {
    await simulateNetworkDelay()
    const studentId = getStudentId()
    const currentUser = readAuthSession()?.user
    return structuredClone(proposals.filter((proposal) => (
      proposal.studentId === studentId && canViewStudentProposal(proposal, currentUser)
    )))
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
      isPrivate: input.isPrivate === true,
      seekingAdvisor: input.seekingAdvisor === true,
      invites: input.invites,
      category: input.category,
      seeksAdvisor: input.seekingAdvisor === true,
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
      isPrivate: input.isPrivate == null ? current.isPrivate : input.isPrivate === true,
      seekingAdvisor: input.seekingAdvisor == null
        ? current.seekingAdvisor
        : input.seekingAdvisor === true,
      seeksAdvisor: input.seekingAdvisor == null
        ? current.seeksAdvisor
        : input.seekingAdvisor === true,
      invites: input.invites ?? current.invites,
    }
    proposals = proposals.map((item) => item.id === proposalId ? updated : item)
    saveProposals()
    return structuredClone(updated)
  },

  async respondToInvite(proposalId: number, decision: ProposalInviteDecision) {
    await simulateNetworkDelay()
    const session = readAuthSession()
    if (!session) throw new Error('Entre para responder ao convite.')

    const current = proposals.find((item) => item.id === proposalId)
    if (!current) throw new Error('Proposta não encontrada.')
    const userId = String(session.user.profile.id)
    const invite = current.invites.find((item) => item.userId === userId && item.status === 'pending')
    if (!invite) throw new Error('Este convite não está mais pendente.')

    const updated: ProjectProposalCard = {
      ...current,
      invites: decision === 'accepted'
        ? current.invites.map((item) => (
          item.userId === userId ? { ...item, status: 'accepted' } : item
        ))
        : current.invites.filter((item) => item.userId !== userId),
      authorIds: decision === 'accepted'
        ? [...new Set([...current.authorIds, session.user.profile.id])]
        : current.authorIds,
    }
    proposals = proposals.map((item) => item.id === proposalId ? updated : item)
    saveProposals()
    return structuredClone(updated)
  },
}
