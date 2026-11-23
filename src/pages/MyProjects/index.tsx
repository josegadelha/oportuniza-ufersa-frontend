import { useEffect, useState, type FormEvent } from 'react'
import { BriefcaseBusiness, Check, Clock3, Eye, FileText, FolderKanban, GraduationCap, LogOut, Mail, Plus, RefreshCw, Upload, UsersRound, X } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMyProjects } from '../../hooks/useMyProjects'
import { useNotificationActions } from '../../hooks/useNotificationActions'
import NotificationMenu from '../../UI/NotificationMenu'
import { ProjectsAndProcessesLink } from '../../UI/Header'
import styles from './MyProjects.module.css'
import type {
  CandidacyResponse,
  CandidacyStatus,
  DeliverableCreateRequest,
  DeliverableResponse,
  OpportunityCreateRequest,
  OpportunityPatchRequest,
  OpportunityResponse,
  OpportunityType,
  ProjectResponse,
  SubmissionResponse,
} from '../../types/domain'
import type { ServiceResult } from '../../services/result'

const candidacyStatusLabels: Record<CandidacyStatus, string> = {
  IN_SELECTION: 'Pendente',
  HISTORY_REVIEW: 'Análise de histórico',
  INTERVIEW: 'Entrevista',
  FINAL_REVIEW: 'Etapa final',
  APPROVED: 'Aprovada',
  REJECTED: 'Recusada',
  WITHDRAWN: 'Cancelada',
}

const submissionStatusLabels: Record<SubmissionResponse['status'], string> = {
  WAITING: 'Aguardando envio',
  PENDING: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Reenviar arquivo',
}

const opportunityTypes: Array<{ value: OpportunityType; label: string }> = [
  { value: 'RESEARCH', label: 'Pesquisa' },
  { value: 'EXTENSION', label: 'Extensão' },
  { value: 'MONITORING', label: 'Monitoria' },
  { value: 'TEACHING', label: 'Ensino' },
  { value: 'VOLUNTEER', label: 'Voluntariado' },
  { value: 'OTHER', label: 'Outra' },
]

const createOpportunityTypes: Array<{ value: OpportunityType; label: string }> = [
  { value: 'RESEARCH', label: 'Pesquisa' },
  { value: 'EXTENSION', label: 'Extensão' },
  { value: 'MONITORING', label: 'Monitoria' },
]

const candidacyStages: Array<{ label: string; statuses: CandidacyStatus[] }> = [
  { label: 'Inscrição', statuses: ['IN_SELECTION'] },
  { label: 'Análise de IRA', statuses: ['HISTORY_REVIEW'] },
  { label: 'Entrevista', statuses: ['INTERVIEW'] },
  { label: 'Resultado final', statuses: ['FINAL_REVIEW', 'APPROVED', 'REJECTED'] },
]

const nextCandidacyStatuses: Record<CandidacyStatus, Exclude<CandidacyStatus, 'WITHDRAWN'>[]> = {
  IN_SELECTION: ['HISTORY_REVIEW', 'REJECTED'],
  HISTORY_REVIEW: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['FINAL_REVIEW', 'REJECTED'],
  FINAL_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
  WITHDRAWN: [],
}

function getCandidacyStageIndex(status: CandidacyStatus) {
  return candidacyStages.findIndex((stage) => stage.statuses.includes(status))
}

