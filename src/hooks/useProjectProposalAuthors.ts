import axios from 'axios'
import { useEffect, useState } from 'react'
import { getServiceErrorMessage } from '../services/errorMessage'
import { userService } from '../services/userService'
import type { StudentResponse, UserProfile } from '../types/domain'

interface AuthorState {
  key: string
  profiles: Record<number, StudentResponse>
  error: string | null
}

function isAbortError(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError'))
}

export function useProjectProposalAuthors(authorIds: number[], currentUser: UserProfile) {
  const authorIdKey = [...new Set(authorIds)].join(',')
  const requestKey = `${currentUser.role}:${currentUser.profile.id}:${currentUser.profile.name}:${authorIdKey}`
  const [state, setState] = useState<AuthorState | null>(null)
  const currentState = state?.key === requestKey ? state : null

  useEffect(() => {
    if (!authorIdKey) return

    const controller = new AbortController()
    const uniqueAuthorIds = authorIdKey.split(',').map(Number)

    const loadAuthors = async () => {
      const results = await Promise.all(uniqueAuthorIds.map(async (authorId) => {
        try {
          const profile = currentUser.role === 'STUDENT' && currentUser.profile.id === authorId
            ? currentUser
            : await userService.getProfileById(authorId, controller.signal)
          if (profile.role !== 'STUDENT') {
            throw new Error(`O perfil ${authorId} associado à proposta não é de um discente.`)
          }
          return { authorId, profile: profile.profile } as const
        } catch (error: unknown) {
          if (isAbortError(error)) return { authorId, aborted: true } as const
          return {
            authorId,
            error: getServiceErrorMessage(error, 'Não foi possível carregar o perfil do autor.'),
          } as const
        }
      }))

      const profiles: Record<number, StudentResponse> = {}
      for (const result of results) {
        if ('profile' in result && result.profile) profiles[result.authorId] = result.profile
      }

      const firstError = results.find(
        (result): result is { authorId: number; error: string } => 'error' in result,
      )
      if (!firstError?.error) {
        setState({ key: requestKey, profiles, error: firstError?.error ?? null })
      }
    }

    void loadAuthors()

    return () => {
      controller.abort()
    }
  }, [authorIdKey, currentUser, requestKey])

  return {
    profiles: currentState?.profiles ?? {},
    isLoading: !currentState && Boolean(authorIdKey),
    error: currentState?.error ?? null,
  }
}
