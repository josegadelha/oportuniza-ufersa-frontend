import type {
  ProfessorProfileDetails,
  ProfessorProfileUpdate,
  StudentProfileDetails,
  StudentProfileUpdate,
  UserProfile,
  UserProfileDetails,
  UserProfilesByRole,
  ProjectProposalInviteCandidate,
  UserRole,
} from '../../types/domain'
import type { UserService } from '../userService'
import { readAuthSession, writeAuthSession } from '../sessionStorage'
import { initialMockAdditionalProfiles, initialMockUsers } from './users'
import { initialMockProfileExtras, type MockProfileExtrasByRole } from './profileDetails'
import { simulateNetworkDelay } from './delay'
import { isArrayOf, readMockState, writeMockState } from './storage'

const STORAGE_KEY = 'oportuniza.mock.users.v2'
const PROFILE_EXTRAS_STORAGE_KEY = 'oportuniza.mock.profile-extras.v2'
const ADDITIONAL_PROFILES_STORAGE_KEY = 'oportuniza.mock.additional-profiles.v2'

function isUserProfileForRole(value: unknown, role: UserRole): value is UserProfile {
  if (typeof value !== 'object' || value === null || !('role' in value) || !('profile' in value)) {
    return false
  }
  if (value.role !== role || typeof value.profile !== 'object' || value.profile === null) return false
  return 'id' in value.profile
    && typeof value.profile.id === 'number'
    && 'username' in value.profile
    && typeof value.profile.username === 'string'
    && 'name' in value.profile
    && typeof value.profile.name === 'string'
}

function isUserProfiles(value: unknown): value is UserProfilesByRole {
  if (typeof value !== 'object' || value === null || !('STUDENT' in value) || !('PROFESSOR' in value)) {
    return false
  }
  return isUserProfileForRole(value.STUDENT, 'STUDENT')
    && isUserProfileForRole(value.PROFESSOR, 'PROFESSOR')
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isProfileExtrasByRole(value: unknown): value is MockProfileExtrasByRole {
  if (typeof value !== 'object' || value === null || !('STUDENT' in value) || !('PROFESSOR' in value)) {
    return false
  }
  const student = value.STUDENT
  const professor = value.PROFESSOR
  return typeof student === 'object'
    && student !== null
    && 'skills' in student
    && isArrayOf(student.skills, isString)
    && 'interests' in student
    && isArrayOf(student.interests, isString)
    && typeof professor === 'object'
    && professor !== null
    && 'researchAreas' in professor
    && isArrayOf(professor.researchAreas, isString)
    && 'researchLines' in professor
    && isArrayOf(professor.researchLines, isString)
}

function isAdditionalProfile(value: unknown): value is UserProfileDetails {
  if (typeof value !== 'object' || value === null || !('role' in value) || !('extras' in value)) {
    return false
  }
  if (typeof value.extras !== 'object' || value.extras === null) return false
  if (value.role === 'STUDENT' && isUserProfileForRole(value, 'STUDENT')) {
    return 'skills' in value.extras && isArrayOf(value.extras.skills, isString)
      && 'interests' in value.extras && isArrayOf(value.extras.interests, isString)
  }
  if (value.role === 'PROFESSOR' && isUserProfileForRole(value, 'PROFESSOR')) {
    return 'researchAreas' in value.extras && isArrayOf(value.extras.researchAreas, isString)
      && 'researchLines' in value.extras && isArrayOf(value.extras.researchLines, isString)
  }
  return false
}

let users = readMockState(STORAGE_KEY, initialMockUsers, isUserProfiles)
let profileExtras = readMockState(
  PROFILE_EXTRAS_STORAGE_KEY,
  initialMockProfileExtras,
  isProfileExtrasByRole,
)
let updatedAdditionalProfiles = readMockState<UserProfileDetails[]>(
  ADDITIONAL_PROFILES_STORAGE_KEY,
  [],
  (value): value is UserProfileDetails[] => isArrayOf(value, isAdditionalProfile),
)

function saveUsers() {
  writeMockState(STORAGE_KEY, users)
}

function saveProfileExtras() {
  writeMockState(PROFILE_EXTRAS_STORAGE_KEY, profileExtras)
}

function saveAdditionalProfile(profile: UserProfileDetails) {
  updatedAdditionalProfiles = [
    ...updatedAdditionalProfiles.filter((item) => item.profile.id !== profile.profile.id),
    profile,
  ]
  writeMockState(ADDITIONAL_PROFILES_STORAGE_KEY, updatedAdditionalProfiles)
}

function updateActiveSession(user: UserProfile) {
  const session = readAuthSession()
  if (session?.user.role === user.role && session.user.profile.id === user.profile.id) {
    writeAuthSession({ ...session, user })
  }
}

function normalizeItems(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))]
}

