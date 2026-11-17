import { useEffect, useState } from 'react'
import { getServiceErrorMessage } from '../services/errorMessage'
import { userService } from '../services/userService'
import type { StudentResponse, UserProfile } from '../types/domain'

interface AuthorState {
  key: string
  profiles: Record<number, StudentResponse>
  error: string | null
}

export function useProjectProposalAuthors(authorIds: number[], currentUser: UserProfile) {
  const authorIdKey = [...new Set(authorIds)].join(',')
  const requestKey = `${currentUser.role}:${currentUser.profile.id}:${currentUser.profile.name}:${authorIdKey}`
  const [state, setState] = useState<AuthorState | null>(null)
  const currentState = state?.key === requestKey ? state : null

  useEffect(() => {
    if (!authorIdKey) return

    let isCurrent = true
    const uniqueAuthorIds = authorIdKey.split(',').map(Number)

    const loadAuthors = async () => {
      const results = await Promise.all(uniqueAuthorIds.map(async (authorId) => {
        try {
          const profile = currentUser.role === 'STUDENT' && currentUser.profile.id === authorId
            ? currentUser
            : await userService.getProfileById(authorId)
          if (profile.role !== 'STUDENT') {
            throw new Error(`O perfil ${authorId} associado à proposta não é de um discente.`)
          }
          return { authorId, profile: profile.profile } as const
        } catch (error: unknown) {
          return {
            authorId,
            error: getServiceErrorMessage(error, 'Não foi possível carregar o perfil do autor.'),
          } as const
        }
      }))

      if (!isCurrent) return

      const profiles: Record<number, StudentResponse> = {}
      for (const result of results) {
        if ('profile' in result && result.profile) profiles[result.authorId] = result.profile
      }

      const firstError = results.find(
        (result): result is { authorId: number; error: string } => 'error' in result,
      )
      setState({ key: requestKey, profiles, error: firstError?.error ?? null })
    }

    void loadAuthors()

    return () => {
      isCurrent = false
    }
  }, [authorIdKey, currentUser, requestKey])

  return {
    profiles: currentState?.profiles ?? {},
    isLoading: !currentState && Boolean(authorIdKey),
    error: currentState?.error ?? null,
  }
}
