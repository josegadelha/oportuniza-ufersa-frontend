import { api } from './api'
import { readAuthSession } from '../sessionStorage'
import type {
  ProjectProposalCard,
  ProjectProposalCreateRequest,
  ProjectProposalPatchRequest,
  ProjectProposalInvite,
  ProjectProposalResponse,
  ProposalInviteDecision,
} from '../../types/domain'
import type { ProjectProposalService } from '../projectProposalService'
import { canViewStudentProposal } from '../studentProposalVisibility'

function toCard(proposal: ProjectProposalResponse): ProjectProposalCard {
  const seekingAdvisor = proposal.seekingAdvisor === true
  return {
    ...proposal,
    isPrivate: proposal.isPrivate === true,
    seekingAdvisor,
    invites: proposal.invites ?? [],
    category: null,
    seeksAdvisor: seekingAdvisor,
    authorIds: [proposal.studentId],
  }
}

export const projectProposalService: ProjectProposalService = {
  async list(signal?: AbortSignal) {
    const { data } = await api.get<ProjectProposalResponse[]>('/project-proposals', { signal })
    const currentUser = readAuthSession()?.user
    return data.map(toCard).filter((proposal) => canViewStudentProposal(proposal, currentUser))
  },

  async listByStudent(signal?: AbortSignal) {
    const { data } = await api.get<ProjectProposalResponse[]>('/students/project-proposals', { signal })
    const currentUser = readAuthSession()?.user
    return data.map(toCard).filter((proposal) => canViewStudentProposal(proposal, currentUser))
  },

  async create(input: ProjectProposalCreateRequest, signal?: AbortSignal) {
    const session = readAuthSession()
    if (!session || session.user.role !== 'STUDENT') {
      throw new Error('Entre como discente para publicar uma proposta.')
    }

    const { category } = input
    const request = {
      title: input.title,
      description: input.description,
      desiredSkills: input.desiredSkills,
      seekingAdvisor: input.seekingAdvisor,
      isPrivate: input.isPrivate,
      invites: input.invites,
      status: input.status,
      publishedAt: input.publishedAt,
    }
    const { data } = await api.post<ProjectProposalResponse>(
      '/students/project-proposals',
      request,
      { signal },
    )
    return {
      ...toCard(data),
      category,
      isPrivate: input.isPrivate === true,
      seekingAdvisor: input.seekingAdvisor === true,
      seeksAdvisor: input.seekingAdvisor === true,
      invites: input.invites,
    }
  },

  async patch(proposalId: number, input: ProjectProposalPatchRequest, signal?: AbortSignal) {
    const { data } = await api.patch<ProjectProposalResponse>(
      `/project-proposals/${proposalId}`,
      input,
      { signal },
    )
    const proposal = toCard(data)
    return {
      ...proposal,
      isPrivate: input.isPrivate == null ? proposal.isPrivate : input.isPrivate === true,
      seekingAdvisor: input.seekingAdvisor == null ? proposal.seekingAdvisor : input.seekingAdvisor === true,
      seeksAdvisor: input.seekingAdvisor == null ? proposal.seeksAdvisor : input.seekingAdvisor === true,
      invites: input.invites ?? proposal.invites,
    }
  },

  async respondToInvite(
    proposalId: number,
    decision: ProposalInviteDecision,
    signal?: AbortSignal,
  ) {
    const session = readAuthSession()
    if (!session) throw new Error('Entre para responder ao convite.')
    const { data } = await api.patch<ProjectProposalResponse>(
      `/project-proposals/${proposalId}/invites/me`,
      { status: decision },
      { signal },
    )
    const proposal = toCard(data)
    const userId = String(session.user.profile.id)
    const invites: ProjectProposalInvite[] = decision === 'accepted'
      ? proposal.invites.map((invite) => (
        invite.userId === userId ? { ...invite, status: 'accepted' as const } : invite
      ))
      : proposal.invites.filter((invite) => invite.userId !== userId)
    return {
      ...proposal,
      invites,
      authorIds: decision === 'accepted'
        ? [...new Set([...proposal.authorIds, session.user.profile.id])]
        : proposal.authorIds,
    }
  },
}
