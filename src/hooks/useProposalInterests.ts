import axios from 'axios'
import { useCallback, useState } from 'react'
import { getServiceErrorMessage } from '../services/errorMessage'
import { proposalInterestService } from '../services/proposalInterestService'
import type { ProposalInterestResponse } from '../types/domain'
import type { ServiceResult } from '../services/result'

function isAbortError(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError'))
}

export function useProposalInterests() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createForProposal = useCallback(async (
    projectProposalId: number,
  ): Promise<ServiceResult<ProposalInterestResponse>> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const interest = await proposalInterestService.createForProposal(projectProposalId)
      return { success: true, data: interest }
    } catch (submitError: unknown) {
      if (!isAbortError(submitError)) {
        const message = getServiceErrorMessage(
          submitError,
          'Não foi possível registrar seu interesse na proposta.',
        )
        setError(message)
        return { success: false, message }
      }
      return { success: false, message: 'Request cancelled' }
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { createForProposal, isSubmitting, error }
}
