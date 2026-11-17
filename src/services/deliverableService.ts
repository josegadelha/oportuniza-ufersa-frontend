import { deliverableService as apiDeliverableService } from './api/deliverableService'
import { mockDeliverableService } from './mocks/mockDeliverableService'
import type { DeliverableCreateRequest, DeliverablePatchRequest, DeliverableResponse } from '../types/domain'

export interface DeliverableService {
  list(): Promise<DeliverableResponse[]>
  listByProject(projectId: number): Promise<DeliverableResponse[]>
  createForProject(projectId: number, input: DeliverableCreateRequest): Promise<DeliverableResponse>
  patch(deliverableId: number, input: DeliverablePatchRequest): Promise<DeliverableResponse>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const deliverableService: DeliverableService = USE_MOCKS
  ? mockDeliverableService
  : apiDeliverableService
