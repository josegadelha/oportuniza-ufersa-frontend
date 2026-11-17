import { api } from './api'
import type { ProjectResponse } from '../../types/domain'
import type { ProjectService } from '../projectService'

export const projectService: ProjectService = {
  async list() {
    const { data } = await api.get<ProjectResponse[]>('/projects')
    return data
  },
}
