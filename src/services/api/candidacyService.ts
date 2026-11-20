import { api } from './api'
import type {
  CandidacyCreateRequest,
  CandidacyPatchRequest,
  CandidacyResponse,
  CandidacyUpdateRequest,
} from '../../types/domain'
import type { CandidacyService } from '../candidacyService'

export const candidacyService: CandidacyService = {
  async list(signal?: AbortSignal) {
    const { data } = await api.get<CandidacyResponse[]>('/candidacies', { signal })
    return data
  },

  async listByStudent(signal?: AbortSignal) {
    const { data } = await api.get<CandidacyResponse[]>('/students/candidacies', { signal })
    return data
  },

  async listByOpportunity(opportunityId: number, signal?: AbortSignal) {
    const { data } = await api.get<CandidacyResponse[]>(`/opportunities/${opportunityId}/candidacies`, { signal })
    return data
  },

  async getById(candidacyId: number, signal?: AbortSignal) {
    const { data } = await api.get<CandidacyResponse>(`/candidacies/${candidacyId}`, { signal })
    return data
  },

  async create(input: CandidacyCreateRequest, signal?: AbortSignal) {
    const { data } = await api.post<CandidacyResponse>(
      `/opportunities/${input.opportunityId}/candidacies`,
      input,
      { signal },
    )
    return data
  },

  async update(candidacyId: number, input: CandidacyUpdateRequest, signal?: AbortSignal) {
    const { data } = await api.put<CandidacyResponse>(`/candidacies/${candidacyId}`, input, { signal })
    return data
  },

  async patch(candidacyId: number, input: CandidacyPatchRequest, signal?: AbortSignal) {
    const { data } = await api.patch<CandidacyResponse>(`/candidacies/${candidacyId}`, input, { signal })
    return data
  },

  async remove(candidacyId: number, signal?: AbortSignal) {
    await api.delete(`/candidacies/${candidacyId}`, { signal })
  },
}
