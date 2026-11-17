import type { ProjectProposalCard } from '../../types/domain'
import { MOCK_USER_IDS } from './users'

export const initialMockProjectProposals: ProjectProposalCard[] = [
  {
    id: 1,
    studentId: MOCK_USER_IDS.student,
    title: 'Mapa colaborativo de acessibilidade no campus',
    description:
      'Criar um mapa colaborativo para identificar rotas acessíveis, rampas e barreiras arquitetônicas na UFERSA, com atualizações feitas pela própria comunidade acadêmica.',
    status: 'OPEN',
    publishedAt: '2026-11-14T09:00:00',
    desiredSkills: ['React Native', 'UX Research', 'Acessibilidade digital'],
    category: 'EXTENSION',
    seeksAdvisor: true,
    authorIds: [MOCK_USER_IDS.student, MOCK_USER_IDS.studentAccessibility],
  },
  {
    id: 2,
    studentId: MOCK_USER_IDS.studentAgriTech,
    title: 'Sensores de baixo custo para monitoramento de irrigação',
    description:
      'Investigar como sensores acessíveis podem acompanhar a umidade do solo e ajudar pequenos produtores da região a reduzir o desperdício de água.',
    status: 'OPEN',
    publishedAt: '2026-11-12T14:20:00',
    desiredSkills: ['Python', 'Arduino', 'Agricultura de precisão'],
    category: 'RESEARCH',
    seeksAdvisor: true,
    authorIds: [MOCK_USER_IDS.studentAgriTech],
  },
  {
    id: 3,
    studentId: MOCK_USER_IDS.studentInnovation,
    title: 'Materiais sustentáveis para mobiliário dos espaços acadêmicos',
    description:
      'Prototipar peças de mobiliário para áreas de convivência usando materiais reaproveitados e avaliar sua durabilidade e viabilidade de produção no campus.',
    status: 'IN_PROGRESS',
    publishedAt: '2026-11-10T11:30:00',
    desiredSkills: ['Modelagem 3D', 'Prototipagem', 'Pesquisa de materiais'],
    category: 'INNOVATION',
    seeksAdvisor: false,
    authorIds: [MOCK_USER_IDS.studentInnovation, MOCK_USER_IDS.studentRobotics],
  },
  {
    id: 4,
    studentId: MOCK_USER_IDS.studentRobotics,
    title: 'Oficinas de robótica educacional com kits acessíveis',
    description:
      'Organizar oficinas introdutórias de robótica para escolas públicas da região, com atividades práticas e materiais de baixo custo desenvolvidos por estudantes.',
    status: 'OPEN',
    publishedAt: '2026-11-08T16:00:00',
    desiredSkills: ['Arduino', 'Python', 'Educação inclusiva'],
    category: 'EXTENSION',
    seeksAdvisor: true,
    authorIds: [MOCK_USER_IDS.studentRobotics, MOCK_USER_IDS.studentAccessibility],
  },
  {
    id: 5,
    studentId: MOCK_USER_IDS.student,
    title: 'Plataforma de apoio a projetos de pesquisa estudantis',
    description:
      'Desenvolver uma aplicação para organizar cronogramas, materiais e entregas de projetos acadêmicos da UFERSA, aproximando estudantes e docentes orientadores.',
    status: 'IN_PROGRESS',
    publishedAt: '2026-11-13T10:45:00',
    desiredSkills: ['React', 'TypeScript', 'Acessibilidade web'],
    category: 'INNOVATION',
    seeksAdvisor: true,
    authorIds: [MOCK_USER_IDS.student],
  },
  {
    id: 6,
    studentId: MOCK_USER_IDS.student,
    title: 'Visualização de dados abertos sobre saúde no semiárido',
    description:
      'Criar painéis interativos com dados públicos para facilitar a análise de indicadores de saúde e apoiar ações de pesquisa e extensão.',
    status: 'OPEN',
    publishedAt: '2026-11-11T13:15:00',
    desiredSkills: ['Python', 'Visualização de dados', 'Estatística'],
    category: 'RESEARCH',
    seeksAdvisor: true,
    authorIds: [MOCK_USER_IDS.student],
  },
  {
    id: 7,
    studentId: MOCK_USER_IDS.studentAccessibility,
    title: 'Guia digital de acessibilidade para atividades acadêmicas',
    description:
      'Reunir orientações práticas para produzir materiais de aula acessíveis e apoiar a participação de estudantes com diferentes necessidades.',
    status: 'CLOSED',
    publishedAt: '2026-10-28T08:30:00',
    desiredSkills: ['Design inclusivo', 'Figma', 'Produção de conteúdo'],
    category: 'EXTENSION',
    seeksAdvisor: false,
    authorIds: [MOCK_USER_IDS.studentAccessibility],
  },
]
