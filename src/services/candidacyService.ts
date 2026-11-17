import { candidacyService as apiCandidacyService } from './api/candidacyService'
import { mockCandidacyService } from './mocks/mockCandidacyService'
import type {
  CandidacyCreateRequest,
  CandidacyPatchRequest,
  CandidacyResponse,
  CandidacyUpdateRequest,
} from '../types/domain'

export interface CandidacyService {
  list(): Promise<CandidacyResponse[]>
  listByStudent(): Promise<CandidacyResponse[]>
  listByOpportunity(opportunityId: number): Promise<CandidacyResponse[]>
  getById(candidacyId: number): Promise<CandidacyResponse>
  create(input: CandidacyCreateRequest): Promise<CandidacyResponse>
  update(candidacyId: number, input: CandidacyUpdateRequest): Promise<CandidacyResponse>
  patch(candidacyId: number, input: CandidacyPatchRequest): Promise<CandidacyResponse>
  remove(candidacyId: number): Promise<void>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const candidacyService: CandidacyService = USE_MOCKS
  ? mockCandidacyService
  : apiCandidacyService
