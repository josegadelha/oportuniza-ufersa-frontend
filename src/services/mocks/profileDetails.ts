import type { ProfessorProfileExtras, StudentProfileExtras } from '../../types/domain'

export interface MockProfileExtrasByRole {
  STUDENT: StudentProfileExtras
  PROFESSOR: ProfessorProfileExtras
}

export const initialMockProfileExtras: MockProfileExtrasByRole = {
  STUDENT: {
    skills: ['Python', 'React', 'Visão computacional', 'Figma'],
    interests: ['Inteligência artificial', 'Acessibilidade digital', 'Tecnologia em saúde'],
  },
  PROFESSOR: {
    researchAreas: ['Inteligência artificial', 'Visão computacional', 'Informática em saúde'],
    researchLines: ['Aprendizado de máquina aplicado à saúde', 'Tecnologias assistivas e acessibilidade'],
  },
}
