import axios from 'axios'
import { clearAuthSession, AUTH_SESSION_EXPIRED_EVENT } from '../sessionStorage'

const apiBaseUrl = import.meta.env.VITE_API_URL

export const api = axios.create({ baseURL: apiBaseUrl })

let accessToken: string | null = null

api.interceptors.request.use((config) => {
  if (!apiBaseUrl) {
    throw new Error('A variável VITE_API_URL não foi configurada.')
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error)
      && error.response?.status === 401
      && !/\/auth\/login(?:\?|$)/.test(error.config?.url ?? '')
    ) {
      setApiAccessToken(null)
      clearAuthSession()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
      }
    }

    return Promise.reject(error)
  },
)

export function setApiAccessToken(token: string | null) {
  accessToken = token
}
