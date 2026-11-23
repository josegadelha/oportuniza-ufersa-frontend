export type UserRole = 'STUDENT' | 'PROFESSOR'

export type Course =
  | 'CIENCIA_DA_COMPUTACAO'
  | 'ENGENHARIA_DE_SOFTWARE'
  | 'ENGENHARIA_DA_COMPUTACAO'
  | 'SISTEMAS_DE_INFORMACAO'
  | 'ENGENHARIA_CIVIL'
  | 'ENGENHARIA_ELETRICA'
  | 'ENGENHARIA_MECANICA'
  | 'ENGENHARIA_QUIMICA'
  | 'ADMINISTRACAO'
  | 'DIREITO'
  | 'MEDICINA'
  | 'OUTRO'

export type Department =
  | 'COMPUTACAO'
  | 'ENGENHARIAS'
  | 'CIENCIAS_EXATAS'
  | 'CIENCIAS_HUMANAS'
  | 'CIENCIAS_SOCIAIS'
  | 'CIENCIAS_AGRARIAS'
  | 'CIENCIAS_DA_SAUDE'
  | 'OUTRO'

export type OpportunityType =
  | 'RESEARCH'
  | 'MONITORING'
  | 'EXTENSION'
  | 'TEACHING'
  | 'VOLUNTEER'
  | 'OTHER'

export type OpportunityStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'FINISHED'

export type CandidacyStatus =
  | 'IN_SELECTION'
  | 'HISTORY_REVIEW'
  | 'INTERVIEW'
  | 'FINAL_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'

interface UserResponse {
  id: number
  username: string
  registration: string
  name: string
  email: string
  lattesUrl: string | null
  githubUrl?: string | null
  linkedinUrl?: string | null
  description: string | null
}

export interface StudentResponse extends UserResponse {
  course: Course
  currentPeriod: number
  ira: number
  receiveNotifications: boolean
}

export interface ProfessorResponse extends UserResponse {
  department: Department
}

export interface StudentProfilePatch {
  email?: string | null
  lattesUrl?: string | null
  githubUrl?: string | null
  linkedinUrl?: string | null
  description?: string | null
  course?: Course | null
  currentPeriod?: number | null
  ira?: number | null
  receiveNotifications?: boolean | null
}

export interface ProfessorProfilePatch {
  email?: string | null
  lattesUrl?: string | null
  githubUrl?: string | null
  linkedinUrl?: string | null
  description?: string | null
  department?: Department | null
}

export interface StudentProfileExtras {
  skills: string[]
  interests: string[]
}

export interface ProfessorProfileExtras {
  researchAreas: string[]
  researchLines: string[]
}

export interface StudentProfileDetails {
  role: 'STUDENT'
  profile: StudentResponse
  extras: StudentProfileExtras
}

export interface ProfessorProfileDetails {
  role: 'PROFESSOR'
  profile: ProfessorResponse
  extras: ProfessorProfileExtras
}

export type UserProfileDetails = StudentProfileDetails | ProfessorProfileDetails

export interface StudentProfileUpdate {
  profile: StudentProfilePatch
  extras: StudentProfileExtras
}

export interface ProfessorProfileUpdate {
  profile: ProfessorProfilePatch
  extras: ProfessorProfileExtras
}

export type UserProfile =
  | { role: 'STUDENT'; profile: StudentResponse }
  | { role: 'PROFESSOR'; profile: ProfessorResponse }

export type UserProfilesByRole = {
  STUDENT: Extract<UserProfile, { role: 'STUDENT' }>
  PROFESSOR: Extract<UserProfile, { role: 'PROFESSOR' }>
}

export interface LoginRequestDTO {
  username: string
  password: string
}

export type LoginCredentials = LoginRequestDTO

export interface AuthSession {
  accessToken: string
  user: UserProfile
}

export interface AuthTokenResponse {
  token: string
}

