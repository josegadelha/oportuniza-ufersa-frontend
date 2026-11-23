import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { getServiceErrorMessage } from '../services/errorMessage'
import { useNotificationActions } from './useNotificationActions'
import { useAuth } from './useAuth'
import { candidacyService } from '../services/candidacyService'
import { opportunityService } from '../services/opportunityService'
import { projectProposalService } from '../services/projectProposalService'
import { proposalInterestService } from '../services/proposalInterestService'
import { projectService } from '../services/projectService'
import { deliverableService } from '../services/deliverableService'
import { submissionService } from '../services/submissionService'
import { userService } from '../services/userService'
import type {
  CandidacyResponse,
  CandidacyStatus,
  DeliverableCreateRequest,
  DeliverableResponse,
  NotificationCreateRequest,
  OpportunityCreateRequest,
  OpportunityResponse,
  OpportunityPatchRequest,
  OpportunityStatus,
  ProjectProposalCard,
  ProposalInterestResponse,
  ProposalInterestStatus,
  ProjectResponse,
  SubmissionResponse,
  UserProfile,
  UserRole,
} from '../types/domain'
import type { ServiceResult } from '../services/result'

export interface ManagementPerson {
  name: string
  role: UserRole
}

export interface MyProjectsData {
  candidacies: CandidacyResponse[]
  candidaciesByOpportunity: Record<number, CandidacyResponse[]>
  opportunities: OpportunityResponse[]
  proposals: ProjectProposalCard[]
  proposalInterests: ProposalInterestResponse[]
  projects: ProjectResponse[]
  deliverables: DeliverableResponse[]
  submissions: SubmissionResponse[]
  people: Record<number, ManagementPerson>
}

const candidacyNotificationLabels: Record<Exclude<CandidacyStatus, 'WITHDRAWN'>, string> = {
  IN_SELECTION: 'em seleção',
  HISTORY_REVIEW: 'em análise de histórico',
  INTERVIEW: 'na etapa de entrevista',
  FINAL_REVIEW: 'na avaliação final',
  APPROVED: 'aprovada',
  REJECTED: 'não selecionada',
}

const emptyData: MyProjectsData = {
  candidacies: [],
  candidaciesByOpportunity: {},
  opportunities: [],
  proposals: [],
  proposalInterests: [],
  projects: [],
  deliverables: [],
  submissions: [],
  people: {},
}

function isAbortError(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError'))
}

function isPendingCandidacy(status: CandidacyStatus) {
  return status !== 'APPROVED' && status !== 'REJECTED' && status !== 'WITHDRAWN'
}

async function loadPeople(ids: number[], currentUser: UserProfile) {
  const people: Record<number, ManagementPerson> = {}
  const uniqueIds = [...new Set(ids)]
  await Promise.all(uniqueIds.map(async (id) => {
    if (id === currentUser.profile.id) {
      people[id] = { name: currentUser.profile.name, role: currentUser.role }
      return
    }

    try {
      const profile = await userService.getProfileById(id)
      people[id] = { name: profile.profile.name, role: profile.role }
    } catch {
      return
    }
  }))
  return people
}

function replaceCandidacy(data: MyProjectsData, updated: CandidacyResponse): MyProjectsData {
  const candidaciesByOpportunity = Object.fromEntries(
    Object.entries(data.candidaciesByOpportunity).map(([opportunityId, items]) => [
      Number(opportunityId),
      items.map((item) => item.id === updated.id ? updated : item),
    ]),
  )

  return {
    ...data,
    candidacies: data.candidacies.map((item) => item.id === updated.id ? updated : item),
    candidaciesByOpportunity,
  }
}

