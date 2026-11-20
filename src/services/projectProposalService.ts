import { projectProposalService as apiProjectProposalService } from './api/projectProposalService'
import { mockProjectProposalService } from './mocks/mockProjectProposalService'
import type {
  ProjectProposalCard,
  ProjectProposalCreateRequest,
  ProjectProposalPatchRequest,
} from '../types/domain'

export interface ProjectProposalService {
  list(signal?: AbortSignal): Promise<ProjectProposalCard[]>
  listByStudent(signal?: AbortSignal): Promise<ProjectProposalCard[]>
  create(input: ProjectProposalCreateRequest, signal?: AbortSignal): Promise<ProjectProposalCard>
  patch(proposalId: number, input: ProjectProposalPatchRequest, signal?: AbortSignal): Promise<ProjectProposalCard>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const projectProposalService: ProjectProposalService = USE_MOCKS
  ? mockProjectProposalService
  : apiProjectProposalService
