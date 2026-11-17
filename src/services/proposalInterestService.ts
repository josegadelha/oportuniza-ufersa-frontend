import { proposalInterestService as apiProposalInterestService } from './api/proposalInterestService'
import { mockProposalInterestService } from './mocks/mockProposalInterestService'
import type { ProposalInterestResponse, ProposalInterestStatus } from '../types/domain'

export interface ProposalInterestService {
  list(): Promise<ProposalInterestResponse[]>
  listByProposal(projectProposalId: number): Promise<ProposalInterestResponse[]>
  createForProposal(projectProposalId: number): Promise<ProposalInterestResponse>
  updateStatus(interestId: number, status: ProposalInterestStatus): Promise<ProposalInterestResponse>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const proposalInterestService: ProposalInterestService = USE_MOCKS
  ? mockProposalInterestService
  : apiProposalInterestService
