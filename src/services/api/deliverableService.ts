import type { DeliverableService } from '../deliverableService'
import { api } from './api'
import type { DeliverableCreateRequest, DeliverablePatchRequest, DeliverableResponse } from '../../types/domain'

export const deliverableService: DeliverableService = {
  async list(signal?: AbortSignal) {
    const { data } = await api.get<DeliverableResponse[]>('/deliverables', { signal })
    return data
  },

  async listByProject(projectId, signal?: AbortSignal) {
    const { data } = await api.get<DeliverableResponse[]>(`/projects/${projectId}/deliverables`, { signal })
    return data
  },

  async createForProject(projectId, input: DeliverableCreateRequest, signal?: AbortSignal) {
    const { data } = await api.post<DeliverableResponse>(`/projects/${projectId}/deliverables`, input, { signal })
    return data
  },

  async patch(deliverableId, input: DeliverablePatchRequest, signal?: AbortSignal) {
    const { data } = await api.patch<DeliverableResponse>(`/deliverables/${deliverableId}`, input, { signal })
    return data
  },
}
