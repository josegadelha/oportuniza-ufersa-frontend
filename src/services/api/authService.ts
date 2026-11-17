import { api, setApiAccessToken } from './api'
import { clearAuthSession, readAuthSession, writeAuthSession } from '../sessionStorage'
import { userService } from '../userService'
import type {
  AuthSession,
  LoginRequestDTO,
  AuthTokenResponse,
  LoginCredentials,
  UserProfile,
  UserRole,
} from '../../types/domain'
import type { AuthService } from '../authService'

function getRoleFromToken(token: string): UserRole {
  const encodedPayload = token.split('.')[1]
  if (!encodedPayload) throw new Error('O servidor retornou um token inválido.')

  const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
  const paddedPayload = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=')
  const payload: unknown = JSON.parse(atob(paddedPayload))

  if (
    typeof payload !== 'object'
    || payload === null
    || !('role' in payload)
    || (payload.role !== 'STUDENT' && payload.role !== 'PROFESSOR')
  ) {
    throw new Error('O token não informa um perfil reconhecido.')
  }

  return payload.role
}

export const authService: AuthService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const request: LoginRequestDTO = {
      username: credentials.username,
      password: credentials.password,
    }
    const { data } = await api.post<AuthTokenResponse>('/auth/login', request)
    const role = getRoleFromToken(data.token)
    setApiAccessToken(data.token)

    try {
      const user = await userService.getCurrentProfile(role)
      const session: AuthSession = {
        accessToken: data.token,
        user,
      }

      writeAuthSession(session)
      return session
    } catch (error) {
      setApiAccessToken(null)
      throw error
    }
  },

  getCurrentSession(): AuthSession | null {
    const session = readAuthSession()
    setApiAccessToken(session?.accessToken ?? null)
    return session
  },

  updateSessionUser(user: UserProfile) {
    const session = readAuthSession()
    if (session?.user.role === user.role && session.user.profile.id === user.profile.id) {
      writeAuthSession({ ...session, user })
    }
  },

  logout() {
    setApiAccessToken(null)
    clearAuthSession()
  },
}
