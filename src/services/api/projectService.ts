import { api } from './api'
import type { ProjectResponse } from '../../types/domain'
import type { ProjectService } from '../projectService'

export const projectService: ProjectService = {
  async list(signal?: AbortSignal) {
    const { data } = await api.get<ProjectResponse[]>('/projects', { signal })
    return data
  },
}
