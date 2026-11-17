import { useCallback, useEffect, useState } from 'react'
import { getServiceErrorMessage } from '../services/errorMessage'
import { projectProposalService } from '../services/projectProposalService'
import type {
  ProjectProposalCard,
  ProjectProposalCreateRequest,
  ProjectProposalPatchRequest,
} from '../types/domain'
import type { ServiceResult } from '../services/result'

export function useProjectProposals() {
  const [proposals, setProposals] = useState<ProjectProposalCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setProposals(await projectProposalService.list())
    } catch (loadError: unknown) {
      setError(getServiceErrorMessage(loadError, 'Não foi possível carregar as propostas de alunos.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true
    projectProposalService.list()
      .then((items) => {
        if (isCurrent) setProposals(items)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(getServiceErrorMessage(loadError, 'Não foi possível carregar as propostas de alunos.'))
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const create = useCallback(async (
    input: ProjectProposalCreateRequest,
  ): Promise<ServiceResult<ProjectProposalCard>> => {
    try {
      const proposal = await projectProposalService.create(input)
      setProposals((current) => [
        proposal,
        ...current.filter((item) => item.id !== proposal.id),
      ])
      setError(null)
      return { success: true, data: proposal }
    } catch (createError: unknown) {
      const message = getServiceErrorMessage(
        createError,
        'Não foi possível publicar sua proposta.',
      )
      setError(message)
      return { success: false, message }
    }
  }, [])

  const patch = useCallback(async (
    proposalId: number,
    input: ProjectProposalPatchRequest,
  ): Promise<ServiceResult<ProjectProposalCard>> => {
    try {
      const proposal = await projectProposalService.patch(proposalId, input)
      setProposals((current) => current.map((item) => (
        item.id === proposalId
          ? {
            ...item,
            ...proposal,
            category: proposal.category ?? item.category,
            seeksAdvisor: proposal.seeksAdvisor ?? item.seeksAdvisor,
            authorIds: proposal.authorIds.length ? proposal.authorIds : item.authorIds,
          }
          : item
      )))
      setError(null)
      return { success: true, data: proposal }
    } catch (patchError: unknown) {
      const message = getServiceErrorMessage(
        patchError,
        'Não foi possível atualizar a proposta.',
      )
      setError(message)
      return { success: false, message }
    }
  }, [])

  return { proposals, isLoading, error, reload, create, patch }
}
