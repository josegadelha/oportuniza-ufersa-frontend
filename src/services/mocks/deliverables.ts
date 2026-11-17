import type { DeliverableResponse } from '../../types/domain'

export const initialMockDeliverables: DeliverableResponse[] = [
  {
    id: 1,
    projectId: 1,
    title: 'Plano de Trabalho Inicial',
    deadline: '2026-03-15',
  },
  {
    id: 2,
    projectId: 1,
    title: 'Relatório Parcial do Projeto',
    deadline: '2026-08-30',
  },
  {
    id: 3,
    projectId: 1,
    title: 'Resumo Expandido ou Artigo Final',
    deadline: '2026-11-30',
  },
  {
    id: 4,
    projectId: 2,
    title: 'Inventário de dados e fontes',
    deadline: '2026-09-20',
  },
  {
    id: 5,
    projectId: 2,
    title: 'Protótipo do painel interativo',
    deadline: '2026-11-25',
  },
  {
    id: 6,
    projectId: 2,
    title: 'Relatório de validação com usuários',
    deadline: '2026-12-15',
  },
]
