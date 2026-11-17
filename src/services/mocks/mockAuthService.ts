import type { AuthService } from '../authService'
import { simulateNetworkDelay } from './delay'
import { mockUserService } from './mockUserService'
import { clearAuthSession, readAuthSession, writeAuthSession } from '../sessionStorage'
import type { UserProfile, UserRole } from '../../types/domain'

function getRoleFromUsername(username: string): UserRole | null {
  const normalizedUsername = username.trim().toLocaleLowerCase('pt-BR')
  if (['student', 'discente', 'aluno.ufersa'].includes(normalizedUsername)) return 'STUDENT'
  if (['professor', 'docente', 'docente.ufersa', 'prof.ufersa'].includes(normalizedUsername)) {
    return 'PROFESSOR'
  }
  return null
}

export const mockAuthService: AuthService = {
  async login(credentials) {
    await simulateNetworkDelay()
    if (!credentials.username.trim() || !credentials.password) {
      throw new Error('Informe seu usuário e sua senha.')
    }

    const role = getRoleFromUsername(credentials.username)
    if (!role) {
      throw new Error('Usuário de teste não reconhecido. Use aluno.ufersa ou prof.ufersa.')
    }

    const user = await mockUserService.getCurrentProfile(role)
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
