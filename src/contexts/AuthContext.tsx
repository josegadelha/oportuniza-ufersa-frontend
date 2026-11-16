import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from './auth-context'
import { authService } from '../services/authService'
import { getServiceErrorMessage } from '../services/errorMessage'
import { AUTH_SESSION_EXPIRED_EVENT } from '../services/sessionStorage'
import type { LoginCredentials, UserProfile } from '../types/domain'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(() => {
    try {
      return { session: authService.getCurrentSession(), error: null }
    } catch (sessionError) {
      return {
        session: null,
        error: getServiceErrorMessage(sessionError, 'Não foi possível restaurar sua sessão.'),
      }
    }
  })
  const [session, setSession] = useState(initialState.session)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialState.error)

  useEffect(() => {
    const handleSessionExpired = () => {
      setSession(null)
      setIsLoading(false)
      setError('Sua sessão expirou. Entre novamente.')
    }

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    setError(null)
    try {
      setSession(await authService.login(credentials))
      return true
    } catch (loginError) {
      setError(getServiceErrorMessage(loginError, 'Não foi possível concluir o acesso. Tente novamente.'))
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setSession(null)
    setError(null)
  }, [])

  const updateUser = useCallback((user: UserProfile) => {
    authService.updateSessionUser(user)
    setSession((current) => current ? { ...current, user } : current)
  }, [])

  const clearError = useCallback(() => setError(null), [])
  const value = useMemo(() => ({
    user: session?.user ?? null,
    isLoading,
    error,
    login,
    updateUser,
    logout,
    clearError,
  }), [session, isLoading, error, login, updateUser, logout, clearError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
