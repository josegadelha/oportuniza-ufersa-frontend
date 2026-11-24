import { projectProposalService as apiProjectProposalService } from './api/projectProposalService'
import { mockProjectProposalService } from './mocks/mockProjectProposalService'
import type {
  ProjectProposalCard,
  ProjectProposalCreateRequest,
  ProjectProposalPatchRequest,
  ProposalInviteDecision,
} from '../types/domain'
import { readAuthSession } from './sessionStorage'
import { canViewStudentProposal } from './studentProposalVisibility'

export interface ProjectProposalService {
  list(signal?: AbortSignal): Promise<ProjectProposalCard[]>
  listByStudent(signal?: AbortSignal): Promise<ProjectProposalCard[]>
  create(input: ProjectProposalCreateRequest, signal?: AbortSignal): Promise<ProjectProposalCard>
  patch(proposalId: number, input: ProjectProposalPatchRequest, signal?: AbortSignal): Promise<ProjectProposalCard>
  respondToInvite(
    proposalId: number,
    decision: ProposalInviteDecision,
    signal?: AbortSignal,
  ): Promise<ProjectProposalCard>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

const selectedProjectProposalService: ProjectProposalService = USE_MOCKS
  ? mockProjectProposalService
  : apiProjectProposalService

export const projectProposalService: ProjectProposalService = {
  async list(signal?: AbortSignal) {
    const user = readAuthSession()?.user
    return (await selectedProjectProposalService.list(signal))
      .filter((proposal) => canViewStudentProposal(proposal, user))
  },

  async listByStudent(signal?: AbortSignal) {
    const user = readAuthSession()?.user
    return (await selectedProjectProposalService.listByStudent(signal))
      .filter((proposal) => canViewStudentProposal(proposal, user))
  },

  create: (input, signal) => selectedProjectProposalService.create(input, signal),
  patch: (proposalId, input, signal) => selectedProjectProposalService.patch(proposalId, input, signal),
  respondToInvite: (proposalId, decision, signal) => (
    selectedProjectProposalService.respondToInvite(proposalId, decision, signal)
  ),
}
