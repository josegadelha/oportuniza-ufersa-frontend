import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { opportunityService } from '../services/opportunityService'
import type {
  OpportunityCreateRequest,
  OpportunityPatchRequest,
  OpportunityResponse,
  OpportunityUpdateRequest,
} from '../types/domain'
import type { ServiceResult } from '../services/result'
import { getServiceErrorMessage } from '../services/errorMessage'

function isAbortError(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError'))
}

export function useOpportunities(forCurrentProfessor = false) {
  const [opportunities, setOpportunities] = useState<OpportunityResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setOpportunities(await (
        forCurrentProfessor
          ? opportunityService.listByProfessor()
          : opportunityService.list()
      ))
    } catch (loadError) {
      if (!isAbortError(loadError)) {
        setError(getServiceErrorMessage(loadError, 'Não foi possível carregar as oportunidades.'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [forCurrentProfessor])

  useEffect(() => {
    const controller = new AbortController()
    const request = forCurrentProfessor
      ? opportunityService.listByProfessor(controller.signal)
      : opportunityService.list(controller.signal)
    request
      .then((items) => {
        setOpportunities(items)
      })
      .catch((loadError: unknown) => {
        if (!isAbortError(loadError)) {
          setError(getServiceErrorMessage(loadError, 'Não foi possível carregar as oportunidades.'))
        }
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [forCurrentProfessor])

  const create = useCallback(async (
    input: OpportunityCreateRequest,
  ): Promise<ServiceResult<OpportunityResponse>> => {
    try {
      const opportunity = await opportunityService.create(input)
      setOpportunities((current) => [...current, opportunity])
      setError(null)
      return { success: true, data: opportunity }
    } catch (createError) {
      const message = getServiceErrorMessage(createError, 'Não foi possível criar a oportunidade.')
      setError(message)
      return { success: false, message }
    }
  }, [])

  const update = useCallback(async (
    opportunityId: number,
    input: OpportunityUpdateRequest,
  ): Promise<ServiceResult<OpportunityResponse>> => {
    try {
      const opportunity = await opportunityService.update(opportunityId, input)
      setOpportunities((current) => current.map((item) => item.id === opportunityId ? opportunity : item))
      setError(null)
      return { success: true, data: opportunity }
    } catch (updateError) {
      const message = getServiceErrorMessage(updateError, 'Não foi possível atualizar a oportunidade.')
      setError(message)
      return { success: false, message }
    }
  }, [])

  const patch = useCallback(async (
    opportunityId: number,
    input: OpportunityPatchRequest,
  ): Promise<ServiceResult<OpportunityResponse>> => {
    try {
      const opportunity = await opportunityService.patch(opportunityId, input)
      setOpportunities((current) => current.map((item) => item.id === opportunityId ? opportunity : item))
      setError(null)
      return { success: true, data: opportunity }
    } catch (patchError) {
      const message = getServiceErrorMessage(patchError, 'Não foi possível atualizar a oportunidade.')
      setError(message)
      return { success: false, message }
    }
  }, [])

  const remove = useCallback(async (opportunityId: number): Promise<ServiceResult<number>> => {
    try {
      await opportunityService.remove(opportunityId)
      setOpportunities((current) => current.filter((item) => item.id !== opportunityId))
      setError(null)
      return { success: true, data: opportunityId }
    } catch (removeError) {
      const message = getServiceErrorMessage(removeError, 'Não foi possível remover a oportunidade.')
      setError(message)
      return { success: false, message }
    }
  }, [])

  return { opportunities, isLoading, error, reload, create, update, patch, remove }
}
