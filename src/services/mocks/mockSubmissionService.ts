import type { SubmissionService } from '../submissionService'
import type { SubmissionResponse, SubmissionVersionResponse } from '../../types/domain'
import { readAuthSession } from '../sessionStorage'
import { initialMockProjects } from './projects'
import { initialMockDeliverables } from './deliverables'
import { simulateNetworkDelay } from './delay'
import { isArrayOf, readMockState, writeMockState } from './storage'

const SUBMISSIONS_STORAGE_KEY = 'oportuniza.mock.submissions.v2'
const VERSIONS_STORAGE_KEY = 'oportuniza.mock.submission-versions.v2'

const initialMockSubmissions: SubmissionResponse[] = [
  {
    id: 1,
    deliverableId: 1,
    studentId: 1,
    filePath: 'Plano_Trabalho_Mariana.pdf',
    submittedAt: '2026-03-14T12:00:00',
    status: 'APPROVED',
  },
  {
    id: 2,
    deliverableId: 2,
    studentId: 1,
    filePath: 'Relatorio_Parcial_Mariana.pdf',
    submittedAt: '2026-08-28T15:30:00',
    status: 'PENDING',
  },
  {
    id: 3,
    deliverableId: 3,
    studentId: 1,
    filePath: null,
    submittedAt: null,
    status: 'WAITING',
  },
  {
    id: 4,
    deliverableId: 4,
    studentId: 1,
    filePath: null,
    submittedAt: null,
    status: 'WAITING',
  },
  {
    id: 5,
    deliverableId: 5,
    studentId: 4,
    filePath: 'Prototipo_Painel_Ambiental_Matheus.pdf',
    submittedAt: '2026-11-12T10:30:00',
    status: 'PENDING',
  },
  {
    id: 7,
    deliverableId: 4,
    studentId: 3,
    filePath: 'Inventario_Fontes_Ana.pdf',
    submittedAt: '2026-09-18T09:15:00',
    status: 'REJECTED',
    feedback: 'Inclua as fontes oficiais e indique a metodologia de coleta.',
  },
  {
    id: 6,
    deliverableId: 6,
    studentId: 1,
    filePath: null,
    submittedAt: null,
    status: 'WAITING',
  },
]

function isSubmission(value: unknown): value is SubmissionResponse {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value && typeof value.id === 'number'
    && 'deliverableId' in value && typeof value.deliverableId === 'number'
    && 'studentId' in value && typeof value.studentId === 'number'
    && 'filePath' in value && (typeof value.filePath === 'string' || value.filePath === null)
    && 'submittedAt' in value && (typeof value.submittedAt === 'string' || value.submittedAt === null)
    && 'status' in value
    && ['WAITING', 'PENDING', 'APPROVED', 'REJECTED'].includes(String(value.status))
    && (!('feedback' in value) || typeof value.feedback === 'string' || value.feedback === null)
}

function isVersion(value: unknown): value is SubmissionVersionResponse {
  if (typeof value !== 'object' || value === null) return false
  return 'versionNumber' in value && typeof value.versionNumber === 'number'
    && 'filePath' in value && typeof value.filePath === 'string'
    && 'submittedAt' in value && typeof value.submittedAt === 'string'
}

function isVersionsBySubmission(value: unknown): value is Record<number, SubmissionVersionResponse[]> {
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).every((versions) => isArrayOf(versions, isVersion))
}

let submissions = readMockState(
  SUBMISSIONS_STORAGE_KEY,
  initialMockSubmissions,
  (value): value is SubmissionResponse[] => isArrayOf(value, isSubmission),
)
let versionsBySubmission = readMockState(
  VERSIONS_STORAGE_KEY,
  {
    1: [{ versionNumber: 1, filePath: 'Plano_Trabalho_Mariana.pdf', submittedAt: '2026-03-14T12:00:00' }],
    2: [{ versionNumber: 1, filePath: 'Relatorio_Parcial_Mariana.pdf', submittedAt: '2026-08-28T15:30:00' }],
    5: [{ versionNumber: 1, filePath: 'Prototipo_Painel_Ambiental_Matheus.pdf', submittedAt: '2026-11-12T10:30:00' }],
  },
  isVersionsBySubmission,
)

function save() {
  writeMockState(SUBMISSIONS_STORAGE_KEY, submissions)
  writeMockState(VERSIONS_STORAGE_KEY, versionsBySubmission)
}

function getVisibleProjectIds() {
  const session = readAuthSession()
  if (!session) throw new Error('Entre na plataforma para consultar as submissões.')
  return initialMockProjects
    .filter((project) => session.user.role === 'STUDENT'
      ? project.memberIds.includes(session.user.profile.id)
      : project.advisorIds.includes(session.user.profile.id))
    .map((project) => project.id)
}