export const mockUserService: UserService = {
  supportsExtendedProfileFields: true,

  async listInviteCandidates(): Promise<ProjectProposalInviteCandidate[]> {
    await simulateNetworkDelay()
    return structuredClone([
      ...Object.values(users),
      ...initialMockAdditionalProfiles,
    ].map(({ role, profile }) => ({
      userId: String(profile.id),
      name: profile.name,
      role: role === 'STUDENT' ? 'student' : 'professor',
    })))
  },

  async getCurrentProfile(role: UserRole) {
    await simulateNetworkDelay()
    const session = readAuthSession()
    if (session?.user.role === role) {
      return mockUserService.getProfileById(session.user.profile.id)
    }
    if (role === 'STUDENT') {
      return structuredClone({
        ...users.STUDENT,
        extras: profileExtras.STUDENT,
      })
    }
    return structuredClone({
      ...users.PROFESSOR,
      extras: profileExtras.PROFESSOR,
    })
  },

  async getProfileById(profileId: number): Promise<UserProfileDetails> {
    await simulateNetworkDelay()
    const additionalProfile = updatedAdditionalProfiles.find(
      (candidate) => candidate.profile.id === profileId,
    ) ?? initialMockAdditionalProfiles.find(
      (candidate) => candidate.profile.id === profileId,
    )
    if (additionalProfile) return structuredClone(additionalProfile)

    const profile = Object.values(users).find((user) => user.profile.id === profileId)
    if (!profile) throw new Error('O perfil solicitado não foi encontrado.')

    if (profile.role === 'STUDENT') {
      return structuredClone({
        ...profile,
        extras: profileExtras.STUDENT,
      })
    }
    return structuredClone({
      ...profile,
      extras: profileExtras.PROFESSOR,
    })
  },

  async patchStudent(input: StudentProfileUpdate): Promise<StudentProfileDetails> {
    await simulateNetworkDelay()
    const session = readAuthSession()
    if (!session || session.user.role !== 'STUDENT') {
      throw new Error('É necessário entrar como discente para editar o perfil.')
    }
    const current = await mockUserService.getProfileById(session.user.profile.id)
    if (current.role !== 'STUDENT') throw new Error('O perfil não corresponde à sessão atual.')
    const updatedUser: UserProfilesByRole['STUDENT'] = {
      role: 'STUDENT',
      profile: {
        ...current.profile,
        email: input.profile.email ?? current.profile.email,
        lattesUrl: input.profile.lattesUrl !== undefined ? input.profile.lattesUrl : current.profile.lattesUrl,
        githubUrl: input.profile.githubUrl !== undefined ? input.profile.githubUrl : current.profile.githubUrl,
        linkedinUrl: input.profile.linkedinUrl !== undefined ? input.profile.linkedinUrl : current.profile.linkedinUrl,
        description: input.profile.description !== undefined ? input.profile.description : current.profile.description,
        course: input.profile.course ?? current.profile.course,
        currentPeriod: input.profile.currentPeriod ?? current.profile.currentPeriod,
        ira: input.profile.ira ?? current.profile.ira,
        receiveNotifications: input.profile.receiveNotifications ?? current.profile.receiveNotifications,
      },
    }
    const updatedProfile: StudentProfileDetails = {
      ...updatedUser,
      extras: {
        skills: normalizeItems(input.extras.skills),
        interests: normalizeItems(input.extras.interests),
      },
    }
    if (updatedUser.profile.id === initialMockUsers.STUDENT.profile.id) {
      users = { ...users, STUDENT: updatedUser }
      profileExtras = { ...profileExtras, STUDENT: updatedProfile.extras }
      saveUsers()
      saveProfileExtras()
    } else {
      saveAdditionalProfile(updatedProfile)
    }
    updateActiveSession(updatedUser)
    return structuredClone(updatedProfile)
  },

  async patchProfessor(input: ProfessorProfileUpdate): Promise<ProfessorProfileDetails> {
    await simulateNetworkDelay()
    const session = readAuthSession()
    if (!session || session.user.role !== 'PROFESSOR') {
      throw new Error('É necessário entrar como docente para editar o perfil.')
    }
    const current = await mockUserService.getProfileById(session.user.profile.id)
    if (current.role !== 'PROFESSOR') throw new Error('O perfil não corresponde à sessão atual.')
    const updatedUser: UserProfilesByRole['PROFESSOR'] = {
      role: 'PROFESSOR',
      profile: {
        ...current.profile,
        email: input.profile.email ?? current.profile.email,
        lattesUrl: input.profile.lattesUrl !== undefined ? input.profile.lattesUrl : current.profile.lattesUrl,
        githubUrl: input.profile.githubUrl !== undefined ? input.profile.githubUrl : current.profile.githubUrl,
        linkedinUrl: input.profile.linkedinUrl !== undefined ? input.profile.linkedinUrl : current.profile.linkedinUrl,
        description: input.profile.description !== undefined ? input.profile.description : current.profile.description,
        department: input.profile.department ?? current.profile.department,
      },
    }
    const updatedProfile: ProfessorProfileDetails = {
      ...updatedUser,
      extras: {
        researchAreas: normalizeItems(input.extras.researchAreas),
        researchLines: normalizeItems(input.extras.researchLines),
      },
    }
    if (updatedUser.profile.id === initialMockUsers.PROFESSOR.profile.id) {
      users = { ...users, PROFESSOR: updatedUser }
      profileExtras = { ...profileExtras, PROFESSOR: updatedProfile.extras }
      saveUsers()
      saveProfileExtras()
    } else {
      saveAdditionalProfile(updatedProfile)
    }
    updateActiveSession(updatedUser)
    return structuredClone(updatedProfile)
  },
}
