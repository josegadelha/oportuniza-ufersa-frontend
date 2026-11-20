import { api } from './api'
import { readAuthSession } from '../sessionStorage'
import type {
  ProjectProposalCard,
  ProjectProposalCreateRequest,
  ProjectProposalPatchRequest,
  ProjectProposalResponse,
} from '../../types/domain'
import type { ProjectProposalService } from '../projectProposalService'

function toCard(proposal: ProjectProposalResponse): ProjectProposalCard {
  return {
    ...proposal,
    category: null,
    seeksAdvisor: null,
    authorIds: [proposal.studentId],
  }
}

export const projectProposalService: ProjectProposalService = {
  async list(signal?: AbortSignal) {
    const { data } = await api.get<ProjectProposalResponse[]>('/project-proposals', { signal })
    return data.map(toCard)
  },

  async listByStudent(signal?: AbortSignal) {
    const { data } = await api.get<ProjectProposalResponse[]>('/students/project-proposals', { signal })
    return data.map(toCard)
  },

  async create(input: ProjectProposalCreateRequest, signal?: AbortSignal) {
    const session = readAuthSession()
    if (!session || session.user.role !== 'STUDENT') {
      throw new Error('Entre como discente para publicar uma proposta.')
    }

    const { category, seeksAdvisor, ...request } = input
    const { data } = await api.post<ProjectProposalResponse>(
      '/students/project-proposals',
      request,
      { signal },
    )
    return {
      ...toCard(data),
      category,
      seeksAdvisor,
    }
  },

  async patch(proposalId: number, input: ProjectProposalPatchRequest, signal?: AbortSignal) {
    const { data } = await api.patch<ProjectProposalResponse>(
      `/project-proposals/${proposalId}`,
      input,
      { signal },
    )
    return toCard(data)
  },
}
