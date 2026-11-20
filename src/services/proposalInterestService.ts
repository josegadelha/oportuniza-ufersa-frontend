import { proposalInterestService as apiProposalInterestService } from './api/proposalInterestService'
import { mockProposalInterestService } from './mocks/mockProposalInterestService'
import type { ProposalInterestResponse, ProposalInterestStatus } from '../types/domain'

export interface ProposalInterestService {
  list(signal?: AbortSignal): Promise<ProposalInterestResponse[]>
  listByProposal(projectProposalId: number, signal?: AbortSignal): Promise<ProposalInterestResponse[]>
  createForProposal(projectProposalId: number, signal?: AbortSignal): Promise<ProposalInterestResponse>
  updateStatus(interestId: number, status: ProposalInterestStatus, signal?: AbortSignal): Promise<ProposalInterestResponse>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const proposalInterestService: ProposalInterestService = USE_MOCKS
  ? mockProposalInterestService
  : apiProposalInterestService
