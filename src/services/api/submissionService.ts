import type { SubmissionService } from '../submissionService'
import { api } from './api'
import type { SubmissionResponse, SubmissionVersionResponse } from '../../types/domain'

export const submissionService: SubmissionService = {
  async list(signal?: AbortSignal) {
    const { data } = await api.get<SubmissionResponse[]>('/submissions', { signal })
    return data
  },

  async listByDeliverable(deliverableId, signal?: AbortSignal) {
    const { data } = await api.get<SubmissionResponse[]>(`/deliverables/${deliverableId}/submissions`, { signal })
    return data
  },

  async versions(submissionId, signal?: AbortSignal) {
    const { data } = await api.get<SubmissionVersionResponse[]>(`/submissions/${submissionId}/versions`, { signal })
    return data
  },

  async submit(deliverableId, filePath, signal?: AbortSignal) {
    const { data } = await api.post<SubmissionResponse>(
      `/deliverables/${deliverableId}/submissions`,
      { filePath },
      { signal },
    )
    return data
  },

  async review(submissionId, status, feedback, signal?: AbortSignal) {
    const { data } = await api.patch<SubmissionResponse>(
      `/submissions/${submissionId}/review`,
      { status, feedback: feedback?.trim() || null },
      { signal },
    )
    return data
  },
}
