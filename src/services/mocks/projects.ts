import type { ProjectResponse } from '../../types/domain'
import { MOCK_USER_IDS } from './users'

export const initialMockProjects: ProjectResponse[] = [
  {
    id: 1,
    title: 'Tecnologias assistivas para acessibilidade no campus',
    startDate: '2026-03-01',
    endDate: null,
    status: 'ACTIVE',
    advisorIds: [MOCK_USER_IDS.professor],
    memberIds: [MOCK_USER_IDS.student, MOCK_USER_IDS.studentAccessibility],
  },
  {
    id: 2,
    title: 'Painel de dados ambientais do semiárido',
    startDate: '2026-05-15',
    endDate: null,
    status: 'ACTIVE',
    advisorIds: [MOCK_USER_IDS.professor],
    memberIds: [MOCK_USER_IDS.student, MOCK_USER_IDS.studentAgriTech, MOCK_USER_IDS.studentRobotics],
  },
]
