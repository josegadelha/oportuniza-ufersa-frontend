import { createContext } from 'react'
import type { LoginCredentials, UserProfile } from '../types/domain'

export interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  updateUser: (user: UserProfile) => void
  logout: () => void
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
