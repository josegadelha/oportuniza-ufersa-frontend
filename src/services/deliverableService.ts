import { deliverableService as apiDeliverableService } from './api/deliverableService'
import { mockDeliverableService } from './mocks/mockDeliverableService'
import type { DeliverableCreateRequest, DeliverablePatchRequest, DeliverableResponse } from '../types/domain'

export interface DeliverableService {
  list(signal?: AbortSignal): Promise<DeliverableResponse[]>
  listByProject(projectId: number, signal?: AbortSignal): Promise<DeliverableResponse[]>
  createForProject(projectId: number, input: DeliverableCreateRequest, signal?: AbortSignal): Promise<DeliverableResponse>
  patch(deliverableId: number, input: DeliverablePatchRequest, signal?: AbortSignal): Promise<DeliverableResponse>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const deliverableService: DeliverableService = USE_MOCKS
  ? mockDeliverableService
  : apiDeliverableService
