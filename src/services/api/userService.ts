import { api } from './api'
import type {
  ProfessorProfileDetails,
  ProfessorProfileUpdate,
  StudentProfileDetails,
  StudentProfileUpdate,
  UserProfileDetails,
  UserRole,
} from '../../types/domain'
import type { UserService } from '../userService'
import { readAuthSession } from '../sessionStorage'

export const userService: UserService = {
  supportsExtendedProfileFields: false,

  async getCurrentProfile(role: UserRole): Promise<UserProfileDetails> {
    if (role === 'STUDENT') {
      const { data } = await api.get<StudentProfileDetails['profile']>('/students')
      return { role, profile: data, extras: { skills: [], interests: [] } }
    }

    const { data } = await api.get<ProfessorProfileDetails['profile']>('/professors')
    return { role, profile: data, extras: { researchAreas: [], researchLines: [] } }
  },

  async getProfileById(profileId: number): Promise<UserProfileDetails> {
    const session = readAuthSession()
    if (!session || session.user.profile.id !== profileId) {
      throw new Error('O backend atual ainda não disponibiliza consulta pública de perfis.')
    }
    if (session.user.role === 'STUDENT') {
      const { data } = await api.get<StudentProfileDetails['profile']>('/students')
      return { role: 'STUDENT', profile: data, extras: { skills: [], interests: [] } }
    }

    const { data } = await api.get<ProfessorProfileDetails['profile']>('/professors')
    return { role: 'PROFESSOR', profile: data, extras: { researchAreas: [], researchLines: [] } }
  },

  async patchStudent(input: StudentProfileUpdate): Promise<StudentProfileDetails> {
    if (input.extras.skills.length || input.extras.interests.length) {
      throw new Error('O backend atual ainda não permite salvar habilidades ou interesses.')
    }
    const {
      email,
      lattesUrl,
      description,
      course,
      currentPeriod,
      ira,
      receiveNotifications,
    } = input.profile
    const { data } = await api.patch<StudentProfileDetails['profile']>('/students', {
      email,
      lattesUrl,
      description,
      course,
      currentPeriod,
      ira,
      receiveNotifications,
    })
    return { role: 'STUDENT', profile: data, extras: { skills: [], interests: [] } }
  },

  async patchProfessor(input: ProfessorProfileUpdate): Promise<ProfessorProfileDetails> {
    if (input.extras.researchAreas.length || input.extras.researchLines.length) {
      throw new Error('O backend atual ainda não permite salvar áreas de pesquisa ou linhas de atuação.')
    }
    const { email, lattesUrl, description, department } = input.profile
    const { data } = await api.patch<ProfessorProfileDetails['profile']>('/professors', {
      email,
      lattesUrl,
      description,
      department,
    })
    return { role: 'PROFESSOR', profile: data, extras: { researchAreas: [], researchLines: [] } }
  },
}
