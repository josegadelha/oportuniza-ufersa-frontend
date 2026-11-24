import type { ProjectProposalCard, UserProfile } from '../types/domain'

export function canViewStudentProposal(
  proposal: ProjectProposalCard,
  currentUser: UserProfile | null | undefined,
): boolean {
  if (!proposal.isPrivate) return true
  if (!currentUser) return false
  if (proposal.studentId === currentUser.profile.id) return true
  if (proposal.invites.some((invite) => invite.userId === String(currentUser.profile.id))) return true
  return currentUser.role === 'PROFESSOR' && proposal.seekingAdvisor === true
}