function getStatusClass(status: CandidacyStatus) {
  if (status === 'APPROVED') return styles.statusSuccess
  if (status === 'REJECTED' || status === 'WITHDRAWN') return styles.statusMuted
  return styles.statusPending
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatLocalDateTime(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    + `T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
}

function getProjectStatusLabel(project: ProjectResponse) {
  if (project.status === 'COMPLETED') return 'Concluído'
  if (project.status === 'CANCELLED') return 'Cancelado'
  return 'Em andamento'
}

function PersonLink({
  id,
  name,
}: {
  id: number
  name: string
}) {
  return <Link to={`/perfil/${id}`}>{name}</Link>
}

function ActionButtons({
  disabled,
  onAccept,
  onReject,
}: {
  disabled: boolean
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <div className={styles.rowActions}>
      <button className={styles.acceptButton} disabled={disabled} onClick={onAccept} type="button">
        <Check size={14} /> Aprovar
      </button>
      <button className={styles.rejectButton} disabled={disabled} onClick={onReject} type="button">
        <X size={14} /> Recusar
      </button>
    </div>
  )
}

function MyProjectsPage() {
  const { logout } = useAuth()
  const { createNotification } = useNotificationActions()
  const {
    user,
    data,
    isLoading,
    error,
    notificationError,
    reload,
    cancelCandidacy,
    reviewCandidacy,
    reviewProposalInterest,
    closeProposal,
    updateOpportunityStatus,
    createDeliverable,
    submitDeliverable,
    editOpportunity,
    createOpportunity,
  } = useMyProjects()
  const [isWorking, setIsWorking] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [uploadTarget, setUploadTarget] = useState<DeliverableResponse | null>(null)
  const [viewTarget, setViewTarget] = useState<{
    deliverable: DeliverableResponse
    submission: SubmissionResponse | undefined
  } | null>(null)
  const [createDeliverableTarget, setCreateDeliverableTarget] = useState<ProjectResponse | null>(null)
  const [editOpportunityTarget, setEditOpportunityTarget] = useState<OpportunityResponse | null>(null)
  const [phaseTarget, setPhaseTarget] = useState<CandidacyResponse | null>(null)
  const [phaseValue, setPhaseValue] = useState<Exclude<CandidacyStatus, 'WITHDRAWN'>>('HISTORY_REVIEW')
  const [phaseMessage, setPhaseMessage] = useState('')
  const [notificationTarget, setNotificationTarget] = useState<CandidacyResponse | null>(null)
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [isCreateOpportunityOpen, setIsCreateOpportunityOpen] = useState(false)
  const [selectedDashboardTab, setSelectedDashboardTab] = useState<string | null>(null)

  if (!user) return <Navigate to="/login" replace />

  const myProposals = user.role === 'STUDENT'
    ? data.proposals.filter((proposal) => (
      proposal.studentId === user.profile.id || proposal.authorIds.includes(user.profile.id)
    ))
    : []
  const myProposalIds = new Set(myProposals.map((proposal) => proposal.id))
  const activeProjects = data.projects.filter((project) => project.status === 'ACTIVE')
  const approvedCandidacies = data.candidacies.filter((item) => item.status === 'APPROVED')
  const activeCollaborations = user.role === 'STUDENT'
    ? data.proposalInterests.filter((interest) => (
      interest.userId === user.profile.id
        && interest.status === 'ACCEPTED'
        && !myProposalIds.has(interest.projectProposalId)
    ))
    : []
  const teacherInterests = user.role === 'PROFESSOR'
    ? data.proposalInterests.filter((interest) => interest.userId === user.profile.id)
    : []
  const pendingCandidacies = data.candidacies.filter((item) => (
    item.status !== 'APPROVED' && item.status !== 'REJECTED' && item.status !== 'WITHDRAWN'
  ))
  const completedCandidacies = data.candidacies.filter((item) => item.status === 'APPROVED')
  const ongoingCandidacies = data.candidacies.filter((item) => item.status !== 'APPROVED')
  const dashboardTabs = user.role === 'STUDENT'
    ? [
      {
        id: 'student-projects',
        label: 'Projetos Ativos',
        count: activeProjects.length + approvedCandidacies.length + activeCollaborations.length,
      },
      { id: 'student-candidacies', label: 'Minhas Candidaturas', count: data.candidacies.length },
      { id: 'student-proposals', label: 'Minhas Propostas', count: myProposals.length },
    ]
    : [
      { id: 'teacher-projects', label: 'Projetos em Andamento', count: activeProjects.length },
      { id: 'teacher-opportunities', label: 'Minhas Oportunidades', count: data.opportunities.length },
      { id: 'teacher-orientations', label: 'Orientações Oferecidas', count: teacherInterests.length },
    ]
  const activeDashboardTab = dashboardTabs.some((tab) => tab.id === selectedDashboardTab)
    ? selectedDashboardTab
    : dashboardTabs[0].id

  async function runAction<T>(operation: () => Promise<ServiceResult<T>>, successMessage: string) {
    setIsWorking(true)
    setActionNotice(null)
    setActionError(null)
    const result = await operation()
    if (result.success) setActionNotice(successMessage)
    else setActionError(result.message)
    setIsWorking(false)
    return result.success
  }

  function getPersonName(id: number, fallback: string) {
    return data.people[id]?.name ?? fallback
  }

  function openPhaseEditor(candidacy: CandidacyResponse) {
    const availableStatuses = nextCandidacyStatuses[candidacy.status]
    if (!availableStatuses.length) return
    setPhaseTarget(candidacy)
    setPhaseValue(availableStatuses[0])
    setPhaseMessage('')
  }

  function openNotificationEditor(candidacy: CandidacyResponse) {
    setNotificationTarget(candidacy)
    setNotificationTitle('')
    setNotificationMessage('')
  }

  async function submitCandidacyNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!notificationTarget) return
    setIsWorking(true)
    setActionError(null)
    setActionNotice(null)
    const result = await createNotification({
      recipientId: notificationTarget.studentId,
      title: notificationTitle.trim(),
      message: notificationMessage.trim(),
      type: 'SELECTION_PROCESS_UPDATE',
    })
    if (result.success) {
      setActionNotice('Notificação enviada ao discente.')
      setNotificationTarget(null)
    } else {
      setActionError(result.message)
    }
    setIsWorking(false)
  }

  function renderActiveProjects() {
    const acceptedCandidacies = approvedCandidacies
      .map((candidacy) => ({
        key: `candidacy-${candidacy.id}`,
        title: data.opportunities.find((item) => item.id === candidacy.opportunityId)?.title
          ?? 'Oportunidade acadêmica',
        personId: data.opportunities.find((item) => item.id === candidacy.opportunityId)?.professorId,
        personLabel: 'Docente',
      }))
    const acceptedCollaborationItems = activeCollaborations.map((interest) => ({
      key: `interest-${interest.id}`,
      title: data.proposals.find((item) => item.id === interest.projectProposalId)?.title
        ?? 'Proposta de aluno',
      personId: data.proposals.find((item) => item.id === interest.projectProposalId)?.studentId,
      personLabel: 'Autor da proposta',
    }))

    return (
      <div className={styles.itemList}>
        {activeProjects.map((project) => (
          <article className={styles.projectBlock} key={`project-${project.id}`}>
            <div className={styles.itemCard}>
              <span className={`${styles.itemIcon} ${styles.projectIcon}`}><FolderKanban size={18} /></span>
              <div className={styles.itemMain}>
                <strong>{project.title}</strong>
                <span>
                  Orientação:{' '}
                  {project.advisorIds.map((id, index) => (
                    <span key={id}>
                      {index > 0 && ', '}
                      <PersonLink id={id} name={getPersonName(id, `Docente ${id}`)} />
                    </span>
                  ))}
                </span>
              </div>
              <span className={`${styles.statusBadge} ${styles.statusSuccess}`}>
                {getProjectStatusLabel(project)}
              </span>
            </div>
            <div className={styles.projectDeliverables}>
              <div className={styles.deliverablesHeading}>
                <h4>Entregáveis do projeto</h4>
                {user?.role === 'PROFESSOR' && (
                  <button
                    className={styles.addDeliverableButton}
                    onClick={() => setCreateDeliverableTarget(project)}
                    type="button"
                  >
                    <Plus size={14} /> Novo entregável
                  </button>
                )}
              </div>
              {data.deliverables.filter((item) => item.projectId === project.id).length ? (
                data.deliverables
                  .filter((item) => item.projectId === project.id)
                  .map((deliverable) => {
                    const submission = data.submissions.find((item) => (
                      item.deliverableId === deliverable.id
                      && (user?.role === 'PROFESSOR' || item.studentId === user?.profile.id)
                    ))
                    const status = submission?.status ?? 'WAITING'
                    return (
                      <div className={styles.deliverableRow} key={deliverable.id}>
                        <div className={styles.deliverableInfo}>
                          <span className={styles.deliverableIcon}><FileText size={16} /></span>
                          <div className={styles.deliverableDetails}>
                            <strong>{deliverable.title}</strong>
                            <span>
                              Prazo: {new Intl.DateTimeFormat('pt-BR').format(
                                new Date(`${deliverable.deadline.slice(0, 10)}T12:00:00`),
                              )}
                              {submission?.filePath ? ` · Arquivo: ${submission.filePath}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className={styles.deliverableActions}>
                          <span className={`${styles.statusBadge} ${
                            status === 'APPROVED' ? styles.statusSuccess
                              : status === 'REJECTED' ? styles.statusMuted
                                : styles.statusPending
                          }`}>
                            {submissionStatusLabels[status]}
                          </span>
                          {status === 'APPROVED' ? (
                            <button
                              className={`${styles.uploadButton} ${styles.viewButton}`}
                              onClick={() => setViewTarget({ deliverable, submission })}
                              type="button"
                            >
                              <Eye size={14} /> Ver envio
                            </button>
                          ) : user?.role === 'STUDENT' ? (
                            <button
                              className={styles.uploadButton}
                              onClick={() => setUploadTarget(deliverable)}
                              type="button"
                            >
                              <Upload size={14} /> {submission ? 'Reenviar' : 'Enviar'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
              ) : (
                <p className={styles.emptyInline}>Ainda não há entregáveis definidos para este projeto.</p>
              )}
            </div>
          </article>
        ))}
        {[...acceptedCandidacies, ...acceptedCollaborationItems].map((item) => (
          <article className={styles.itemCard} key={item.key}>
            <span className={`${styles.itemIcon} ${styles.projectIcon}`}><BriefcaseBusiness size={18} /></span>
            <div className={styles.itemMain}>
              <strong>{item.title}</strong>
              <span>
                {item.personLabel}:{' '}
                {item.personId
                  ? <PersonLink id={item.personId} name={getPersonName(item.personId, `${item.personLabel} ${item.personId}`)} />
                  : 'Não informado'}
              </span>
            </div>
            <span className={`${styles.statusBadge} ${styles.statusSuccess}`}>Ativo</span>
          </article>
        ))}
        {activeProjects.length === 0 && acceptedCandidacies.length === 0 && acceptedCollaborationItems.length === 0 && (
          <p className={styles.emptyState}>Seus projetos aprovados e colaborações aparecerão aqui.</p>
        )}
      </div>
    )
  }

  function renderStudentCandidacies() {
    if (!data.candidacies.length) {
      return <p className={styles.emptyState}>Você ainda não se candidatou a oportunidades.</p>
    }

    return (
      <div className={styles.itemList}>
        {ongoingCandidacies.map(renderCandidacyCard)}
        {completedCandidacies.length > 0 && (
          <details className={styles.completedGroup} open>
            <summary>Concluídas <span className={styles.dashboardTabCount}>{completedCandidacies.length}</span></summary>
            <div className={styles.itemList}>{completedCandidacies.map(renderCandidacyCard)}</div>
          </details>
        )}
      </div>
    )
  }

  function renderCandidacyCard(candidacy: CandidacyResponse) {
          const opportunity = data.opportunities.find((item) => item.id === candidacy.opportunityId)
          const professorId = opportunity?.professorId
          const canCancel = candidacy.status !== 'APPROVED'
            && candidacy.status !== 'REJECTED'
            && candidacy.status !== 'WITHDRAWN'
          return (
            <article className={styles.managementCard} key={candidacy.id}>
              <div className={styles.cardHeading}>
                <div>
                  <h3>{opportunity?.title ?? 'Oportunidade acadêmica'}</h3>
                  <p>
                    Docente responsável:{' '}
                    {professorId
                      ? <PersonLink id={professorId} name={getPersonName(professorId, `Docente ${professorId}`)} />
                      : 'Não informado'}
                  </p>
                </div>
                <div className={styles.headingAside}>
                  <span className={`${styles.statusBadge} ${getStatusClass(candidacy.status)}`}>
                    {candidacyStatusLabels[candidacy.status]}
                  </span>
                  {canCancel && (
                    <button
                      className={styles.rejectButton}
                      disabled={isWorking}
                      onClick={() => void runAction(
                        () => cancelCandidacy(candidacy.id),
                        'Candidatura cancelada.',
                      )}
                      type="button"
                    >
                      Cancelar candidatura
                    </button>
                  )}
                </div>
              </div>
              {opportunity && (
                <div className={styles.metadataRow}>
                  <span><b>{opportunity.remuneration > 0
                    ? `${formatCurrency(opportunity.remuneration)} por mês`
                    : 'Voluntária'}</b></span>
                  <span><b>{opportunity.workloadHours}</b> horas semanais</span>
                  <span><b>{opportunity.positions}</b> {opportunity.positions === 1 ? 'vaga' : 'vagas'}</span>
                </div>
              )}
              {candidacy.status !== 'WITHDRAWN' && (
                <ol className={styles.stageStepper} aria-label="Fases do processo seletivo">
                  {candidacyStages.map((stage, index) => {
                    const currentStage = getCandidacyStageIndex(candidacy.status)
                    const isComplete = index < currentStage || candidacy.status === 'APPROVED'
                    const isCurrent = index === currentStage && candidacy.status !== 'APPROVED'
                      && candidacy.status !== 'REJECTED'
                    return (
                      <li
                        aria-current={isCurrent ? 'step' : undefined}
                        className={`${styles.stageStep} ${
                          isComplete ? styles.stageComplete : isCurrent ? styles.stageCurrent : ''
                        }`}
                        key={stage.label}
                      >
                        <span className={styles.stageMarker}>{isComplete ? '✓' : index + 1}</span>
                        <span>{stage.label}</span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </article>
          )
  }

  function renderStudentProposals() {
    if (!myProposals.length) {
      return <p className={styles.emptyState}>Suas propostas de projeto aparecerão aqui.</p>
    }

    return (
      <div className={styles.itemList}>
        {myProposals.map((proposal) => {
          const interests = data.proposalInterests.filter(
            (interest) => interest.projectProposalId === proposal.id,
          )
          return (
            <article className={styles.managementCard} key={proposal.id}>
              <div className={styles.cardHeading}>
                <div>
                  <h3>{proposal.title}</h3>
                  <p>{proposal.description}</p>
                </div>
                <span className={`${styles.statusBadge} ${
                  proposal.status === 'CLOSED' ? styles.statusMuted : styles.statusPending
                }`}>
                  {proposal.status === 'CLOSED'
                    ? 'Encerrada'
                    : proposal.status === 'IN_PROGRESS'
                      ? 'Em andamento'
                      : 'Aberta'}
                </span>
              </div>
              <div className={styles.proposalTags}>
                {proposal.desiredSkills.map((skill) => (
                  <span className={styles.skillTag} key={skill}>{skill}</span>
                ))}
              </div>
              <div className={styles.requestList}>
                <h4>Solicitações de colaboração e orientação</h4>
                {interests.length ? interests.map((interest) => {
                  const person = data.people[interest.userId]
                  const personRole = person?.role === 'PROFESSOR' ? 'Docente orientador' : 'Discente colaborador'
                  return (
                    <div className={styles.requestRow} key={interest.id}>
                      <span>
                        {personRole}:{' '}
                        <PersonLink
                          id={interest.userId}
                          name={getPersonName(interest.userId, `Usuário ${interest.userId}`)}
                        />
                      </span>
                      <span className={`${styles.statusBadge} ${
                        interest.status === 'ACCEPTED'
                          ? styles.statusSuccess
                          : interest.status === 'REJECTED'
                            ? styles.statusMuted
                            : styles.statusPending
                      }`}>
                        {interest.status === 'ACCEPTED'
                          ? 'Aceita'
                          : interest.status === 'REJECTED'
                            ? 'Recusada'
                            : 'Pendente'}
                      </span>
                      {interest.status === 'PENDING' && (
                        <ActionButtons
                          disabled={isWorking}
                          onAccept={() => void runAction(
                            () => reviewProposalInterest(interest.id, 'ACCEPTED'),
                            'Solicitação aceita.',
                          )}
                          onReject={() => void runAction(
                            () => reviewProposalInterest(interest.id, 'REJECTED'),
                            'Solicitação recusada.',
                          )}
                        />
                      )}
                    </div>
                  )
                }) : <p className={styles.emptyInline}>Ainda não há solicitações para esta proposta.</p>}
              </div>
              {proposal.status !== 'CLOSED' && (
                <div className={styles.cardFooter}>
                  <button
                    className={styles.secondaryButton}
                    disabled={isWorking}
                    onClick={() => void runAction(
                      () => closeProposal(proposal.id),
                      'Proposta encerrada.',
                    )}
                    type="button"
                  >
                    Encerrar proposta
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    )
  }

  function renderTeacherOpportunities() {
    if (!data.opportunities.length) {
      return <p className={styles.emptyState}>As oportunidades que você publicar aparecerão aqui.</p>
    }

    return (
      <div className={styles.itemList}>
        {data.opportunities.map((opportunity) => {
          const applicants = data.candidaciesByOpportunity[opportunity.id] ?? []
          return (
            <article className={styles.managementCard} key={opportunity.id}>
              <div className={styles.cardHeading}>
                <div>
                  <h3>{opportunity.title}</h3>
                  <p>{applicants.length} {applicants.length === 1 ? 'discente inscrito' : 'discentes inscritos'} · {opportunity.positions} vagas</p>
                </div>
                <span className={`${styles.statusBadge} ${
                  opportunity.status === 'OPEN' ? styles.statusSuccess : styles.statusMuted
                }`}>
                  {opportunity.status === 'OPEN' ? 'Inscrições abertas' : 'Encerrada'}
                </span>
              </div>
              <div className={styles.metadataRow}>
                <span>{opportunity.remuneration > 0
                  ? `${formatCurrency(opportunity.remuneration)} por mês`
                  : 'Voluntária'}</span>
                <span>{opportunity.workloadHours} horas semanais</span>
                <span>{opportunity.applicationDeadline
                  ? `Prazo: ${new Intl.DateTimeFormat('pt-BR').format(new Date(`${opportunity.applicationDeadline.slice(0, 10)}T12:00:00`))}`
                  : 'Prazo não informado'}</span>
              </div>
              <div className={styles.requestList}>
                <h4>Candidatos</h4>
                {applicants.length ? applicants.map((candidacy) => (
                  <div className={styles.requestRow} key={candidacy.id}>
                    <span>
                      <PersonLink
                        id={candidacy.studentId}
                        name={getPersonName(candidacy.studentId, `Discente ${candidacy.studentId}`)}
                      />
                    </span>
                    <span className={`${styles.statusBadge} ${getStatusClass(candidacy.status)}`}>
                      {candidacyStatusLabels[candidacy.status]}
                    </span>
                    <div className={styles.rowActions}>
                      {candidacy.status === 'FINAL_REVIEW' ? (
                        <ActionButtons
                          disabled={isWorking}
                          onAccept={() => void runAction(
                            () => reviewCandidacy(candidacy.id, 'APPROVED'),
                            'Discente aprovado.',
                          )}
                          onReject={() => void runAction(
                            () => reviewCandidacy(candidacy.id, 'REJECTED'),
                            'Candidatura recusada.',
                          )}
                        />
                      ) : nextCandidacyStatuses[candidacy.status].length > 0 ? (
                        <button
                          className={styles.secondaryButton}
                          disabled={isWorking}
                          onClick={() => openPhaseEditor(candidacy)}
                          type="button"
                        >
                          Atualizar fase
                        </button>
                      ) : null}
                      <button
                        className={styles.secondaryButton}
                        disabled={isWorking}
                        onClick={() => openNotificationEditor(candidacy)}
                        type="button"
                      >
                        <Mail size={14} /> Notificar
                      </button>
                    </div>
                  </div>
                )) : <p className={styles.emptyInline}>Nenhum discente se candidatou a esta oportunidade.</p>}
              </div>
              {opportunity.status !== 'FINISHED' && (
                <div className={styles.cardFooter}>
                  <button
                    className={styles.secondaryButton}
                    disabled={isWorking}
                    onClick={() => setEditOpportunityTarget(opportunity)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className={styles.secondaryButton}
                    disabled={isWorking}
                    onClick={() => void runAction(
                      () => updateOpportunityStatus(
                        opportunity.id,
                        opportunity.status === 'OPEN' ? 'CLOSED' : 'OPEN',
                      ),
                      opportunity.status === 'OPEN' ? 'Inscrições encerradas.' : 'Inscrições reabertas.',
                    )}
                    type="button"
                  >
                    {opportunity.status === 'OPEN' ? 'Encerrar inscrições' : 'Reabrir inscrições'}
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    )
  }

  function renderTeacherInterests() {
    if (!teacherInterests.length) {
      return <p className={styles.emptyState}>As orientações oferecidas por você aparecerão aqui.</p>
    }

    return (
      <div className={styles.itemList}>
        {teacherInterests.map((interest) => {
          const proposal = data.proposals.find((item) => item.id === interest.projectProposalId)
          return (
            <article className={styles.itemCard} key={interest.id}>
              <span className={`${styles.itemIcon} ${styles.orientationIcon}`}><UsersRound size={18} /></span>
              <div className={styles.itemMain}>
                <strong>{proposal?.title ?? 'Proposta de aluno'}</strong>
                <span>
                  Autor:{' '}
                  {proposal
                    ? <PersonLink
                      id={proposal.studentId}
                      name={getPersonName(proposal.studentId, `Discente ${proposal.studentId}`)}
                    />
                    : 'Não informado'}
                </span>
              </div>
              <span className={`${styles.statusBadge} ${
                interest.status === 'ACCEPTED'
                  ? styles.statusSuccess
                  : interest.status === 'REJECTED'
                    ? styles.statusMuted
                    : styles.statusPending
              }`}>
                {interest.status === 'ACCEPTED'
                  ? 'Aceita'
                  : interest.status === 'REJECTED'
                    ? 'Recusada'
                    : 'Aguardando resposta'}
              </span>
            </article>
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link className={styles.brand} to="/" aria-label="Oportuniza início">
            <span className={styles.brandMark}>
              <GraduationCap size={21} strokeWidth={2.2} />
            </span>
            <span className={styles.brandName}>oportuniza<span>.</span></span>
          </Link>
          <div className={styles.headerActions}>
            <ProjectsAndProcessesLink />
            <NotificationMenu />
            <button
              aria-label="Sair da conta"
              className={styles.logoutButton}
              onClick={logout}
              type="button"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.pageHeading}>
          <div>
            <span className={styles.eyebrow}>ACOMPANHAMENTO ACADÊMICO</span>
            <h1>Meus Projetos e Processos</h1>
            <p>
              {user.role === 'STUDENT'
                ? 'Acompanhe suas candidaturas, propostas e projetos ativos.'
                : 'Gerencie suas oportunidades, candidatos e orientações.'}
            </p>
          </div>
          {user.role === 'PROFESSOR' && (
            <button
              className={styles.primaryButton}
              onClick={() => {
                setActionError(null)
                setIsCreateOpportunityOpen(true)
              }}
              type="button"
            >
              <Plus size={16} /> Lançar oportunidade
            </button>
          )}
        </div>

        <section className={styles.summaryGrid} aria-label="Resumo">
          <button
            aria-pressed={activeDashboardTab === dashboardTabs[0].id}
            className={`${styles.summaryCard} ${activeDashboardTab === dashboardTabs[0].id ? styles.summaryCardActive : ''}`}
            onClick={() => setSelectedDashboardTab(dashboardTabs[0].id)}
            type="button"
          >
            <span className={`${styles.summaryIcon} ${styles.projectIcon}`}><FolderKanban size={18} /></span>
            <div><small>Projetos ativos</small><strong>{activeProjects.length + approvedCandidacies.length + activeCollaborations.length}</strong></div>
          </button>
          <button
            aria-pressed={activeDashboardTab === dashboardTabs[1].id}
            className={`${styles.summaryCard} ${activeDashboardTab === dashboardTabs[1].id ? styles.summaryCardActive : ''}`}
            onClick={() => setSelectedDashboardTab(dashboardTabs[1].id)}
            type="button"
          >
            <span className={`${styles.summaryIcon} ${styles.pendingIcon}`}><Clock3 size={18} /></span>
            <div>
              <small>{user.role === 'STUDENT' ? 'Candidaturas pendentes' : 'Candidatos em seleção'}</small>
              <strong>{pendingCandidacies.length}</strong>
            </div>
          </button>
          <button
            aria-pressed={activeDashboardTab === dashboardTabs[2].id}
            className={`${styles.summaryCard} ${activeDashboardTab === dashboardTabs[2].id ? styles.summaryCardActive : ''}`}
            onClick={() => setSelectedDashboardTab(dashboardTabs[2].id)}
            type="button"
          >
            <span className={`${styles.summaryIcon} ${styles.proposalIcon}`}><UsersRound size={18} /></span>
            <div>
              <small>{user.role === 'STUDENT' ? 'Minhas propostas' : 'Orientações oferecidas'}</small>
              <strong>{user.role === 'STUDENT' ? myProposals.length : teacherInterests.length}</strong>
            </div>
          </button>
        </section>

        {(error || notificationError || actionError) && (
          <div className={styles.errorBanner} role="alert">
            <span>{actionError ?? notificationError ?? error}</span>
            {error && <button onClick={() => void reload()} type="button">Tentar novamente</button>}
          </div>
        )}
        {actionNotice && <p className={styles.successBanner} role="status">{actionNotice}</p>}

        {isLoading ? (
          <p className={styles.loadingState} role="status">Carregando seu painel...</p>
        ) : (
          <>
            <div className={styles.dashboardTabs} role="tablist" aria-label="Seções do painel">
              {dashboardTabs.map((tab) => (
                <button
                  aria-controls="my-projects-tab-panel"
                  aria-selected={activeDashboardTab === tab.id}
                  className={`${styles.dashboardTab} ${
                    activeDashboardTab === tab.id ? styles.dashboardTabActive : ''
                  }`}
                  id={`dashboard-tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => setSelectedDashboardTab(tab.id)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                  <span className={styles.dashboardTabCount}>{tab.count}</span>
                </button>
              ))}
            </div>
            <section
              aria-labelledby={`dashboard-tab-${activeDashboardTab}`}
              className={styles.section}
              id="my-projects-tab-panel"
              role="tabpanel"
            >
              {activeDashboardTab === 'student-projects' && renderActiveProjects()}
              {activeDashboardTab === 'student-candidacies' && renderStudentCandidacies()}
              {activeDashboardTab === 'student-proposals' && renderStudentProposals()}
              {activeDashboardTab === 'teacher-opportunities' && renderTeacherOpportunities()}
              {activeDashboardTab === 'teacher-projects' && renderActiveProjects()}
              {activeDashboardTab === 'teacher-orientations' && renderTeacherInterests()}
            </section>
          </>
        )}
        <button className={styles.reloadButton} onClick={() => void reload()} type="button">
          <RefreshCw size={14} /> Atualizar painel
        </button>
      </main>
      {viewTarget && (
        <SubmissionViewDialog
          deliverable={viewTarget.deliverable}
          onClose={() => setViewTarget(null)}
          submission={viewTarget.submission}
        />
      )}
      {uploadTarget && (
        <DeliverableUploadDialog
          deliverable={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSubmit={async (filePath) => {
            const result = await submitDeliverable(uploadTarget.id, filePath)
            if (result.success) setActionNotice('Arquivo registrado para este entregável.')
            else setActionError(result.message)
            return result
          }}
        />
      )}
      {phaseTarget && (
        <CandidacyPhaseDialog
          candidacy={phaseTarget}
          message={phaseMessage}
          onClose={() => setPhaseTarget(null)}
          onMessageChange={setPhaseMessage}
          onStatusChange={setPhaseValue}
          error={actionError}
          onSubmit={async () => {
            const success = await runAction(
              () => reviewCandidacy(phaseTarget.id, phaseValue, phaseMessage),
              `Fase atualizada para ${candidacyStatusLabels[phaseValue].toLocaleLowerCase('pt-BR')}.`,
            )
            if (success) setPhaseTarget(null)
            return success
          }}
          status={phaseValue}
          statuses={nextCandidacyStatuses[phaseTarget.status]}
          isSubmitting={isWorking}
        />
      )}
      {notificationTarget && (
        <CandidacyNotificationDialog
          error={actionError}
          isSubmitting={isWorking}
          message={notificationMessage}
          onClose={() => setNotificationTarget(null)}
          onMessageChange={setNotificationMessage}
          onSubmit={submitCandidacyNotification}
          onTitleChange={setNotificationTitle}
          title={notificationTitle}
          studentName={getPersonName(
            notificationTarget.studentId,
            `Discente ${notificationTarget.studentId}`,
          )}
        />
      )}
      {createDeliverableTarget && (
        <CreateDeliverableDialog
          onClose={() => setCreateDeliverableTarget(null)}
          onCreate={async (input) => {
            const result = await createDeliverable(createDeliverableTarget.id, input)
            if (result.success) setActionNotice('Entregável criado com sucesso.')
            else setActionError(result.message)
            return result
          }}
          projectTitle={createDeliverableTarget.title}
        />
      )}
      {editOpportunityTarget && (
        <EditOpportunityDialog
          opportunity={editOpportunityTarget}
          onClose={() => setEditOpportunityTarget(null)}
          onSave={async (input) => {
            const result = await editOpportunity(editOpportunityTarget.id, input)
            if (result.success) setActionNotice('Oportunidade atualizada com sucesso.')
            else setActionError(result.message)
            return result
          }}
        />
      )}
      {user.role === 'PROFESSOR' && isCreateOpportunityOpen && (
        <OpportunityCreateDialog
          onClose={() => setIsCreateOpportunityOpen(false)}
          onCreate={async (input) => {
            const result = await createOpportunity(input)
            if (result.success) {
              setActionError(null)
              setActionNotice('Oportunidade publicada com sucesso.')
            } else {
              setActionError(result.message)
            }
            return result
          }}
        />
      )}
    </div>
  )
}

function OpportunityCreateDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (input: OpportunityCreateRequest) => Promise<ServiceResult<OpportunityResponse>>
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<OpportunityType>('RESEARCH')
  const [description, setDescription] = useState('')
  const [positions, setPositions] = useState('1')
  const [workloadHours, setWorkloadHours] = useState('12')
  const [applicationDeadline, setApplicationDeadline] = useState('')
  const [remunerationMode, setRemunerationMode] = useState<'PAID' | 'VOLUNTEER'>('PAID')
  const [remuneration, setRemuneration] = useState('')
  const [requirements, setRequirements] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await onCreate({
        title: title.trim(),
        type,
        description: description.trim(),
        positions: Number(positions),
        workloadHours: Number(workloadHours),
        applicationDeadline,
        remuneration: remunerationMode === 'PAID' ? Number(remuneration) : 0,
        requirements: requirements.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
        status: 'OPEN',
        publishedAt: formatLocalDateTime(new Date()),
      })
      if (result.success) onClose()
      else setError(result.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={styles.dialogBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
      role="presentation"
    >
      <section
        aria-describedby="create-opportunity-description"
        aria-labelledby="create-opportunity-title"
        aria-modal="true"
        className={`${styles.dialog} ${styles.wideDialog}`}
        role="dialog"
      >
        <button
          aria-label="Fechar formulário"
          className={styles.dialogClose}
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
        <h2 id="create-opportunity-title">Lançar oportunidade</h2>
        <p id="create-opportunity-description">
          Publique uma oportunidade para estudantes da UFERSA.
        </p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label className={styles.dialogField}>
            Título
            <input
              maxLength={150}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Monitoria de programação introdutória"
              required
              value={title}
            />
          </label>
          <label className={styles.dialogField}>
            Tipo / modalidade
            <select
              onChange={(event) => {
                const option = createOpportunityTypes.find((item) => item.value === event.target.value)
                if (option) setType(option.value)
              }}
              value={type}
            >
              {createOpportunityTypes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className={styles.dialogField}>
            Descrição
            <textarea
              maxLength={5000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descreva o projeto, as atividades e o perfil buscado."
              required
              rows={4}
              value={description}
            />
          </label>
          <div className={styles.dialogGrid}>
            <label className={styles.dialogField}>
              Número de vagas
              <input
                max={100}
                min={1}
                onChange={(event) => setPositions(event.target.value)}
                required
                type="number"
                value={positions}
              />
            </label>
            <label className={styles.dialogField}>
              Carga horária semanal
              <input
                max={60}
                min={0}
                onChange={(event) => setWorkloadHours(event.target.value)}
                required
                type="number"
                value={workloadHours}
              />
            </label>
            <label className={styles.dialogField}>
              Prazo de inscrição
              <input
                onChange={(event) => setApplicationDeadline(event.target.value)}
                required
                type="date"
                value={applicationDeadline}
              />
            </label>
            <label className={styles.dialogField}>
              Remuneração
              <select
                onChange={(event) => setRemunerationMode(
                  event.target.value === 'VOLUNTEER' ? 'VOLUNTEER' : 'PAID',
                )}
                value={remunerationMode}
              >
                <option value="PAID">Remunerada</option>
                <option value="VOLUNTEER">Voluntária</option>
              </select>
            </label>
          </div>
          {remunerationMode === 'PAID' && (
            <label className={styles.dialogField}>
              Valor mensal da bolsa (R$)
              <input
                min={0.01}
                onChange={(event) => setRemuneration(event.target.value)}
                required
                step="0.01"
                type="number"
                value={remuneration}
              />
            </label>
          )}
          <label className={styles.dialogField}>
            Requisitos
            <textarea
              onChange={(event) => setRequirements(event.target.value)}
              placeholder="Separe os requisitos por vírgula ou em linhas diferentes."
              rows={3}
              value={requirements}
            />
          </label>
          {error && <p className={styles.errorBanner} role="alert">{error}</p>}
          <div className={styles.dialogActions}>
            <button disabled={isSubmitting} onClick={onClose} type="button">Cancelar</button>
            <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Publicando...' : 'Publicar oportunidade'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function DeliverableUploadDialog({
  deliverable,
  onClose,
  onSubmit,
}: {
  deliverable: DeliverableResponse
  onClose: () => void
  onSubmit: (filePath: string) => Promise<ServiceResult<SubmissionResponse>>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      setError('Selecione um arquivo PDF para continuar.')
      return
    }
    if (file.type !== 'application/pdf' && !file.name.toLocaleLowerCase('pt-BR').endsWith('.pdf')) {
      setError('O arquivo deve estar no formato PDF.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 15 MB.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const result = await onSubmit(file.name)
      if (result.success) onClose()
      else setError(result.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.dialogBackdrop} onClick={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose()
    }} role="presentation">
      <section
        aria-labelledby="deliverable-upload-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <button
          aria-label="Fechar envio"
          className={styles.dialogClose}
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
        <h2 id="deliverable-upload-title">Enviar: {deliverable.title}</h2>
        <p>Selecione um arquivo PDF de até 15 MB.</p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label className={styles.fileInput}>
            Arquivo do relatório
            <input
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
              type="file"
            />
          </label>
          <p className={styles.dialogNotice}>
            A API atual registra o nome do arquivo, mas não recebe o conteúdo binário.
          </p>
          {error && <p className={styles.errorBanner} role="alert">{error}</p>}
          <div className={styles.dialogActions}>
            <button disabled={isSubmitting} onClick={onClose} type="button">Cancelar</button>
            <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Enviando...' : 'Enviar documento'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function SubmissionViewDialog({
  deliverable,
  submission,
  onClose,
}: {
  deliverable: DeliverableResponse
  submission: SubmissionResponse | undefined
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR').format(
    new Date(`${value.slice(0, 10)}T12:00:00`),
  )

  return (
    <div className={styles.dialogBackdrop} onClick={(event) => {
      if (event.target === event.currentTarget) onClose()
    }} role="presentation">
      <section
        aria-labelledby="submission-view-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <button aria-label="Fechar envio" className={styles.dialogClose} onClick={onClose} type="button">
          <X size={18} />
        </button>
        <h2 id="submission-view-title">{deliverable.title}</h2>
        <dl className={styles.submissionDetails}>
          <div>
            <dt>Status</dt>
            <dd><span className={`${styles.statusBadge} ${styles.statusSuccess}`}>Aprovado</span></dd>
          </div>
          <div><dt>Arquivo enviado</dt><dd>{submission?.filePath ?? 'Não informado'}</dd></div>
          <div><dt>Prazo do entregável</dt><dd>{formatDate(deliverable.deadline)}</dd></div>
          <div>
            <dt>Data do envio</dt>
            <dd>{submission?.submittedAt ? formatDate(submission.submittedAt) : 'Não informada'}</dd>
          </div>
        </dl>
        <div className={styles.dialogActions}>
          <button className={styles.primaryButton} onClick={onClose} type="button">Fechar</button>
        </div>
      </section>
    </div>
  )
}

function EditOpportunityDialog({
  opportunity,
  onClose,
  onSave,
}: {
  opportunity: OpportunityResponse
  onClose: () => void
  onSave: (input: OpportunityPatchRequest) => Promise<ServiceResult<OpportunityResponse>>
}) {
  const [title, setTitle] = useState(opportunity.title)
  const [type, setType] = useState<OpportunityType>(opportunity.type)
  const [description, setDescription] = useState(opportunity.description)
  const [positions, setPositions] = useState(String(opportunity.positions))
  const [workloadHours, setWorkloadHours] = useState(String(opportunity.workloadHours))
  const [remuneration, setRemuneration] = useState(String(opportunity.remuneration))
  const [deadline, setDeadline] = useState(opportunity.applicationDeadline?.slice(0, 10) ?? '')
  const [requirements, setRequirements] = useState(opportunity.requirements.join('\n'))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await onSave({
        title: title.trim(),
        type,
        description: description.trim(),
        positions: Number(positions),
        workloadHours: Number(workloadHours),
        remuneration: Number(remuneration),
        applicationDeadline: deadline || null,
        requirements: requirements.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      })
      if (result.success) onClose()
      else setError(result.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.dialogBackdrop} onClick={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose()
    }} role="presentation">
      <section
        aria-labelledby="edit-opportunity-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <button
          aria-label="Fechar edição"
          className={styles.dialogClose}
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
        <h2 id="edit-opportunity-title">Gerenciar publicação</h2>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label className={styles.dialogField}>
            Título
            <input maxLength={150} onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <label className={styles.dialogField}>
            Modalidade
            <select
              onChange={(event) => {
                const option = opportunityTypes.find((item) => item.value === event.target.value)
                if (option) setType(option.value)
              }}
              value={type}
            >
              {opportunityTypes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className={styles.dialogField}>
            Descrição
            <textarea maxLength={5000} onChange={(event) => setDescription(event.target.value)} required rows={4} value={description} />
          </label>
          <div className={styles.dialogGrid}>
            <label className={styles.dialogField}>
              Número de vagas
              <input max={100} min={1} onChange={(event) => setPositions(event.target.value)} required type="number" value={positions} />
            </label>
            <label className={styles.dialogField}>
              Carga horária semanal
              <input max={60} min={0} onChange={(event) => setWorkloadHours(event.target.value)} required type="number" value={workloadHours} />
            </label>
            <label className={styles.dialogField}>
              Bolsa mensal (R$)
              <input min={0} onChange={(event) => setRemuneration(event.target.value)} required step="0.01" type="number" value={remuneration} />
            </label>
            <label className={styles.dialogField}>
              Prazo de inscrição
              <input onChange={(event) => setDeadline(event.target.value)} type="date" value={deadline} />
            </label>
          </div>
          <label className={styles.dialogField}>
            Requisitos
            <textarea onChange={(event) => setRequirements(event.target.value)} rows={3} value={requirements} />
          </label>
          {error && <p className={styles.errorBanner} role="alert">{error}</p>}
          <div className={styles.dialogActions}>
            <button disabled={isSubmitting} onClick={onClose} type="button">Cancelar</button>
            <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function CandidacyPhaseDialog({
  candidacy,
  statuses,
  status,
  message,
  error,
  isSubmitting,
  onClose,
  onStatusChange,
  onMessageChange,
  onSubmit,
}: {
  candidacy: CandidacyResponse
  statuses: Exclude<CandidacyStatus, 'WITHDRAWN'>[]
  status: Exclude<CandidacyStatus, 'WITHDRAWN'>
  message: string
  error: string | null
  isSubmitting: boolean
  onClose: () => void
  onStatusChange: (status: Exclude<CandidacyStatus, 'WITHDRAWN'>) => void
  onMessageChange: (message: string) => void
  onSubmit: () => Promise<boolean>
}) {
  return (
    <div className={styles.dialogBackdrop} onClick={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose()
    }} role="presentation">
      <section
        aria-labelledby="candidacy-phase-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <button
          aria-label="Fechar atualização"
          className={styles.dialogClose}
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
        <h2 id="candidacy-phase-title">Atualizar fase do candidato</h2>
        <p>Discente {candidacy.studentId} · {candidacyStatusLabels[candidacy.status]}</p>
        <label className={styles.dialogField}>
          Nova etapa da seleção
          <select
            onChange={(event) => {
              const nextStatus = statuses.find((item) => item === event.target.value)
              if (nextStatus) onStatusChange(nextStatus)
            }}
            value={status}
          >
            {statuses.map((item) => (
              <option key={item} value={item}>{candidacyStatusLabels[item]}</option>
            ))}
          </select>
        </label>
        <label className={styles.dialogField}>
          Instruções / mensagem ao discente
          <textarea
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="Informe orientações ou detalhes da próxima etapa."
            rows={4}
            value={message}
          />
        </label>
        {error && <p className={styles.errorBanner} role="alert">{error}</p>}
        <div className={styles.dialogActions}>
          <button disabled={isSubmitting} onClick={onClose} type="button">Cancelar</button>
          <button
            className={styles.primaryButton}
            disabled={isSubmitting}
            onClick={() => void onSubmit()}
            type="button"
          >
            {isSubmitting ? 'Atualizando...' : 'Atualizar fase'}
          </button>
        </div>
      </section>
    </div>
  )
}

function CandidacyNotificationDialog({
  studentName,
  title,
  message,
  error,
  isSubmitting,
  onTitleChange,
  onMessageChange,
  onClose,
  onSubmit,
}: {
  studentName: string
  title: string
  message: string
  error: string | null
  isSubmitting: boolean
  onTitleChange: (title: string) => void
  onMessageChange: (message: string) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className={styles.dialogBackdrop} onClick={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose()
    }} role="presentation">
      <section
        aria-labelledby="candidacy-notification-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <button
          aria-label="Fechar notificação"
          className={styles.dialogClose}
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
        <h2 id="candidacy-notification-title">Enviar mensagem / notificação</h2>
        <form onSubmit={onSubmit}>
          <label className={styles.dialogField}>
            Destinatário
            <input readOnly value={studentName} />
          </label>
          <label className={styles.dialogField}>
            Assunto
            <input
              maxLength={120}
              onChange={(event) => onTitleChange(event.target.value)}
              required
              value={title}
            />
          </label>
          <label className={styles.dialogField}>
            Mensagem
            <textarea
              maxLength={2000}
              onChange={(event) => onMessageChange(event.target.value)}
              required
              rows={4}
              value={message}
            />
          </label>
          {error && <p className={styles.errorBanner} role="alert">{error}</p>}
          <div className={styles.dialogActions}>
            <button disabled={isSubmitting} onClick={onClose} type="button">Cancelar</button>
            <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Enviando...' : 'Enviar notificação'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function CreateDeliverableDialog({
  projectTitle,
  onClose,
  onCreate,
}: {
  projectTitle: string
  onClose: () => void
  onCreate: (input: DeliverableCreateRequest) => Promise<ServiceResult<DeliverableResponse>>
}) {
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [minimumDate] = useState(() => new Date().toISOString().slice(0, 10))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await onCreate({ title: title.trim(), deadline })
      if (result.success) onClose()
      else setError(result.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.dialogBackdrop} onClick={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose()
    }} role="presentation">
      <section
        aria-labelledby="deliverable-create-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <button
          aria-label="Fechar formulário"
          className={styles.dialogClose}
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
        <h2 id="deliverable-create-title">Novo entregável</h2>
        <p>{projectTitle}</p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label className={styles.dialogField}>
            Título
            <input
              maxLength={150}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <label className={styles.dialogField}>
            Prazo limite
            <input
              min={minimumDate}
              onChange={(event) => setDeadline(event.target.value)}
              required
              type="date"
              value={deadline}
            />
          </label>
          {error && <p className={styles.errorBanner} role="alert">{error}</p>}
          <div className={styles.dialogActions}>
            <button disabled={isSubmitting} onClick={onClose} type="button">Cancelar</button>
            <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Salvando...' : 'Criar entregável'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default MyProjectsPage
