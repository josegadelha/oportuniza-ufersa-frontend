import { opportunityService as apiOpportunityService } from './api/opportunityService'
import { mockOpportunityService } from './mocks/mockOpportunityService'
import type {
  OpportunityCreateRequest,
  OpportunityPatchRequest,
  OpportunityResponse,
  OpportunityUpdateRequest,
} from '../types/domain'

export interface OpportunityService {
  list(): Promise<OpportunityResponse[]>
  listByProfessor(): Promise<OpportunityResponse[]>
  getById(opportunityId: number): Promise<OpportunityResponse>
  create(input: OpportunityCreateRequest): Promise<OpportunityResponse>
  update(opportunityId: number, input: OpportunityUpdateRequest): Promise<OpportunityResponse>
  patch(opportunityId: number, input: OpportunityPatchRequest): Promise<OpportunityResponse>
  remove(opportunityId: number): Promise<void>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const opportunityService: OpportunityService = USE_MOCKS
  ? mockOpportunityService
  : apiOpportunityService
