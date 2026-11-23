import { projectService as apiProjectService } from './api/projectService'
import { mockProjectService } from './mocks/mockProjectService'
import type { ProjectResponse } from '../types/domain'

export interface ProjectService {
  list(signal?: AbortSignal): Promise<ProjectResponse[]>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const projectService: ProjectService = USE_MOCKS
  ? mockProjectService
  : apiProjectService