export const mockSubmissionService: SubmissionService = {
  async list() {
    await simulateNetworkDelay()
    const session = readAuthSession()
    if (!session) throw new Error('Entre na plataforma para consultar as submissões.')
    if (session.user.role === 'STUDENT') {
      return structuredClone(submissions.filter((item) => item.studentId === session.user.profile.id))
    }

    const projectIds = getVisibleProjectIds()
    return structuredClone(submissions.filter((item) => {
      const deliverable = deliverableById(item.deliverableId)
      return deliverable !== undefined && projectIds.includes(deliverable.projectId)
    }))
  },

  async listByDeliverable(deliverableId) {
    await simulateNetworkDelay()
    const session = readAuthSession()
    const deliverable = deliverableById(deliverableId)
    if (!session || !deliverable || !getVisibleProjectIds().includes(deliverable.projectId)) {
      throw new Error('Você não pode consultar as submissões deste entregável.')
    }
    return structuredClone(session.user.role === 'STUDENT'
      ? submissions.filter((item) => item.deliverableId === deliverableId
        && item.studentId === session.user.profile.id)
      : submissions.filter((item) => item.deliverableId === deliverableId))
  },

  async versions(submissionId) {
    await simulateNetworkDelay()
    const submission = submissions.find((item) => item.id === submissionId)
    if (!submission || !isVisibleToCurrentUser(submission)) {
      throw new Error('Você não pode consultar as versões desta submissão.')
    }
    return structuredClone(versionsBySubmission[submissionId] ?? [])
  },

  async submit(deliverableId, filePath) {
    await simulateNetworkDelay()
    const session = readAuthSession()
    const deliverable = deliverableById(deliverableId)
    if (
      !session
      || session.user.role !== 'STUDENT'
      || !deliverable
      || !getVisibleProjectIds().includes(deliverable.projectId)
    ) {
      throw new Error('Somente discentes participantes podem enviar arquivos.')
    }
    if (!filePath.trim() || filePath.length > 255) {
      throw new Error('O nome do arquivo deve ter entre 1 e 255 caracteres.')
    }
    const previous = submissions.find((item) => (
      item.deliverableId === deliverableId && item.studentId === session.user.profile.id
    ))
    if (previous?.status === 'APPROVED') {
      throw new Error('Uma entrega aprovada não aceita novos envios.')
    }

    const submittedAt = new Date().toISOString()
    const updated: SubmissionResponse = {
      id: previous?.id ?? Math.max(0, ...submissions.map((item) => item.id)) + 1,
      deliverableId,
      studentId: session.user.profile.id,
      filePath: filePath.trim(),
      submittedAt,
      status: 'PENDING',
    }
    submissions = previous
      ? submissions.map((item) => item.id === previous.id ? updated : item)
      : [...submissions, updated]
    const previousVersions = versionsBySubmission[updated.id] ?? []
    versionsBySubmission = {
      ...versionsBySubmission,
      [updated.id]: [
        ...previousVersions,
        { versionNumber: previousVersions.length + 1, filePath: filePath.trim(), submittedAt },
      ],
    }
    save()
    return structuredClone(updated)
  },

  async review(submissionId, status, feedback) {
    await simulateNetworkDelay()
    const session = readAuthSession()
    const submission = submissions.find((item) => item.id === submissionId)
    if (!session || session.user.role !== 'PROFESSOR' || !submission || !isVisibleToCurrentUser(submission)) {
      throw new Error('Somente o docente responsável pode avaliar esta submissão.')
    }
    if (submission.status !== 'PENDING') {
      throw new Error('Somente submissões em análise podem ser avaliadas.')
    }
    if (status === 'REJECTED' && (!feedback?.trim())) {
      throw new Error('Informe um breve motivo para a rejeição.')
    }

    const updated: SubmissionResponse = {
      ...submission,
      status,
      feedback: status === 'REJECTED' ? feedback?.trim() : null,
    }
    submissions = submissions.map((item) => item.id === submissionId ? updated : item)
    save()
    return structuredClone(updated)
  },
}

function deliverableById(deliverableId: number) {
  const stored = localStorage.getItem('oportuniza.mock.deliverables.v2')
  if (stored) {
    try {
      const deliverables: unknown = JSON.parse(stored)
      if (!Array.isArray(deliverables) || !deliverables.every(isDeliverable)) {
        throw new Error('O estado mockado dos entregáveis possui um formato inválido.')
      }
      return deliverables.find((item) => item.id === deliverableId)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('O estado mockado dos entregáveis está corrompido.')
      }
      throw error
    }
  }
  return initialMockDeliverables.find((item) => item.id === deliverableId)
}

function isVisibleToCurrentUser(submission: SubmissionResponse) {
  const session = readAuthSession()
  if (!session) return false
  if (session.user.role === 'STUDENT') return submission.studentId === session.user.profile.id
  const deliverable = deliverableById(submission.deliverableId)
  return Boolean(deliverable && getVisibleProjectIds().includes(deliverable.projectId))
}

function isDeliverable(value: unknown): value is { id: number; projectId: number } {
  return typeof value === 'object'
    && value !== null
    && 'id' in value
    && typeof value.id === 'number'
    && 'projectId' in value
    && typeof value.projectId === 'number'
}
