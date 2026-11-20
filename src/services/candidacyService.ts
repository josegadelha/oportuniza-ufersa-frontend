import { candidacyService as apiCandidacyService } from './api/candidacyService'
import { mockCandidacyService } from './mocks/mockCandidacyService'
import type {
  CandidacyCreateRequest,
  CandidacyPatchRequest,
  CandidacyResponse,
  CandidacyUpdateRequest,
} from '../types/domain'

export interface CandidacyService {
  list(signal?: AbortSignal): Promise<CandidacyResponse[]>
  listByStudent(signal?: AbortSignal): Promise<CandidacyResponse[]>
  listByOpportunity(opportunityId: number, signal?: AbortSignal): Promise<CandidacyResponse[]>
  getById(candidacyId: number, signal?: AbortSignal): Promise<CandidacyResponse>
  create(input: CandidacyCreateRequest, signal?: AbortSignal): Promise<CandidacyResponse>
  update(candidacyId: number, input: CandidacyUpdateRequest, signal?: AbortSignal): Promise<CandidacyResponse>
  patch(candidacyId: number, input: CandidacyPatchRequest, signal?: AbortSignal): Promise<CandidacyResponse>
  remove(candidacyId: number, signal?: AbortSignal): Promise<void>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const candidacyService: CandidacyService = USE_MOCKS
  ? mockCandidacyService
  : apiCandidacyService
