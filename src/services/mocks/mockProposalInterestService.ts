import type { ProposalInterestResponse, ProposalInterestStatus } from '../../types/domain'
import type { ProposalInterestService } from '../proposalInterestService'
import { readAuthSession } from '../sessionStorage'
import { simulateNetworkDelay } from './delay'
import { isArrayOf, readMockState, writeMockState } from './storage'
import { MOCK_USER_IDS } from './users'

const STORAGE_KEY = 'oportuniza.mock.proposal-interests.v2'

const initialMockProposalInterests: ProposalInterestResponse[] = [
  {
    id: 1,
    projectProposalId: 1,
    userId: MOCK_USER_IDS.professor,
    status: 'ACCEPTED',
    createdAt: '2026-11-14T16:00:00',
  },
  {
    id: 2,
    projectProposalId: 1,
    userId: MOCK_USER_IDS.studentAccessibility,
    status: 'PENDING',
    createdAt: '2026-11-14T17:10:00',
  },
  {
    id: 3,
    projectProposalId: 1,
    userId: MOCK_USER_IDS.studentRobotics,
    status: 'ACCEPTED',
    createdAt: '2026-11-15T08:20:00',
  },
  {
    id: 4,
    projectProposalId: 5,
    userId: MOCK_USER_IDS.professor,
    status: 'PENDING',
    createdAt: '2026-11-14T12:30:00',
  },
  {
    id: 5,
    projectProposalId: 5,
    userId: MOCK_USER_IDS.studentAgriTech,
    status: 'PENDING',
    createdAt: '2026-11-14T13:15:00',
  },
  {
    id: 6,
    projectProposalId: 5,
    userId: MOCK_USER_IDS.studentInnovation,
    status: 'ACCEPTED',
    createdAt: '2026-11-14T15:40:00',
  },
  {
    id: 7,
    projectProposalId: 6,
    userId: MOCK_USER_IDS.studentAccessibility,
    status: 'PENDING',
    createdAt: '2026-11-12T10:20:00',
  },
  {
    id: 8,
    projectProposalId: 6,
    userId: MOCK_USER_IDS.studentRobotics,
    status: 'ACCEPTED',
    createdAt: '2026-11-12T11:00:00',
  },
  {
    id: 9,
    projectProposalId: 2,
    userId: MOCK_USER_IDS.professor,
    status: 'PENDING',
    createdAt: '2026-11-13T09:30:00',
  },
]

function isProposalInterest(value: unknown): value is ProposalInterestResponse {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value
    && typeof value.id === 'number'
    && 'projectProposalId' in value
    && typeof value.projectProposalId === 'number'
    && 'userId' in value
    && typeof value.userId === 'number'
    && 'status' in value
    && (value.status === 'PENDING' || value.status === 'ACCEPTED' || value.status === 'REJECTED')
    && 'createdAt' in value
    && typeof value.createdAt === 'string'
}

let interests = readMockState(
  STORAGE_KEY,
  initialMockProposalInterests,
  (value): value is ProposalInterestResponse[] => isArrayOf(value, isProposalInterest),
)

export const mockProposalInterestService: ProposalInterestService = {
  async list() {
    await simulateNetworkDelay()
    return structuredClone(interests)
  },

  async listByProposal(projectProposalId) {
    await simulateNetworkDelay()
    return structuredClone(interests.filter((interest) => (
      interest.projectProposalId === projectProposalId
    )))
  },

  async createForProposal(projectProposalId) {
    await simulateNetworkDelay()
    const session = readAuthSession()
    if (!session) throw new Error('Entre na plataforma para registrar interesse na proposta.')

    const currentInterest = interests.find(
      (interest) => interest.projectProposalId === projectProposalId
        && interest.userId === session.user.profile.id,
    )
    if (currentInterest) return structuredClone(currentInterest)

    const interest: ProposalInterestResponse = {
      id: Math.max(0, ...interests.map((item) => item.id)) + 1,
      projectProposalId,
      userId: session.user.profile.id,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    }
    interests = [...interests, interest]
    writeMockState(STORAGE_KEY, interests)
    return structuredClone(interest)
  },

  async updateStatus(interestId: number, status: ProposalInterestStatus) {
    await simulateNetworkDelay()
    const currentInterest = interests.find((interest) => interest.id === interestId)
    if (!currentInterest) throw new Error('Interesse na proposta não encontrado.')
    if (currentInterest.status !== 'PENDING') {
      throw new Error('Este interesse já foi respondido.')
    }

    const updatedInterest = { ...currentInterest, status }
    interests = interests.map((interest) => (
      interest.id === interestId ? updatedInterest : interest
    ))
    writeMockState(STORAGE_KEY, interests)
    return structuredClone(updatedInterest)
  },
}
