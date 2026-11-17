import type { ProjectService } from '../projectService'
import { readAuthSession } from '../sessionStorage'
import { simulateNetworkDelay } from './delay'
import { initialMockProjects } from './projects'

export const mockProjectService: ProjectService = {
  async list() {
    await simulateNetworkDelay()
    const session = readAuthSession()
    if (!session) throw new Error('Entre na plataforma para consultar seus projetos.')

    const userId = session.user.profile.id
    return structuredClone(initialMockProjects.filter((project) => (
      session.user.role === 'STUDENT'
        ? project.memberIds.includes(userId)
        : project.advisorIds.includes(userId)
    )))
  },
}