export function useMyProjects() {
  const { user } = useAuth()
  const { createNotification } = useNotificationActions()
  const [data, setData] = useState<MyProjectsData>(emptyData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notificationError, setNotificationError] = useState<string | null>(null)

  const loadData = useCallback(async (signal?: AbortSignal): Promise<MyProjectsData> => {
    if (!user) return emptyData

    try {
      const [proposalInterests, projects, deliverables, submissions] = await Promise.all([
        proposalInterestService.list(signal),
        projectService.list(signal),
        deliverableService.list(signal),
        submissionService.list(signal),
      ])

      let candidacies: CandidacyResponse[] = []
      let candidaciesByOpportunity: Record<number, CandidacyResponse[]> = {}
      let opportunities: OpportunityResponse[] = []
      let proposals: ProjectProposalCard[] = []

      if (user.role === 'STUDENT') {
        [candidacies, opportunities, proposals] = await Promise.all([
          candidacyService.listByStudent(signal),
          opportunityService.list(signal),
          projectProposalService.list(signal),
        ])
      } else {
        [opportunities, proposals] = await Promise.all([
          opportunityService.listByProfessor(signal),
          projectProposalService.list(signal),
        ])
        const candidacyGroups = await Promise.all(
          opportunities.map(async (opportunity) => ({
            opportunityId: opportunity.id,
            items: await candidacyService.listByOpportunity(opportunity.id, signal),
          })),
        )
        candidaciesByOpportunity = Object.fromEntries(
          candidacyGroups.map(({ opportunityId, items }) => [opportunityId, items]),
        )
        candidacies = candidacyGroups.flatMap(({ items }) => items)
      }

      const personIds = [
        ...opportunities.map((opportunity) => opportunity.professorId),
        ...proposals.flatMap((proposal) => proposal.authorIds),
        ...candidacies.map((candidacy) => candidacy.studentId),
        ...proposalInterests.map((interest) => interest.userId),
        ...projects.flatMap((project) => [...project.advisorIds, ...project.memberIds]),
        ...submissions.map((submission) => submission.studentId),
      ]
      const people = await loadPeople(personIds, user)

      return {
        candidacies,
        candidaciesByOpportunity,
        opportunities,
        proposals,
        proposalInterests,
        projects,
        deliverables,
        submissions,
        people,
      }
    } catch (loadError: unknown) {
      throw new Error(getServiceErrorMessage(loadError, 'Não foi possível carregar seu painel.'))
    }
  }, [user])

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setData(await loadData())
    } catch (loadError: unknown) {
      if (!isAbortError(loadError)) {
        setError(getServiceErrorMessage(loadError, 'Não foi possível carregar seu painel.'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [loadData])

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
      .then((loadedData) => {
        setData(loadedData)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!isAbortError(loadError)) {
          setError(getServiceErrorMessage(loadError, 'Não foi possível carregar seu painel.'))
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
    return () => {
      controller.abort()
    }
  }, [loadData])

  const sendNotification = useCallback(async (input: NotificationCreateRequest) => {
    const result = await createNotification(input)
    setNotificationError(result.success ? null : result.message)
  }, [createNotification])

  const cancelCandidacy = useCallback(async (
    candidacyId: number,
  ): Promise<ServiceResult<CandidacyResponse>> => {
    const candidacy = data.candidacies.find((item) => item.id === candidacyId)
    if (!user || user.role !== 'STUDENT' || !candidacy || !isPendingCandidacy(candidacy.status)) {
      return { success: false, message: 'Esta candidatura não pode ser cancelada.' }
    }

    try {
      const updated = await candidacyService.patch(candidacyId, { status: 'WITHDRAWN' })
      setData((current) => replaceCandidacy(current, updated))
      const opportunity = data.opportunities.find((item) => item.id === candidacy.opportunityId)
      await sendNotification({
        title: 'Candidatura cancelada',
        message: `Sua candidatura em '${opportunity?.title ?? 'uma oportunidade'}' foi cancelada.`,
        type: 'SELECTION_PROCESS_UPDATE',
        recipientId: user.profile.id,
      })
      return { success: true, data: updated }
    } catch (actionError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(actionError, 'Não foi possível cancelar a candidatura.'),
      }
    }
  }, [data.candidacies, data.opportunities, sendNotification, user])

  const reviewCandidacy = useCallback(async (
    candidacyId: number,
    status: Exclude<CandidacyStatus, 'WITHDRAWN'>,
    message?: string,
  ): Promise<ServiceResult<CandidacyResponse>> => {
    const candidacy = data.candidacies.find((item) => item.id === candidacyId)
    if (!user || user.role !== 'PROFESSOR' || !candidacy || !isPendingCandidacy(candidacy.status)) {
      return { success: false, message: 'Esta candidatura não pode ser atualizada.' }
    }

    try {
      const updated = await candidacyService.patch(candidacyId, { status })
      setData((current) => replaceCandidacy(current, updated))
      const opportunity = data.opportunities.find((item) => item.id === candidacy.opportunityId)
      const approved = status === 'APPROVED'
      const rejected = status === 'REJECTED'
      await sendNotification({
        title: approved
          ? 'Candidatura aprovada'
          : rejected
            ? 'Atualização da candidatura'
            : 'Fase da candidatura atualizada',
        message: message?.trim()
          || `Sua candidatura em '${opportunity?.title ?? 'uma oportunidade'}' está ${candidacyNotificationLabels[status]}.`,
        type: 'SELECTION_PROCESS_UPDATE',
        recipientId: candidacy.studentId,
      })
      return { success: true, data: updated }
    } catch (actionError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(actionError, 'Não foi possível atualizar a candidatura.'),
      }
    }
  }, [data.candidacies, data.opportunities, sendNotification, user])

  const reviewProposalInterest = useCallback(async (
    interestId: number,
    status: Extract<ProposalInterestStatus, 'ACCEPTED' | 'REJECTED'>,
  ): Promise<ServiceResult<ProposalInterestResponse>> => {
    const interest = data.proposalInterests.find((item) => item.id === interestId)
    const proposal = interest
      ? data.proposals.find((item) => item.id === interest.projectProposalId)
      : undefined
    if (
      !user
      || user.role !== 'STUDENT'
      || !interest
      || !proposal
      || proposal.studentId !== user.profile.id
      || interest.status !== 'PENDING'
    ) {
      return { success: false, message: 'Esta solicitação não pode ser atualizada.' }
    }

    try {
      const updated = await proposalInterestService.updateStatus(interestId, status)
      setData((current) => ({
        ...current,
        proposalInterests: current.proposalInterests.map((item) => (
          item.id === interestId ? updated : item
        )),
      }))
      const accepted = status === 'ACCEPTED'
      await sendNotification({
        title: accepted ? 'Colaboração aceita' : 'Solicitação recusada',
        message: accepted
          ? `Sua solicitação para colaborar em '${proposal.title}' foi aceita.`
          : `Sua solicitação para colaborar em '${proposal.title}' foi recusada.`,
        type: 'PITCH_INTEREST',
        recipientId: interest.userId,
      })
      return { success: true, data: updated }
    } catch (actionError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(actionError, 'Não foi possível atualizar a solicitação.'),
      }
    }
  }, [data.proposalInterests, data.proposals, sendNotification, user])

  const closeProposal = useCallback(async (
    proposalId: number,
  ): Promise<ServiceResult<ProjectProposalCard>> => {
    const proposal = data.proposals.find((item) => item.id === proposalId)
    if (!user || user.role !== 'STUDENT' || !proposal || proposal.studentId !== user.profile.id) {
      return { success: false, message: 'Você não pode encerrar esta proposta.' }
    }

    try {
      const result = await projectProposalService.patch(proposalId, { status: 'CLOSED' })
      const updated = {
        ...proposal,
        ...result,
        category: result.category ?? proposal.category,
        seeksAdvisor: result.seeksAdvisor ?? proposal.seeksAdvisor,
        authorIds: result.authorIds.length ? result.authorIds : proposal.authorIds,
      }
      setData((current) => ({
        ...current,
        proposals: current.proposals.map((item) => item.id === proposalId ? updated : item),
      }))
      return { success: true, data: updated }
    } catch (actionError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(actionError, 'Não foi possível encerrar a proposta.'),
      }
    }
  }, [data.proposals, user])

  const updateOpportunityStatus = useCallback(async (
    opportunityId: number,
    status: Extract<OpportunityStatus, 'OPEN' | 'CLOSED'>,
  ): Promise<ServiceResult<OpportunityResponse>> => {
    const opportunity = data.opportunities.find((item) => item.id === opportunityId)
    if (!user || user.role !== 'PROFESSOR' || !opportunity) {
      return { success: false, message: 'Você não pode atualizar esta oportunidade.' }
    }

    try {
      const updated = await opportunityService.patch(opportunityId, { status })
      setData((current) => ({
        ...current,
        opportunities: current.opportunities.map((item) => (
          item.id === opportunityId ? updated : item
        )),
      }))
      return { success: true, data: updated }
    } catch (actionError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(actionError, 'Não foi possível atualizar a oportunidade.'),
      }
    }
  }, [data.opportunities, user])

  const editOpportunity = useCallback(async (
    opportunityId: number,
    input: OpportunityPatchRequest,
  ): Promise<ServiceResult<OpportunityResponse>> => {
    const opportunity = data.opportunities.find((item) => item.id === opportunityId)
    if (!user || user.role !== 'PROFESSOR' || !opportunity) {
      return { success: false, message: 'Você não pode atualizar esta oportunidade.' }
    }

    try {
      const updated = await opportunityService.patch(opportunityId, input)
      setData((current) => ({
        ...current,
        opportunities: current.opportunities.map((item) => (
          item.id === opportunityId ? updated : item
        )),
      }))
      return { success: true, data: updated }
    } catch (actionError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(actionError, 'Não foi possível editar a oportunidade.'),
      }
    }
  }, [data.opportunities, user])

  const createOpportunity = useCallback(async (
    input: OpportunityCreateRequest,
  ): Promise<ServiceResult<OpportunityResponse>> => {
    if (!user || user.role !== 'PROFESSOR') {
      return { success: false, message: 'Somente docentes podem criar oportunidades.' }
    }

    try {
      const created = await opportunityService.create(input)
      setData((current) => ({
        ...current,
        opportunities: [created, ...current.opportunities],
      }))
      await sendNotification({
        title: 'Oportunidade publicada',
        message: `Sua oportunidade '${created.title}' foi publicada com sucesso.`,
        type: 'SELECTION_PROCESS_UPDATE',
      })
      return { success: true, data: created }
    } catch (actionError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(actionError, 'Não foi possível criar a oportunidade.'),
      }
    }
  }, [sendNotification, user])

  const createDeliverable = useCallback(async (
    projectId: number,
    input: DeliverableCreateRequest,
  ): Promise<ServiceResult<DeliverableResponse>> => {
    if (!user || user.role !== 'PROFESSOR') {
      return { success: false, message: 'Somente docentes podem criar entregáveis.' }
    }

    try {
      const created = await deliverableService.createForProject(projectId, input)
      setData((current) => ({
        ...current,
        deliverables: [...current.deliverables, created],
      }))
      return { success: true, data: created }
    } catch (actionError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(actionError, 'Não foi possível criar o entregável.'),
      }
    }
  }, [user])

  const submitDeliverable = useCallback(async (
    deliverableId: number,
    filePath: string,
  ): Promise<ServiceResult<SubmissionResponse>> => {
    if (!user || user.role !== 'STUDENT') {
      return { success: false, message: 'Somente discentes podem enviar entregáveis.' }
    }

    try {
      const submission = await submissionService.submit(deliverableId, filePath)
      setData((current) => ({
        ...current,
        submissions: [
          submission,
          ...current.submissions.filter((item) => item.id !== submission.id),
        ],
      }))
      const projectId = data.deliverables.find((item) => item.id === deliverableId)?.projectId
      const project = data.projects.find((item) => item.id === projectId)
      const advisorId = project?.advisorIds[0]
      if (advisorId) {
        await sendNotification({
          title: 'Novo arquivo enviado',
          message: `${user.profile.name} enviou '${filePath}' para um entregável do projeto.`,
          type: 'SELECTION_PROCESS_UPDATE',
          recipientId: advisorId,
        })
      }
      return { success: true, data: submission }
    } catch (actionError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(actionError, 'Não foi possível enviar o arquivo.'),
      }
    }
  }, [data.deliverables, data.projects, sendNotification, user])

  const reviewSubmission = useCallback(async (
    submissionId: number,
    status: 'APPROVED' | 'REJECTED',
    feedback?: string,
  ): Promise<ServiceResult<SubmissionResponse>> => {
    if (!user || user.role !== 'PROFESSOR') {
      return { success: false, message: 'Somente docentes podem avaliar submissões.' }
    }

    try {
      const updated = await submissionService.review(submissionId, status, feedback)
      setData((current) => ({
        ...current,
        submissions: current.submissions.map((item) => item.id === submissionId ? updated : item),
      }))
      return { success: true, data: updated }
    } catch (actionError: unknown) {
      return {
        success: false,
        message: getServiceErrorMessage(actionError, 'Não foi possível avaliar a submissão.'),
      }
    }
  }, [user])

  return {
    user,
    data,
    isLoading,
    error,
    notificationError,
    reload,
    cancelCandidacy,
    reviewCandidacy,
    reviewProposalInterest,
    closeProposal,
    updateOpportunityStatus,
    editOpportunity,
    createOpportunity,
    createDeliverable,
    submitDeliverable,
    reviewSubmission,
  }
}
