import axios from 'axios'
import { useEffect, useState } from 'react'
import { getServiceErrorMessage } from '../services/errorMessage'
import { userService } from '../services/userService'
import type { ProfessorResponse, UserProfile } from '../types/domain'

interface ProfessorState {
  key: string
  profiles: Record<number, ProfessorResponse>
  isLoading: boolean
  error: string | null
}

function isAbortError(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError'))
}

export function useOpportunityProfessors(professorIds: number[], currentUser: UserProfile) {
  const professorIdKey = [...new Set(professorIds)].join(',')
  const requestKey = `${currentUser.role}:${currentUser.profile.id}:${currentUser.profile.name}:${professorIdKey}`
  const [state, setState] = useState<ProfessorState | null>(null)
  const currentState = state?.key === requestKey ? state : null

  useEffect(() => {
    if (!professorIdKey) return

    const controller = new AbortController()
    const uniqueProfessorIds = professorIdKey.split(',').map(Number)

    const loadProfessors = async () => {
      const results = await Promise.all(uniqueProfessorIds.map(async (professorId) => {
        try {
          const profile = currentUser.role === 'PROFESSOR' && currentUser.profile.id === professorId
            ? currentUser
            : await userService.getProfileById(professorId, controller.signal)
          if (profile.role !== 'PROFESSOR') {
            throw new Error(`O perfil ${professorId} associado à oportunidade não é de um docente.`)
          }
          return { professorId, profile: profile.profile } as const
        } catch (error: unknown) {
          if (isAbortError(error)) return { professorId, aborted: true } as const
          return {
            professorId,
            error: getServiceErrorMessage(error, 'Não foi possível carregar o perfil do docente.'),
          } as const
        }
      }))

      const profiles: Record<number, ProfessorResponse> = {}
      for (const result of results) {
        if ('profile' in result && result.profile) profiles[result.professorId] = result.profile
      }

      const firstError = results.find(
        (result): result is { professorId: number; error: string } => 'error' in result,
      )
      if (!firstError?.error) {
        setState({
          key: requestKey,
          profiles,
          isLoading: false,
          error: firstError?.error ?? null,
        })
      }
    }

    void loadProfessors()

    return () => {
      controller.abort()
    }
  }, [currentUser, professorIdKey, requestKey])

  return {
    profiles: currentState?.profiles ?? {},
    isLoading: currentState?.isLoading ?? Boolean(professorIdKey),
    error: currentState?.error ?? null,
  }
}
