import { api } from './api'
import { readAuthSession } from '../sessionStorage'
import type { ProposalInterestResponse, ProposalInterestStatus } from '../../types/domain'
import type { ProposalInterestService } from '../proposalInterestService'

export const proposalInterestService: ProposalInterestService = {
  async list() {
    const { data } = await api.get<ProposalInterestResponse[]>('/proposal-interests')
    return data
  },

  async listByProposal(projectProposalId) {
    const { data } = await api.get<ProposalInterestResponse[]>(
      `/project-proposals/${projectProposalId}/interests`,
    )
    return data
  },

  async createForProposal(projectProposalId) {
    const session = readAuthSession()
    if (!session) throw new Error('Entre na plataforma para registrar interesse na proposta.')

    const { data } = await api.post<ProposalInterestResponse>(
      `/project-proposals/${projectProposalId}/interests`,
      { userId: session.user.profile.id },
    )
    return data
  },

  async updateStatus(interestId: number, status: ProposalInterestStatus) {
    const { data } = await api.patch<ProposalInterestResponse>(
      `/proposal-interests/${interestId}`,
      { status },
    )
    return data
  },
}
