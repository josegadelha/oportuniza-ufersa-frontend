import { api } from './api'
import type {
  CandidacyCreateRequest,
  CandidacyPatchRequest,
  CandidacyResponse,
  CandidacyUpdateRequest,
} from '../../types/domain'
import type { CandidacyService } from '../candidacyService'

export const candidacyService: CandidacyService = {
  async list() {
    const { data } = await api.get<CandidacyResponse[]>('/candidacies')
    return data
  },

  async listByStudent() {
    const { data } = await api.get<CandidacyResponse[]>('/students/candidacies')
    return data
  },

  async listByOpportunity(opportunityId: number) {
    const { data } = await api.get<CandidacyResponse[]>(`/opportunities/${opportunityId}/candidacies`)
    return data
  },

  async getById(candidacyId: number) {
    const { data } = await api.get<CandidacyResponse>(`/candidacies/${candidacyId}`)
    return data
  },

  async create(input: CandidacyCreateRequest) {
    const { data } = await api.post<CandidacyResponse>(
      `/opportunities/${input.opportunityId}/candidacies`,
      input,
    )
    return data
  },

  async update(candidacyId: number, input: CandidacyUpdateRequest) {
    const { data } = await api.put<CandidacyResponse>(`/candidacies/${candidacyId}`, input)
    return data
  },

  async patch(candidacyId: number, input: CandidacyPatchRequest) {
    const { data } = await api.patch<CandidacyResponse>(`/candidacies/${candidacyId}`, input)
    return data
  },

  async remove(candidacyId: number) {
    await api.delete(`/candidacies/${candidacyId}`)
  },
}
