import type { DeliverableService } from '../deliverableService'
import { api } from './api'
import type { DeliverableCreateRequest, DeliverablePatchRequest, DeliverableResponse } from '../../types/domain'

export const deliverableService: DeliverableService = {
  async list() {
    const { data } = await api.get<DeliverableResponse[]>('/deliverables')
    return data
  },

  async listByProject(projectId) {
    const { data } = await api.get<DeliverableResponse[]>(`/projects/${projectId}/deliverables`)
    return data
  },

  async createForProject(projectId, input: DeliverableCreateRequest) {
    const { data } = await api.post<DeliverableResponse>(`/projects/${projectId}/deliverables`, input)
    return data
  },

  async patch(deliverableId, input: DeliverablePatchRequest) {
    const { data } = await api.patch<DeliverableResponse>(`/deliverables/${deliverableId}`, input)
    return data
  },
}
