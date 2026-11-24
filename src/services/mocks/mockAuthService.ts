import type { AuthService } from '../authService'
import { simulateNetworkDelay } from './delay'
import { mockUserService } from './mockUserService'
import { initialMockAdditionalProfiles, initialMockUsers } from './users'
import { clearAuthSession, readAuthSession, writeAuthSession } from '../sessionStorage'
import type { UserProfile } from '../../types/domain'

function getUserIdFromUsername(username: string): number | undefined {
  const normalizedUsername = username.trim().toLocaleLowerCase('pt-BR')
  if (['discente', 'aluno.ufersa'].includes(normalizedUsername)) {
    return initialMockUsers.STUDENT.profile.id
  }
  if (['docente', 'docente.ufersa', 'prof.ufersa'].includes(normalizedUsername)) {
    return initialMockUsers.PROFESSOR.profile.id
  }
  return [...Object.values(initialMockUsers), ...initialMockAdditionalProfiles].find(
    (user) => user.profile.username.toLocaleLowerCase('pt-BR') === normalizedUsername,
  )?.profile.id
}

export const mockAuthService: AuthService = {
  async login(credentials) {
    await simulateNetworkDelay()
    if (!credentials.username.trim() || !credentials.password) {
      throw new Error('Informe seu usuário e sua senha.')
    }

    const userId = getUserIdFromUsername(credentials.username)
    if (userId === undefined) {
      throw new Error('Usuário de teste não reconhecido.')
    }

    const user = await mockUserService.getProfileById(userId)
    const session = {
      accessToken: `mock-token-${Date.now()}`,
      user,
    }
    writeAuthSession(session)
    return session
  },

  getCurrentSession() {
    return readAuthSession()
  },

  updateSessionUser(user: UserProfile) {
    const session = readAuthSession()
    if (session?.user.role === user.role && session.user.profile.id === user.profile.id) {
      writeAuthSession({ ...session, user })
    }
  },

  logout() {
    clearAuthSession()
  },
}
