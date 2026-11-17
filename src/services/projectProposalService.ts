import { projectProposalService as apiProjectProposalService } from './api/projectProposalService'
import { mockProjectProposalService } from './mocks/mockProjectProposalService'
import type {
  ProjectProposalCard,
  ProjectProposalCreateRequest,
  ProjectProposalPatchRequest,
} from '../types/domain'

export interface ProjectProposalService {
  list(): Promise<ProjectProposalCard[]>
  listByStudent(): Promise<ProjectProposalCard[]>
  create(input: ProjectProposalCreateRequest): Promise<ProjectProposalCard>
  patch(proposalId: number, input: ProjectProposalPatchRequest): Promise<ProjectProposalCard>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const projectProposalService: ProjectProposalService = USE_MOCKS
  ? mockProjectProposalService
  : apiProjectProposalService
