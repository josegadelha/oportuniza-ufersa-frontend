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
  async list() {
    const { data } = await api.get<ProjectProposalResponse[]>('/project-proposals')
    return data.map(toCard)
  },

  async listByStudent() {
    const { data } = await api.get<ProjectProposalResponse[]>('/students/project-proposals')
    return data.map(toCard)
  },

  async create(input: ProjectProposalCreateRequest) {
    const session = readAuthSession()
    if (!session || session.user.role !== 'STUDENT') {
      throw new Error('Entre como discente para publicar uma proposta.')
    }

    const { category, seeksAdvisor, ...request } = input
    const { data } = await api.post<ProjectProposalResponse>(
      '/students/project-proposals',
      request,
    )
    return {
      ...toCard(data),
      category,
      seeksAdvisor,
    }
  },

  async patch(proposalId: number, input: ProjectProposalPatchRequest) {
    const { data } = await api.patch<ProjectProposalResponse>(
      `/project-proposals/${proposalId}`,
      input,
    )
    return toCard(data)
  },
}
