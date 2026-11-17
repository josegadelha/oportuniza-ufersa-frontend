import { submissionService as apiSubmissionService } from './api/submissionService'
import { mockSubmissionService } from './mocks/mockSubmissionService'
import type { SubmissionResponse, SubmissionVersionResponse } from '../types/domain'

export interface SubmissionService {
  list(): Promise<SubmissionResponse[]>
  listByDeliverable(deliverableId: number): Promise<SubmissionResponse[]>
  versions(submissionId: number): Promise<SubmissionVersionResponse[]>
  submit(deliverableId: number, filePath: string): Promise<SubmissionResponse>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const submissionService: SubmissionService = USE_MOCKS
  ? mockSubmissionService
  : apiSubmissionService
