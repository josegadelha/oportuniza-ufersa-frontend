import type { Course, Department } from '../types/domain'

export const courseLabels: Record<Course, string> = {
  CIENCIA_DA_COMPUTACAO: 'Ciência da Computação',
  ENGENHARIA_DE_SOFTWARE: 'Engenharia de Software',
  ENGENHARIA_DA_COMPUTACAO: 'Engenharia da Computação',
  SISTEMAS_DE_INFORMACAO: 'Sistemas de Informação',
  ENGENHARIA_CIVIL: 'Engenharia Civil',
  ENGENHARIA_ELETRICA: 'Engenharia Elétrica',
  ENGENHARIA_MECANICA: 'Engenharia Mecânica',
  ENGENHARIA_QUIMICA: 'Engenharia Química',
  ADMINISTRACAO: 'Administração',
  DIREITO: 'Direito',
  MEDICINA: 'Medicina',
  OUTRO: 'Outro curso',
}

export const departmentLabels: Record<Department, string> = {
  COMPUTACAO: 'Computação',
  ENGENHARIAS: 'Engenharias',
  CIENCIAS_EXATAS: 'Ciências Exatas',
  CIENCIAS_HUMANAS: 'Ciências Humanas',
  CIENCIAS_SOCIAIS: 'Ciências Sociais',
  CIENCIAS_AGRARIAS: 'Ciências Agrárias',
  CIENCIAS_DA_SAUDE: 'Ciências da Saúde',
  OUTRO: 'Outro departamento',
}

export const courses: Course[] = [
  'CIENCIA_DA_COMPUTACAO',
  'ENGENHARIA_DE_SOFTWARE',
  'ENGENHARIA_DA_COMPUTACAO',
  'SISTEMAS_DE_INFORMACAO',
  'ENGENHARIA_CIVIL',
  'ENGENHARIA_ELETRICA',
  'ENGENHARIA_MECANICA',
  'ENGENHARIA_QUIMICA',
  'ADMINISTRACAO',
  'DIREITO',
  'MEDICINA',
  'OUTRO',
]

export const departments: Department[] = [
  'COMPUTACAO',
  'ENGENHARIAS',
  'CIENCIAS_EXATAS',
  'CIENCIAS_HUMANAS',
  'CIENCIAS_SOCIAIS',
  'CIENCIAS_AGRARIAS',
  'CIENCIAS_DA_SAUDE',
  'OUTRO',
]
