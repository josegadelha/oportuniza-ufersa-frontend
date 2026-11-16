import type { AuthSession, UserProfile } from '../types/domain'

const SESSION_KEY = 'oportuniza.auth-session'
export const AUTH_SESSION_EXPIRED_EVENT = 'oportuniza:auth-session-expired'

function isOptionalString(value: unknown) {
  return value === null || typeof value === 'string'
}

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null || !('role' in value) || !('profile' in value)) {
    return false
  }

  const { role, profile } = value
  if (
    (role !== 'STUDENT' && role !== 'PROFESSOR')
    || typeof profile !== 'object'
    || profile === null
    || !('id' in profile)
    || typeof profile.id !== 'number'
    || !('username' in profile)
    || typeof profile.username !== 'string'
    || !('registration' in profile)
    || typeof profile.registration !== 'string'
    || !('name' in profile)
    || typeof profile.name !== 'string'
    || !('email' in profile)
    || typeof profile.email !== 'string'
    || !('lattesUrl' in profile)
    || !isOptionalString(profile.lattesUrl)
    || ('githubUrl' in profile && !isOptionalString(profile.githubUrl))
    || ('linkedinUrl' in profile && !isOptionalString(profile.linkedinUrl))
    || !('description' in profile)
    || !isOptionalString(profile.description)
  ) {
    return false
  }

  if (role === 'STUDENT') {
    return 'course' in profile
      && typeof profile.course === 'string'
      && 'currentPeriod' in profile
      && typeof profile.currentPeriod === 'number'
      && 'ira' in profile
      && typeof profile.ira === 'number'
      && 'receiveNotifications' in profile
      && typeof profile.receiveNotifications === 'boolean'
  }

  return 'department' in profile && typeof profile.department === 'string'
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null || !('accessToken' in value) || !('user' in value)) {
    return false
  }

  return typeof value.accessToken === 'string' && isUserProfile(value.user)
}

export function readAuthSession(): AuthSession | null {
  const storedSession = localStorage.getItem(SESSION_KEY)
  if (storedSession === null) return null

  let parsedSession: unknown
  try {
    parsedSession = JSON.parse(storedSession)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('A sessão armazenada está corrompida. Acesse novamente.')
    }
    throw error
  }
  if (!isAuthSession(parsedSession)) {
    throw new Error('A sessão armazenada possui um formato inválido. Saia e acesse novamente.')
  }

  return parsedSession
}

export function writeAuthSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY)
}