export interface OpportunityResponse {
  id: number
  professorId: number
  title: string
  description: string
  type: OpportunityType
  positions: number
  workloadHours: number
  remuneration: number
  status: OpportunityStatus
  publishedAt: string | null
  applicationDeadline: string | null
  requirements: string[]
}

export type ProjectProposalCategory = 'RESEARCH' | 'EXTENSION' | 'INNOVATION'

export type ProjectProposalStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED'

export interface ProjectProposalResponse {
  id: number
  studentId: number
  title: string
  description: string
  status: ProjectProposalStatus
  publishedAt: string | null
  desiredSkills: string[]
}

export interface ProjectProposalCard extends ProjectProposalResponse {
  category: ProjectProposalCategory | null
  seeksAdvisor: boolean | null
  authorIds: number[]
}

export interface ProjectProposalCreateRequest {
  title: string
  description: string
  desiredSkills: string[]
  category: ProjectProposalCategory
  seeksAdvisor: boolean
  status?: ProjectProposalStatus | null
  publishedAt?: string | null
}

export interface ProjectProposalPatchRequest {
  title?: string | null
  description?: string | null
  desiredSkills?: string[] | null
  status?: ProjectProposalStatus | null
  publishedAt?: string | null
}

export type ProposalInterestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface ProposalInterestResponse {
  id: number
  projectProposalId: number
  userId: number
  status: ProposalInterestStatus
  createdAt: string
}

export interface OpportunityCreateRequest {
  title: string
  description: string
  type: OpportunityType
  positions: number
  workloadHours: number
  remuneration: number
  status?: OpportunityStatus | null
  publishedAt?: string | null
  applicationDeadline?: string | null
  requirements?: string[] | null
}

export interface OpportunityUpdateRequest {
  title: string
  description: string
  type: OpportunityType
  positions: number
  workloadHours: number
  remuneration: number
  status: OpportunityStatus
  publishedAt: string
  applicationDeadline: string | null
  requirements: string[] | null
}

export interface OpportunityPatchRequest {
  title?: string | null
  description?: string | null
  type?: OpportunityType | null
  positions?: number | null
  workloadHours?: number | null
  remuneration?: number | null
  status?: OpportunityStatus | null
  publishedAt?: string | null
  applicationDeadline?: string | null
  requirements?: string[] | null
}

export interface CandidacyResponse {
  id: number
  studentId: number
  opportunityId: number
  appliedAt: string
  status: CandidacyStatus
}

export interface CandidacyCreateRequest {
  studentId: number
  opportunityId: number
  appliedAt?: string | null
  status?: CandidacyStatus | null
}

export interface CandidacyUpdateRequest {
  studentId: number
  opportunityId: number
  appliedAt: string
  status: CandidacyStatus
}

export interface CandidacyPatchRequest {
  studentId?: number | null
  opportunityId?: number | null
  appliedAt?: string | null
  status?: CandidacyStatus | null
}

export type NotificationType =
  | 'NEW_OPPORTUNITY'
  | 'SELECTION_PROCESS_UPDATE'
  | 'PITCH_INTEREST'

export interface NotificationResponse {
  id: number
  recipientId: number
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  sentAt: string
}

export interface NotificationCreateRequest {
  title: string
  message: string
  type: NotificationType
  recipientId?: number
}

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export interface ProjectResponse {
  id: number
  title: string
  startDate: string
  endDate: string | null
  status: ProjectStatus
  advisorIds: number[]
  memberIds: number[]
}

export type SubmissionStatus = 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface DeliverableResponse {
  id: number
  projectId: number
  title: string
  deadline: string
}

export interface DeliverableCreateRequest {
  title: string
  deadline: string
}

export interface DeliverablePatchRequest {
  title?: string
  deadline?: string
}

export interface SubmissionResponse {
  id: number
  deliverableId: number
  studentId: number
  filePath: string | null
  submittedAt: string | null
  status: SubmissionStatus
  feedback?: string | null
}

export interface SubmissionVersionResponse {
  versionNumber: number
  filePath: string
  submittedAt: string
}
