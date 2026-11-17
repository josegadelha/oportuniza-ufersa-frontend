import { api } from './api'
import type {
  OpportunityCreateRequest,
  OpportunityPatchRequest,
  OpportunityResponse,
  OpportunityUpdateRequest,
} from '../../types/domain'
import type { OpportunityService } from '../opportunityService'

export const opportunityService: OpportunityService = {
  async list() {
    const { data } = await api.get<OpportunityResponse[]>('/opportunities')
    return data
  },

  async listByProfessor() {
    const { data } = await api.get<OpportunityResponse[]>('/professors/opportunities')
    return data
  },

  async getById(opportunityId) {
    const { data } = await api.get<OpportunityResponse>(`/opportunities/${opportunityId}`)
    return data
  },

  async create(input: OpportunityCreateRequest) {
    const { data } = await api.post<OpportunityResponse>('/professors/opportunities', input)
    return data
  },

  async update(opportunityId: number, input: OpportunityUpdateRequest) {
    const { data } = await api.put<OpportunityResponse>(`/opportunities/${opportunityId}`, input)
    return data
  },

  async patch(opportunityId: number, input: OpportunityPatchRequest) {
    const { data } = await api.patch<OpportunityResponse>(`/opportunities/${opportunityId}`, input)
    return data
  },

  async remove(opportunityId: number) {
    await api.delete(`/opportunities/${opportunityId}`)
  },
}
