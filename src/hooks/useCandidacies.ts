import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { candidacyService } from '../services/candidacyService'
import type { CandidacyResponse } from '../types/domain'
import type { ServiceResult } from '../services/result'
import { getServiceErrorMessage } from '../services/errorMessage'

function isAbortError(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError'))
}

export function useCandidacies(studentId: number | null) {
  const [candidacies, setCandidacies] = useState<CandidacyResponse[]>([])
  const [isLoading, setIsLoading] = useState(studentId !== null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (studentId === null) {
      setCandidacies([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      setCandidacies(await candidacyService.listByStudent())
    } catch (loadError) {
      if (!isAbortError(loadError)) {
        setError(getServiceErrorMessage(loadError, 'Não foi possível carregar as candidaturas.'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    if (studentId === null) return

    const controller = new AbortController()
    candidacyService.listByStudent(controller.signal)
      .then((items) => {
        setCandidacies(items)
      })
      .catch((loadError: unknown) => {
        if (!isAbortError(loadError)) {
          setError(getServiceErrorMessage(loadError, 'Não foi possível carregar as candidaturas.'))
        }
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [studentId])

  const createForOpportunity = useCallback(async (
    opportunityId: number,
  ): Promise<ServiceResult<CandidacyResponse>> => {
    if (studentId === null) {
      const message = 'Entre como discente para se candidatar.'
      setError(message)
      return { success: false, message }
    }

    try {
      const candidacy = await candidacyService.create({ studentId, opportunityId })
      setCandidacies((current) => [...current, candidacy])
      setError(null)
      return { success: true, data: candidacy }
    } catch (createError) {
      const message = getServiceErrorMessage(createError, 'Não foi possível registrar sua candidatura.')
      setError(message)
      return { success: false, message }
    }
  }, [studentId])

  return { candidacies, isLoading, error, reload, createForOpportunity }
}
