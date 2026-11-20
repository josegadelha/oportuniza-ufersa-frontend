import { api } from './api'
import { readAuthSession } from '../sessionStorage'
import type { ProposalInterestResponse, ProposalInterestStatus } from '../../types/domain'
import type { ProposalInterestService } from '../proposalInterestService'

export const proposalInterestService: ProposalInterestService = {
  async list(signal?: AbortSignal) {
    const { data } = await api.get<ProposalInterestResponse[]>('/proposal-interests', { signal })
    return data
  },

  async listByProposal(projectProposalId, signal?: AbortSignal) {
    const { data } = await api.get<ProposalInterestResponse[]>(
      `/project-proposals/${projectProposalId}/interests`,
      { signal },
    )
    return data
  },

  async createForProposal(projectProposalId, signal?: AbortSignal) {
    const session = readAuthSession()
    if (!session) throw new Error('Entre na plataforma para registrar interesse na proposta.')

    const { data } = await api.post<ProposalInterestResponse>(
      `/project-proposals/${projectProposalId}/interests`,
      { userId: session.user.profile.id },
      { signal },
    )
    return data
  },

  async updateStatus(interestId: number, status: ProposalInterestStatus, signal?: AbortSignal) {
    const { data } = await api.patch<ProposalInterestResponse>(
      `/proposal-interests/${interestId}`,
      { status },
      { signal },
    )
    return data
  },
}
