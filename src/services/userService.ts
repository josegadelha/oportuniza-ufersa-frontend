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
  getCurrentProfile(role: UserRole, signal?: AbortSignal): Promise<UserProfileDetails>
  getProfileById(profileId: number, signal?: AbortSignal): Promise<UserProfileDetails>
  patchStudent(input: StudentProfileUpdate, signal?: AbortSignal): Promise<StudentProfileDetails>
  patchProfessor(input: ProfessorProfileUpdate, signal?: AbortSignal): Promise<ProfessorProfileDetails>
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const userService: UserService = USE_MOCKS ? mockUserService : apiUserService
