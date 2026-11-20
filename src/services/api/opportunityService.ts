import { api } from './api'
import type {
  OpportunityCreateRequest,
  OpportunityPatchRequest,
  OpportunityResponse,
  OpportunityUpdateRequest,
} from '../../types/domain'
import type { OpportunityService } from '../opportunityService'

export const opportunityService: OpportunityService = {
  async list(signal?: AbortSignal) {
    const { data } = await api.get<OpportunityResponse[]>('/opportunities', { signal })
    return data
  },

  async listByProfessor(signal?: AbortSignal) {
    const { data } = await api.get<OpportunityResponse[]>('/professors/opportunities', { signal })
    return data
  },

  async getById(opportunityId, signal?: AbortSignal) {
    const { data } = await api.get<OpportunityResponse>(`/opportunities/${opportunityId}`, { signal })
    return data
  },

  async create(input: OpportunityCreateRequest, signal?: AbortSignal) {
    const { data } = await api.post<OpportunityResponse>('/professors/opportunities', input, { signal })
    return data
  },

  async update(opportunityId: number, input: OpportunityUpdateRequest, signal?: AbortSignal) {
    const { data } = await api.put<OpportunityResponse>(`/opportunities/${opportunityId}`, input, { signal })
    return data
  },

  async patch(opportunityId: number, input: OpportunityPatchRequest, signal?: AbortSignal) {
    const { data } = await api.patch<OpportunityResponse>(`/opportunities/${opportunityId}`, input, { signal })
    return data
  },

  async remove(opportunityId: number, signal?: AbortSignal) {
    await api.delete(`/opportunities/${opportunityId}`, { signal })
  },
}
