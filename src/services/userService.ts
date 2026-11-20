import { userService as apiUserService } from './api/userService'
import { mockUserService } from './mocks/mockUserService'
import type {
  ProfessorProfileDetails,
  ProfessorProfileUpdate,
  StudentProfileDetails,
  StudentProfileUpdate,
  UserProfileDetails,
  UserRole,
} from '../types/domain'

export interface UserService {
  supportsExtendedProfileFields: boolean
  getCurrentProfile(role: UserRole): Promise<UserProfileDetails>
  getProfileById(profileId: number): Promise<UserProfileDetails>
  patchStudent(input: StudentProfileUpdate): Promise<StudentProfileDetails>
  patchProfessor(input: ProfessorProfileUpdate): Promise<ProfessorProfileDetails>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const userService: UserService = USE_MOCKS ? mockUserService : apiUserService
