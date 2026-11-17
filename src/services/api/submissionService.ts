import type { SubmissionService } from '../submissionService'
import { api } from './api'
import type { SubmissionResponse, SubmissionVersionResponse } from '../../types/domain'

export const submissionService: SubmissionService = {
  async list() {
    const { data } = await api.get<SubmissionResponse[]>('/submissions')
    return data
  },

  async listByDeliverable(deliverableId) {
    const { data } = await api.get<SubmissionResponse[]>(`/deliverables/${deliverableId}/submissions`)
    return data
  },

  async versions(submissionId) {
    const { data } = await api.get<SubmissionVersionResponse[]>(`/submissions/${submissionId}/versions`)
    return data
  },

  async submit(deliverableId, filePath) {
    const { data } = await api.post<SubmissionResponse>(
      `/deliverables/${deliverableId}/submissions`,
      { filePath },
    )
    return data
  },
}
