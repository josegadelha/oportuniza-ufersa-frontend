import { authService as apiAuthService } from './api/authService'
import { mockAuthService } from './mocks/mockAuthService'
import type { AuthSession, LoginCredentials, UserProfile } from '../types/domain'

export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>
  getCurrentSession(): AuthSession | null
  updateSessionUser(user: UserProfile): void
  logout(): void
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const authService: AuthService = USE_MOCKS ? mockAuthService : apiAuthService
