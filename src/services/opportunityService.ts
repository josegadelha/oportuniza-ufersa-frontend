import { opportunityService as apiOpportunityService } from './api/opportunityService'
import { mockOpportunityService } from './mocks/mockOpportunityService'
import type {
  OpportunityCreateRequest,
  OpportunityPatchRequest,
  OpportunityResponse,
  OpportunityUpdateRequest,
} from '../types/domain'

export interface OpportunityService {
  list(signal?: AbortSignal): Promise<OpportunityResponse[]>
  listByProfessor(signal?: AbortSignal): Promise<OpportunityResponse[]>
  getById(opportunityId: number, signal?: AbortSignal): Promise<OpportunityResponse>
  create(input: OpportunityCreateRequest, signal?: AbortSignal): Promise<OpportunityResponse>
  update(opportunityId: number, input: OpportunityUpdateRequest, signal?: AbortSignal): Promise<OpportunityResponse>
  patch(opportunityId: number, input: OpportunityPatchRequest, signal?: AbortSignal): Promise<OpportunityResponse>
  remove(opportunityId: number, signal?: AbortSignal): Promise<void>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const opportunityService: OpportunityService = USE_MOCKS
  ? mockOpportunityService
  : apiOpportunityService
