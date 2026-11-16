import axios from 'axios'

function getResponseMessage(payload: unknown) {
  if (typeof payload !== 'object' || payload === null) return null

  const messages = [
    'detail' in payload ? payload.detail : null,
    'message' in payload ? payload.message : null,
    'title' in payload ? payload.title : null,
  ]
  for (const message of messages) {
    if (typeof message === 'string') return message
  }
  return null
}

export function getServiceErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const responseMessage = getResponseMessage(error.response?.data)
    if (responseMessage) return responseMessage
    if (error.code === 'ERR_NETWORK') {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
    }
    return fallback
  }

  return error instanceof Error ? error.message : fallback
}
