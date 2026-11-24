import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowDownWideNarrow,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LockKeyhole,
  LogOut,
  Search,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { departmentLabels, departments, courseLabels } from '../../constants/domainLabels'
import { useCandidacies } from '../../hooks/useCandidacies'
import { useNotificationActions } from '../../hooks/useNotificationActions'
import { useOpportunities } from '../../hooks/useOpportunities'
import { useOpportunityProfessors } from '../../hooks/useOpportunityProfessors'
import { useProposalInterests } from '../../hooks/useProposalInterests'
import { useProjectProposalAuthors } from '../../hooks/useProjectProposalAuthors'
import { useProjectProposals } from '../../hooks/useProjectProposals'
import ProposalInvitePicker from '../../components/ProposalInvitePicker'
import { canViewStudentProposal } from '../../services/studentProposalVisibility'
import { ProjectsAndProcessesLink } from '../../UI/Header'
import CustomSelect from '../../UI/CustomSelect'
import NotificationMenu from '../../UI/NotificationMenu'
import styles from './Home.module.css'
import type {
  OpportunityResponse,
  OpportunityType,
  ProjectProposalCard as ProjectProposalCardData,
  ProjectProposalCategory,
  ProjectProposalCreateRequest,
  ProjectProposalInvite,
  ProposalInviteDecision,
  ProjectProposalStatus,
  Department,
  UserProfile,
} from '../../types/domain'
import type { ServiceResult } from '../../services/result'

interface HomePageProps {
  user: UserProfile
  onLogout: () => void
}

function getProposalInviteNavigationState(value: unknown): { proposalId: number } | null {
  if (typeof value !== 'object' || value === null || !('type' in value) || value.type !== 'proposal-invite') {
    return null
  }
  if (
    !('proposalId' in value)
    || typeof value.proposalId !== 'number'
    || !Number.isSafeInteger(value.proposalId)
  ) return null
  return { proposalId: value.proposalId }
}

const categoryLabels: Record<OpportunityType, string> = {
  RESEARCH: 'Pesquisa',
  MONITORING: 'Monitoria',
  EXTENSION: 'Extensão',
  TEACHING: 'Ensino',
  VOLUNTEER: 'Voluntariado',
  OTHER: 'Outras',
}

const categoryStyles: Record<OpportunityType, string> = {
  RESEARCH: styles['category-research'],
  MONITORING: styles['category-monitoring'],
  EXTENSION: styles['category-extension'],
  TEACHING: styles['category-teaching'],
  VOLUNTEER: styles['category-volunteer'],
  OTHER: styles['category-other'],
}

const categoryOrder: OpportunityType[] = [
  'RESEARCH',
  'EXTENSION',
  'MONITORING',
  'TEACHING',
  'OTHER',
]

type RemunerationFilter = 'PAID' | 'VOLUNTEER'
type FeedSort = 'RECENT' | 'SCHOLARSHIP' | 'POSITIONS' | 'TITLE'
const feedSortLabels: Record<FeedSort, string> = {
  RECENT: 'Mais recentes',
  SCHOLARSHIP: 'Maior valor de bolsa',
  POSITIONS: 'Mais vagas disponíveis',
  TITLE: 'Ordem alfabética (A–Z)',
}

const remunerationLabels: Record<RemunerationFilter, string> = {
  PAID: 'Com bolsa',
  VOLUNTEER: 'Voluntária',
}

const remunerationFilterOrder: RemunerationFilter[] = ['PAID', 'VOLUNTEER']

type HomeTab = 'OPPORTUNITIES' | 'PROPOSALS'

const proposalCategoryLabels: Record<ProjectProposalCategory, string> = {
  RESEARCH: 'Pesquisa',
  EXTENSION: 'Extensão',
  INNOVATION: 'Inovação',
}

const projectProposalCategoryOptions: Array<{ value: ProjectProposalCategory; label: string }> = [
  { value: 'RESEARCH', label: 'Pesquisa' },
  { value: 'EXTENSION', label: 'Extensão' },
  { value: 'INNOVATION', label: 'Inovação' },
]

const proposalCategoryStyles: Record<ProjectProposalCategory, string> = {
  RESEARCH: styles['category-research'],
  EXTENSION: styles['category-extension'],
  INNOVATION: styles['category-innovation'],
}

const proposalStatusLabels: Record<ProjectProposalStatus, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em desenvolvimento',
  CLOSED: 'Encerrada',
}

type ProposalCategoryFilter = ProjectProposalCategory | 'UNCLASSIFIED'
type ProposalAdvisorFilter = 'SEEKING' | 'NOT_SEEKING' | 'UNSPECIFIED'

const proposalCategoryFilterOrder: ProposalCategoryFilter[] = [
  'RESEARCH',
  'EXTENSION',
  'INNOVATION',
  'UNCLASSIFIED',
]

const proposalCategoryFilterLabels: Record<ProposalCategoryFilter, string> = {
  RESEARCH: 'Pesquisa',
  EXTENSION: 'Extensão',
  INNOVATION: 'Inovação',
  UNCLASSIFIED: 'Não categorizada',
}

const proposalAdvisorFilterOrder: ProposalAdvisorFilter[] = [
  'SEEKING',
  'NOT_SEEKING',
  'UNSPECIFIED',
]

const proposalAdvisorFilterLabels: Record<ProposalAdvisorFilter, string> = {
  SEEKING: 'Buscam orientador',
  NOT_SEEKING: 'Não busca orientador',
  UNSPECIFIED: 'Não informado',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return 'Prazo não informado'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
    new Date(`${value.slice(0, 10)}T12:00:00`),
  )
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function compareOpportunitiesByScholarship(
  left: OpportunityResponse,
  right: OpportunityResponse,
) {
  const leftIsVolunteer = left.remuneration <= 0
  const rightIsVolunteer = right.remuneration <= 0
  if (leftIsVolunteer !== rightIsVolunteer) return leftIsVolunteer ? 1 : -1
  return right.remuneration - left.remuneration
}

function OpportunityCard({
  opportunity,
  isOwner,
  professorName,
  onOpen,
}: {
  opportunity: OpportunityResponse
  isOwner: boolean
  professorName: string
  onOpen: (opportunity: OpportunityResponse) => void
}) {
  return (
    <article className={styles['opportunity-card']}>
      <div className={styles['opportunity-card-top']}>
        <div className={styles['opportunity-badges']}>
          <span className={`${styles['category-badge']} ${categoryStyles[opportunity.type]}`}>
            {categoryLabels[opportunity.type]}
          </span>
          <span className={`${styles['remuneration-badge']} ${
            opportunity.remuneration > 0
              ? styles['remuneration-paid']
              : styles['remuneration-voluntary']
          }`}>
            {opportunity.remuneration > 0 ? 'Remunerada' : 'Voluntária'}
          </span>
          <span className={`${styles['open-badge']} ${
            opportunity.status === 'CLOSED' ? styles['closed-badge'] : ''
          }`}>
            <span /> {opportunity.status === 'OPEN' ? 'Inscrições abertas' : 'Encerrada'}
          </span>
        </div>
      </div>

      <h2>{opportunity.title}</h2>
      <p className={styles['opportunity-owner']}>
        Docente responsável:{' '}
        <ResponsibleProfessorLink professorId={opportunity.professorId} professorName={professorName} />
      </p>
      <p className={styles['opportunity-description']}>{opportunity.description}</p>

      <div className={styles['opportunity-meta']}>
        <span><UsersRound size={16} /> {opportunity.positions} {opportunity.positions === 1 ? 'vaga' : 'vagas'}</span>
        <span><Clock3 size={16} /> {opportunity.workloadHours}h por semana</span>
        <span><CalendarDays size={16} /> Até {formatDate(opportunity.applicationDeadline)}</span>
      </div>

      <div className={styles['opportunity-card-bottom']}>
        <div className={styles['opportunity-reward']}>
          <span>{opportunity.remuneration > 0 ? 'Bolsa mensal' : 'Modalidade'}</span>
          <strong>{opportunity.remuneration > 0 ? formatCurrency(opportunity.remuneration) : 'Voluntária'}</strong>
        </div>
        {isOwner ? (
          <span className={styles['owner-opportunity']}><BriefcaseBusiness size={15} /> Sua oportunidade</span>
        ) : (
          <button
            className={styles['opportunity-action']}
            onClick={() => onOpen(opportunity)}
            type="button"
          >
            Ver oportunidade <ArrowRight size={16} />
          </button>
        )}
      </div>
    </article>
  )
}

function ProjectProposalAuthorLinks({
  authorIds,
  authorNames,
  isLoading,
}: {
  authorIds: number[]
  authorNames: Record<number, string>
  isLoading: boolean
}) {
  return (
    <>
      {authorIds.map((authorId, index) => (
        <span key={authorId}>
          {index > 0 && ', '}
          <Link
            onClick={(event) => event.stopPropagation()}
            to={`/perfil/${authorId}`}
          >
            {authorNames[authorId] ?? (isLoading ? 'Carregando autor...' : `Discente ${authorId}`)}
          </Link>
        </span>
      ))}
    </>
  )
}

function ProjectProposalCardView({
  proposal,
  authorNames,
  authorsLoading,
  onOpen,
}: {
  proposal: ProjectProposalCardData
  authorNames: Record<number, string>
  authorsLoading: boolean
  onOpen: (proposal: ProjectProposalCardData) => void
}) {
  const openProposal = () => onOpen(proposal)

  return (
    <article
      className={styles['opportunity-card']}
      onClick={openProposal}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openProposal()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles['opportunity-card-top']}>
        <div className={styles['opportunity-badges']}>
          <span className={`${styles['category-badge']} ${proposal.category
            ? proposalCategoryStyles[proposal.category]
            : styles['category-other']}`}>
            {proposal.category ? proposalCategoryLabels[proposal.category] : 'Proposta de aluno'}
          </span>
          {proposal.isPrivate && (
            <span className={styles['private-badge']}><LockKeyhole size={13} /> Privada</span>
          )}
          <span className={`${styles['open-badge']} ${
            proposal.status === 'CLOSED' ? styles['closed-badge'] : ''
          }`}>
            <span /> {proposalStatusLabels[proposal.status]}
          </span>
        </div>
      </div>

      <h2>{proposal.title}</h2>
      <p className={styles['opportunity-owner']}>
        Proposto por:{' '}
        <ProjectProposalAuthorLinks
          authorIds={proposal.authorIds}
          authorNames={authorNames}
          isLoading={authorsLoading}
        />
      </p>
      <p className={styles['opportunity-description']}>{proposal.description}</p>

      <div className={styles['proposal-status-list']}>
        <span>
          <UsersRound size={15} />
          {proposal.seeksAdvisor === null
            ? 'Busca por orientador não informada'
            : proposal.seeksAdvisor
              ? 'Busca orientador'
              : 'Não busca orientador'}
        </span>
        <span>
          <CalendarDays size={15} />
          Status: {proposalStatusLabels[proposal.status]}
        </span>
      </div>

      <div className={styles['proposal-card-footer']}>
        <div className={styles['proposal-skills']}>
          {proposal.desiredSkills.map((skill) => (
            <span className={styles['proposal-skill']} key={skill}>{skill}</span>
          ))}
        </div>
        <span className={styles['opportunity-action']}>Ver proposta <ArrowRight size={16} /></span>
      </div>
    </article>
  )
}

function ResponsibleProfessorLink({
  professorId,
  professorName,
}: {
  professorId: number
  professorName: string
}) {
  return (
    <Link onClick={(event) => event.stopPropagation()} to={`/perfil/${professorId}`}>
      {professorName}
    </Link>
  )
}

function formatLocalDateTime(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    + `T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
}

interface ProjectProposalFormState {
  title: string
  category: ProjectProposalCategory
  description: string
  desiredSkills: string
  seeksAdvisor: boolean
  isPrivate: boolean
  invites: ProjectProposalInvite[]
}

const initialProjectProposalForm: ProjectProposalFormState = {
  title: '',
  category: 'RESEARCH',
  description: '',
  desiredSkills: '',
  seeksAdvisor: true,
  isPrivate: false,
  invites: [],
}

function ProjectProposalCreateDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (input: ProjectProposalCreateRequest) => Promise<ServiceResult<ProjectProposalCardData>>
}) {
  const [form, setForm] = useState(initialProjectProposalForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField<Key extends keyof ProjectProposalFormState>(
    key: Key,
    value: ProjectProposalFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const desiredSkills = [...new Set(
        form.desiredSkills
          .split(/[,\n]/)
          .map((skill) => skill.trim())
          .filter(Boolean),
      )]
      const result = await onCreate({
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        desiredSkills,
        seeksAdvisor: form.seeksAdvisor,
        seekingAdvisor: form.seeksAdvisor,
        isPrivate: form.isPrivate,
        invites: form.invites,
        status: 'OPEN',
        publishedAt: formatLocalDateTime(new Date()),
      })

      if (!result.success) {
        setError(result.message)
        return
      }

      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={styles['dialog-backdrop']}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
      role="presentation"
    >
      <section
        aria-describedby="create-proposal-description"
        aria-labelledby="create-proposal-title"
        aria-modal="true"
        className={`${styles['opportunity-dialog']} ${styles['create-opportunity-dialog']}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Fechar formulário"
          className={styles['dialog-close']}
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          <X size={19} />
        </button>
        <div className={styles['create-dialog-heading']}>
          <span className={styles['create-dialog-icon']}><Sparkles size={18} /></span>
          <div>
            <h2 id="create-proposal-title">Propor uma ideia</h2>
            <p id="create-proposal-description">
              Compartilhe sua proposta e encontre colegas e orientadores.
            </p>
          </div>
        </div>

        <form className={styles['opportunity-form']} onSubmit={(event) => void handleSubmit(event)}>
          <label className={styles['form-field']}>
            <span>Título</span>
            <input
              maxLength={150}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Ex.: Laboratório aberto de tecnologias assistivas"
              required
              value={form.title}
            />
          </label>

          <label className={styles['form-field']}>
            <span>Categoria</span>
            <select
              onChange={(event) => {
                const selectedOption = projectProposalCategoryOptions.find(
                  (option) => option.value === event.target.value,
                )
                if (selectedOption) updateField('category', selectedOption.value)
              }}
              value={form.category}
            >
              {projectProposalCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className={styles['form-field']}>
            <span>Descrição da ideia</span>
            <textarea
              maxLength={5000}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Descreva o problema, a ideia e o impacto esperado."
              required
              rows={4}
              value={form.description}
            />
          </label>

          <label className={styles['form-field']}>
            <span>Competências buscadas</span>
            <textarea
              onChange={(event) => updateField('desiredSkills', event.target.value)}
              placeholder="Separe as competências por vírgula ou por linha."
              rows={3}
              value={form.desiredSkills}
            />
          </label>

          <label className={styles['proposal-advisor-option']}>
            <input
              checked={form.seeksAdvisor}
              className={styles['checkbox-input']}
              onChange={(event) => updateField('seeksAdvisor', event.target.checked)}
              type="checkbox"
            />
            <span>Estou buscando um docente orientador</span>
          </label>

          <label className={styles['proposal-advisor-option']}>
            <input
              checked={form.isPrivate}
              className={styles['checkbox-input']}
              onChange={(event) => updateField('isPrivate', event.target.checked)}
              type="checkbox"
            />
            <span>
              Tornar proposta privada
              <small className={styles['privacy-helper']}>
                Outros alunos não poderão ver esta proposta (exceto convidados). Professores continuarão vendo caso
                {' '}“Estou buscando um docente orientador” esteja marcado.
              </small>
            </span>
          </label>
          <ProposalInvitePicker
            invites={form.invites}
            onChange={(invites) => updateField('invites', invites)}
            disabled={isSubmitting}
          />

          {error && <p className={styles['form-error']} role="alert">{error}</p>}

          <div className={styles['form-actions']}>
            <button
              className={styles['form-cancel']}
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button className={styles['form-submit']} disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Publicando...' : 'Publicar proposta'}
              {!isSubmitting && <ArrowRight size={16} />}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function HomePage({ user, onLogout }: HomePageProps) {
  const profile = user.profile
  const location = useLocation()
  const navigate = useNavigate()
  const isProfessor = user.role === 'PROFESSOR'
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<OpportunityType[]>([])
  const [remunerationFilters, setRemunerationFilters] = useState<RemunerationFilter[]>([])
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'ALL'>('ALL')
  const [feedSort, setFeedSort] = useState<FeedSort>('RECENT')
  const [includeClosedProposals, setIncludeClosedProposals] = useState(false)
  const [includeClosed, setIncludeClosed] = useState(false)
  const [proposalCategoryFilters, setProposalCategoryFilters] = useState<ProposalCategoryFilter[]>([])
  const [proposalAdvisorFilters, setProposalAdvisorFilters] = useState<ProposalAdvisorFilter[]>([])
  const [activeTab, setActiveTab] = useState<HomeTab>(
    isProfessor ? 'PROPOSALS' : 'OPPORTUNITIES',
  )
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityResponse | null>(null)
  const [selectedProposalOverride, setSelectedProposal] = useState<ProjectProposalCardData | null>(null)
  const [applicationMessage, setApplicationMessage] = useState<string | null>(null)
  const [notificationActionError, setNotificationActionError] = useState<string | null>(null)
  const [isCreateProposalOpen, setIsCreateProposalOpen] = useState(false)
  const [proposalCreateNotice, setProposalCreateNotice] = useState<string | null>(null)
  const [proposalInterestFeedback, setProposalInterestFeedback] = useState<string | null>(null)
  const [proposalInviteFeedback, setProposalInviteFeedback] = useState<string | null>(null)
  const [isRespondingToInvite, setIsRespondingToInvite] = useState(false)
  const [submittedProposalInterestIds, setSubmittedProposalInterestIds] = useState<number[]>([])
  const { createNotification, markProposalInviteAsRead } = useNotificationActions()
  const {
    opportunities,
    isLoading: opportunitiesLoading,
    error: opportunitiesError,
    reload: reloadOpportunities,
  } = useOpportunities()
  const studentId = user.role === 'STUDENT' ? user.profile.id : null
  const {
    candidacies,
    isLoading: candidaciesLoading,
    error: candidaciesError,
    createForOpportunity,
  } = useCandidacies(studentId)
  const opportunityProfessorIds = useMemo(
    () => opportunities.map((opportunity) => opportunity.professorId),
    [opportunities],
  )
  const {
    profiles: professorProfiles,
    isLoading: professorProfilesLoading,
    error: professorProfilesError,
  } =
    useOpportunityProfessors(opportunityProfessorIds, user)
  const {
    proposals,
    isLoading: proposalsLoading,
    error: proposalsError,
    reload: reloadProposals,
    create: createProjectProposal,
    respondToInvite: respondToProposalInvite,
  } = useProjectProposals()
  const visibleProposals = useMemo(
    () => proposals.filter((proposal) => canViewStudentProposal(proposal, user)),
    [proposals, user],
  )
  const proposalInviteNavigationState = getProposalInviteNavigationState(location.state)
  const navigationProposal = proposalInviteNavigationState && !proposalsLoading
    ? visibleProposals.find((proposal) => proposal.id === proposalInviteNavigationState.proposalId) ?? null
    : null
  const selectedProposal = selectedProposalOverride ?? navigationProposal
  const hasPendingProposalInvite = selectedProposal?.invites.some((invite) => (
    invite.userId === String(profile.id) && invite.status === 'pending'
  )) ?? false
  const {
    createForProposal: createProposalInterest,
    isSubmitting: isOfferingOrientation,
  } = useProposalInterests()
  const proposalAuthorIds = useMemo(
    () => visibleProposals.flatMap((proposal) => proposal.authorIds),
    [visibleProposals],
  )
  const {
    profiles: proposalAuthorProfiles,
    isLoading: proposalAuthorsLoading,
    error: proposalAuthorsError,
  } = useProjectProposalAuthors(proposalAuthorIds, user)
  const proposalAuthorNames = useMemo(
    () => Object.entries(proposalAuthorProfiles).reduce<Record<number, string>>(
      (names, [id, author]) => {
        names[Number(id)] = author.name
        return names
      },
      {},
    ),
    [proposalAuthorProfiles],
  )

  const normalizedQuery = normalizeSearchText(query.trim())
  const searchableOpportunities = useMemo(
    () => opportunities
      .filter((opportunity) => opportunity.status !== 'DRAFT')
      .filter((opportunity) => {
        const searchableText = [
          opportunity.title,
          opportunity.description,
          categoryLabels[opportunity.type],
          professorProfiles[opportunity.professorId]?.name ?? '',
          opportunity.requirements.join(' '),
        ].join(' ')
        return !normalizedQuery || normalizeSearchText(searchableText).includes(normalizedQuery)
      }),
    [normalizedQuery, opportunities, professorProfiles],
  )
  const availabilityOpportunities = useMemo(
    () => searchableOpportunities.filter((opportunity) => (
      includeClosed || opportunity.status === 'OPEN'
    )),
    [includeClosed, searchableOpportunities],
  )
  const matchesOpportunityCategory = (opportunity: OpportunityResponse) => (
    categories.length === 0 || categories.includes(opportunity.type)
  )
  const matchesOpportunityRemuneration = (opportunity: OpportunityResponse) => (
    remunerationFilters.length === 0
      || (opportunity.remuneration > 0 && remunerationFilters.includes('PAID'))
      || (opportunity.remuneration <= 0 && remunerationFilters.includes('VOLUNTEER'))
  )
  const matchesOpportunityDepartment = (opportunity: OpportunityResponse) => (
    departmentFilter === 'ALL'
      || professorProfiles[opportunity.professorId]?.department === departmentFilter
  )
  const opportunityCategoryResults = availabilityOpportunities.filter(
    (opportunity) => matchesOpportunityRemuneration(opportunity)
      && matchesOpportunityDepartment(opportunity),
  )
  const opportunityRemunerationResults = availabilityOpportunities.filter(
    (opportunity) => matchesOpportunityCategory(opportunity)
      && matchesOpportunityDepartment(opportunity),
  )
  const opportunityAvailabilityResults = searchableOpportunities.filter(
    (opportunity) => matchesOpportunityCategory(opportunity)
      && matchesOpportunityRemuneration(opportunity)
      && matchesOpportunityDepartment(opportunity),
  )
  const filteredOpportunities = availabilityOpportunities
    .filter(matchesOpportunityCategory)
    .filter(matchesOpportunityRemuneration)
    .filter(matchesOpportunityDepartment)
    .sort((left, right) => {
      if (feedSort === 'SCHOLARSHIP') return compareOpportunitiesByScholarship(left, right)
      if (feedSort === 'POSITIONS') return right.positions - left.positions
      if (feedSort === 'TITLE') return left.title.localeCompare(right.title, 'pt-BR')
      return (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '')
    })

  const searchableProposals = useMemo(
    () => visibleProposals.filter((proposal) => {
      const searchableText = [
        proposal.title,
        proposal.description,
        proposal.category ? proposalCategoryLabels[proposal.category] : 'Proposta de aluno',
        proposal.desiredSkills.join(' '),
        proposal.authorIds.map((authorId) => proposalAuthorNames[authorId] ?? String(authorId)).join(' '),
      ].join(' ')
      return !normalizedQuery || normalizeSearchText(searchableText).includes(normalizedQuery)
    }),
    [normalizedQuery, proposalAuthorNames, visibleProposals],
  )
  useEffect(() => {
    if (
      !proposalInviteNavigationState
      || proposalsLoading
      || visibleProposals.some((proposal) => proposal.id === proposalInviteNavigationState.proposalId)
    ) return
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
  }, [
    location.hash,
    location.pathname,
    location.search,
    navigate,
    proposalInviteNavigationState,
    proposalsLoading,
    visibleProposals,
  ])
  const clearProposalInviteNavigation = () => {
    if (!proposalInviteNavigationState) return
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
  }
  const closeProposalDetails = () => {
    setSelectedProposal(null)
    clearProposalInviteNavigation()
  }
  const availabilityProposals = useMemo(
    () => searchableProposals.filter((proposal) => (
      includeClosedProposals || proposal.status !== 'CLOSED'
    )),
    [includeClosedProposals, searchableProposals],
  )
  const matchesProposalCategory = (proposal: ProjectProposalCardData) => (
    proposalCategoryFilters.length === 0
      || (proposal.category === null && proposalCategoryFilters.includes('UNCLASSIFIED'))
      || (proposal.category !== null && proposalCategoryFilters.includes(proposal.category))
  )
  const matchesProposalAdvisor = (proposal: ProjectProposalCardData) => (
    proposalAdvisorFilters.length === 0
      || (proposal.seeksAdvisor === true && proposalAdvisorFilters.includes('SEEKING'))
      || (proposal.seeksAdvisor === false && proposalAdvisorFilters.includes('NOT_SEEKING'))
      || (proposal.seeksAdvisor === null && proposalAdvisorFilters.includes('UNSPECIFIED'))
  )
  const proposalCategoryResults = availabilityProposals.filter(matchesProposalAdvisor)
  const proposalAdvisorResults = availabilityProposals.filter(matchesProposalCategory)
  const proposalAvailabilityResults = searchableProposals.filter(
    (proposal) => matchesProposalCategory(proposal) && matchesProposalAdvisor(proposal),
  )
  const filteredProposals = availabilityProposals
    .filter(matchesProposalCategory)
    .filter(matchesProposalAdvisor)
    .sort((left, right) => {
      if (feedSort === 'TITLE') return left.title.localeCompare(right.title, 'pt-BR')
      return (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '')
    })
  const isProposalTab = isProfessor || activeTab === 'PROPOSALS'
  const currentResultCount = isProposalTab ? filteredProposals.length : filteredOpportunities.length
  const currentResultLabel = isProposalTab ? 'proposta' : 'oportunidade'
  const resultCountLabel = `${currentResultCount} ${currentResultLabel}${currentResultCount === 1 ? '' : 's'} encontrada${currentResultCount === 1 ? '' : 's'}`
  const availableFeedSorts: FeedSort[] = isProposalTab
    ? ['RECENT', 'TITLE']
    : ['RECENT', 'SCHOLARSHIP', 'POSITIONS', 'TITLE']
  const activeFilterChips = [
    ...(query.trim() ? [{ label: `Busca: ${query.trim()}`, clear: () => setQuery('') }] : []),
    ...(isProposalTab
      ? [
        ...(includeClosedProposals
          ? [{ label: 'Incluindo encerradas', clear: () => setIncludeClosedProposals(false) }]
          : []),
        ...proposalCategoryFilters.map((item) => ({
          label: proposalCategoryFilterLabels[item],
          clear: () => setProposalCategoryFilters((current) => current.filter((filter) => filter !== item)),
        })),
        ...proposalAdvisorFilters.map((item) => ({
          label: proposalAdvisorFilterLabels[item],
          clear: () => setProposalAdvisorFilters((current) => current.filter((filter) => filter !== item)),
        })),
      ]
      : [
        ...categories.map((item) => ({
          label: categoryLabels[item],
          clear: () => setCategories((current) => current.filter((category) => category !== item)),
        })),
        ...remunerationFilters.map((item) => ({
          label: remunerationLabels[item],
          clear: () => setRemunerationFilters((current) => current.filter((filter) => filter !== item)),
        })),
        ...(includeClosed
          ? [{ label: 'Incluindo encerradas', clear: () => setIncludeClosed(false) }]
          : []),
        ...(departmentFilter !== 'ALL'
          ? [{ label: departmentLabels[departmentFilter], clear: () => setDepartmentFilter('ALL') }]
          : []),
      ]),
  ]

  const hasApplied = selectedOpportunity !== null
    && candidacies.some((candidacy) => candidacy.opportunityId === selectedOpportunity.id)

  const handleApply = async () => {
    if (!selectedOpportunity) return
    setApplicationMessage(null)
    setNotificationActionError(null)
    const result = await createForOpportunity(selectedOpportunity.id)
    if (result.success) {
      setApplicationMessage('Sua candidatura foi registrada com sucesso.')
      const notificationResult = await createNotification({
        title: 'Candidatura registrada',
        message: `Sua candidatura em '${selectedOpportunity.title}' foi registrada.`,
        type: 'SELECTION_PROCESS_UPDATE',
      })
      if (!notificationResult.success) setNotificationActionError(notificationResult.message)
    }
  }
  const handleProposalInterest = async () => {
    if (!selectedProposal || !canViewStudentProposal(selectedProposal, user)) return
    setProposalInterestFeedback(null)
    setNotificationActionError(null)
    const result = await createProposalInterest(selectedProposal.id)
    if (result.success) {
      setSubmittedProposalInterestIds((current) => (
        current.includes(selectedProposal.id) ? current : [...current, selectedProposal.id]
      ))
      const isProfessor = user.role === 'PROFESSOR'
      setProposalInterestFeedback(isProfessor
        ? 'Sua oferta de orientação foi registrada.'
        : 'Sua solicitação de colaboração foi registrada.')
      const notificationResult = await createNotification({
        title: isProfessor ? 'Orientação oferecida' : 'Colaboração solicitada',
        message: isProfessor
          ? `Orientação oferecida para a proposta '${selectedProposal.title}'.`
          : `Interesse registrado na proposta '${selectedProposal.title}'.`,
        type: 'PITCH_INTEREST',
      })
      if (!notificationResult.success) setNotificationActionError(notificationResult.message)
    } else {
      setProposalInterestFeedback(result.message)
    }
  }
  const handleProposalInviteResponse = async (decision: ProposalInviteDecision) => {
    if (
      !selectedProposal
      || !selectedProposal.invites.some((invite) => (
        invite.userId === String(profile.id) && invite.status === 'pending'
      ))
    ) return

    setIsRespondingToInvite(true)
    setNotificationActionError(null)
    setProposalInviteFeedback(null)
    const result = await respondToProposalInvite(selectedProposal.id, decision)
    if (!result.success) {
      setProposalInviteFeedback(result.message)
      setIsRespondingToInvite(false)
      return
    }

    const notificationResult = await markProposalInviteAsRead(selectedProposal.id)
    if (!notificationResult.success) setNotificationActionError(notificationResult.message)

    if (decision === 'accepted') {
      setSelectedProposal(result.data)
      setProposalInviteFeedback('Convite aceito. Você agora participa desta proposta.')
    } else {
      setProposalCreateNotice('Convite recusado.')
      closeProposalDetails()
    }
    setIsRespondingToInvite(false)
  }
  const handleCreateProjectProposal = async (
    input: ProjectProposalCreateRequest,
  ): Promise<ServiceResult<ProjectProposalCardData>> => {
    const result = await createProjectProposal(input)
    if (!result.success) return result

    const notificationResult = await createNotification({
      title: 'Proposta publicada',
      message: `Sua proposta '${result.data.title}' foi publicada com sucesso.`,
      type: 'PITCH_INTEREST',
    })
    const inviteNotificationResults = await Promise.all(
      result.data.invites
        .filter((invite) => invite.status === 'pending')
        .map((invite) => createNotification({
          title: 'Convite para proposta',
          message: `${user.profile.name} convidou você para a proposta '${result.data.title}'`,
          type: 'PROPOSAL_INVITE',
          recipientId: Number(invite.userId),
          projectProposalId: result.data.id,
        })),
    )
    const failedInviteNotification = inviteNotificationResults.find((item) => !item.success)
    setProposalCreateNotice(notificationResult.success && !failedInviteNotification
      ? 'Proposta publicada com sucesso.'
      : 'Proposta publicada, mas não foi possível registrar todas as notificações.')
    if (failedInviteNotification) setNotificationActionError(failedInviteNotification.message)
    return result
  }
  const openProposalCreate = () => {
    setQuery('')
    setActiveTab('PROPOSALS')
    setSelectedOpportunity(null)
    closeProposalDetails()
    setProposalCreateNotice(null)
    setIsCreateProposalOpen(true)
  }
  const selectTab = (tab: HomeTab) => {
    if (isProfessor) return
    setActiveTab(tab)
    setSelectedOpportunity(null)
    closeProposalDetails()
    setProposalInterestFeedback(null)
    setNotificationActionError(null)
    setFeedSort('RECENT')
  }
  const clearFilters = () => {
    setQuery('')
    setCategories([])
    setRemunerationFilters([])
    setDepartmentFilter('ALL')
    setProposalCategoryFilters([])
    setProposalAdvisorFilters([])
    setIncludeClosedProposals(false)
    setIncludeClosed(false)
    setFeedSort('RECENT')
  }

  return (
    <div className={styles['home-page']}>
      <header className={styles['topbar']}>
        <Link className={`${styles['brand']} ${styles['brand-dark']}`} to="/" aria-label="Oportuniza início">
          <span className={styles['brand-mark']}><GraduationCap size={21} strokeWidth={2.2} /></span>
          <span className={styles['brand-name']}>oportuniza<span>.</span></span>
        </Link>
        <div className={styles['topbar-profile']}>
          <ProjectsAndProcessesLink />
          <NotificationMenu />
          <Link className={styles['profile-link']} to="/perfil" aria-label="Abrir meu perfil">
            <div className={`${styles.avatar} ${isProfessor ? styles['avatar-professor'] : ''}`}>
              {profile.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
            </div>
            <div className={styles['profile-summary']}>
              <strong>{profile.name}</strong>
              <span>
                {user.role === 'PROFESSOR'
                  ? `Docente · ${departmentLabels[user.profile.department]}`
                  : `${courseLabels[user.profile.course]} · ${user.profile.currentPeriod}º período`}
              </span>
            </div>
          </Link>
          <button className={styles['logout-button']} onClick={onLogout} type="button" aria-label="Sair da conta">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className={styles['home-content']}>
        <section className={styles['welcome-banner']}>
          <div className={styles['welcome-copy']}>
            <span className={styles['welcome-overline']}><Sparkles size={15} /> UM ESPAÇO PARA FAZER ACONTECER</span>
            <h1>{isProfessor
              ? `Olá, ${profile.name?.split(' ')[0] ?? 'professor'}`
              : `Olá, ${profile.name.split(' ')[0]}`}<span>.</span></h1>
            <p>
              {isProfessor
                ? 'Acompanhe as oportunidades acadêmicas e encontre estudantes para seus projetos.'
                : 'Sua próxima grande oportunidade pode estar a um clique de distância.'}
            </p>
          </div>
          <div className={styles['welcome-art']} aria-hidden="true">
            <div className={styles['art-sun']} />
            <div className={styles['art-book']}><span /><span /><span /></div>
            <div className={`${styles['art-star']} ${styles['star-one']}`}>✳</div>
            <div className={`${styles['art-star']} ${styles['star-two']}`}>✦</div>
          </div>
        </section>

        <div className={styles['content-heading']}>
          <div>
            <span className={styles['section-eyebrow']}>DESCUBRA O QUE VEM POR AÍ</span>
            <h2>{isProposalTab
              ? 'Propostas de Alunos'
              : isProfessor
                ? 'Oportunidades acadêmicas'
                : 'Encontre sua oportunidade'}</h2>
          </div>
        </div>
        {proposalCreateNotice && (
          <p className={styles['create-success-notice']} role="status">
            <CheckCircle2 size={16} /> {proposalCreateNotice}
          </p>
        )}
        {notificationActionError && !selectedProposal && (
          <p className={styles['application-error']} role="alert">
            {notificationActionError}
          </p>
        )}

        <div className={styles['feed-tabs-row']}>
          {isProfessor ? (
            <div className={styles['feed-tabs']}>
              <span className={`${styles['feed-tab']} ${styles['feed-tab-active']} ${styles['feed-tab-label']}`}>
                Propostas de Alunos
              </span>
            </div>
          ) : (
            <div className={styles['feed-tabs']} role="tablist" aria-label="Tipo de publicação">
              <button
                aria-controls="home-feed-panel"
                aria-selected={!isProposalTab}
                className={`${styles['feed-tab']} ${!isProposalTab ? styles['feed-tab-active'] : ''}`}
                id="opportunities-tab"
                onClick={() => selectTab('OPPORTUNITIES')}
                role="tab"
                type="button"
              >
                Oportunidades
              </button>
              <button
                aria-controls="home-feed-panel"
                aria-selected={isProposalTab}
                className={`${styles['feed-tab']} ${isProposalTab ? styles['feed-tab-active'] : ''}`}
                id="proposals-tab"
                onClick={() => selectTab('PROPOSALS')}
                role="tab"
                type="button"
              >
                Propostas de Alunos
              </button>
            </div>
          )}
          <span aria-live="polite" className={styles['result-count']} role="status">
            {resultCountLabel}
          </span>
        </div>

        <div className={styles['explore-layout']}>
          <aside className={styles['explore-sidebar']}>
            {isProposalTab ? (
              <section className={styles['filter-panel']}>
                <div className={styles['filter-heading']}>
                  <span className={styles['filter-icon']}><SlidersHorizontal size={17} /></span>
                  <h3>Filtros de busca</h3>
                </div>
                {activeFilterChips.length > 0 && (
                  <div aria-label="Filtros ativos" className={styles['active-filter-list']} role="group">
                    <div className={styles['active-filter-chips']}>
                      {activeFilterChips.map((filter) => (
                        <button
                          aria-label={`Remover filtro ${filter.label}`}
                          className={styles['active-filter']}
                          key={filter.label}
                          onClick={filter.clear}
                          type="button"
                        >
                          {filter.label} <X size={12} />
                        </button>
                      ))}
                    </div>
                    <button className={styles['filter-clear']} onClick={clearFilters} type="button">
                      Limpar filtros
                    </button>
                  </div>
                )}
                <h4 className={styles['filter-subheading']}>Categoria</h4>
                <div aria-label="Filtrar por categoria" className={styles['filter-checkbox-list']}>
                  {proposalCategoryFilterOrder.map((item) => {
                    const count = proposalCategoryResults.filter((proposal) => (
                      item === 'UNCLASSIFIED'
                        ? proposal.category === null
                        : proposal.category === item
                    )).length
                    return (
                      <label className={styles['filter-checkbox']} key={item}>
                        <input
                          checked={proposalCategoryFilters.includes(item)}
                          className={styles['checkbox-input']}
                          onChange={() => setProposalCategoryFilters((current) => (
                            current.includes(item)
                              ? current.filter((filter) => filter !== item)
                              : [...current, item]
                          ))}
                          type="checkbox"
                        />
                        <span>{proposalCategoryFilterLabels[item]} ({count})</span>
                      </label>
                    )
                  })}
                </div>
                <h4 className={styles['filter-subheading']}>Orientação</h4>
                <div aria-label="Filtrar por orientação" className={styles['filter-checkbox-list']}>
                  {proposalAdvisorFilterOrder.map((item) => {
                    const count = proposalAdvisorResults.filter((proposal) => (
                      item === 'SEEKING'
                        ? proposal.seeksAdvisor === true
                        : item === 'NOT_SEEKING'
                          ? proposal.seeksAdvisor === false
                          : proposal.seeksAdvisor === null
                    )).length
                    return (
                      <label className={styles['filter-checkbox']} key={item}>
                        <input
                          checked={proposalAdvisorFilters.includes(item)}
                          className={styles['checkbox-input']}
                          onChange={() => setProposalAdvisorFilters((current) => (
                            current.includes(item)
                              ? current.filter((filter) => filter !== item)
                              : [...current, item]
                          ))}
                          type="checkbox"
                        />
                        <span>{proposalAdvisorFilterLabels[item]} ({count})</span>
                      </label>
                    )
                  })}
                </div>
                <h4 className={styles['filter-subheading']}>Status</h4>
                <label className={styles['filter-checkbox']}>
                  <input
                    checked={includeClosedProposals}
                    className={styles['checkbox-input']}
                    onChange={(event) => setIncludeClosedProposals(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Incluir encerradas (+{proposalAvailabilityResults.filter(
                      (proposal) => proposal.status === 'CLOSED',
                    ).length})
                  </span>
                </label>
              </section>
            ) : (
              <section className={styles['filter-panel']}>
              <div className={styles['filter-heading']}>
                <span className={styles['filter-icon']}><SlidersHorizontal size={17} /></span>
                <h3>Filtros de busca</h3>
              </div>
              {activeFilterChips.length > 0 && (
                <div aria-label="Filtros ativos" className={styles['active-filter-list']} role="group">
                  <div className={styles['active-filter-chips']}>
                    {activeFilterChips.map((filter) => (
                      <button
                        aria-label={`Remover filtro ${filter.label}`}
                        className={styles['active-filter']}
                        key={filter.label}
                        onClick={filter.clear}
                        type="button"
                      >
                        {filter.label} <X size={12} />
                      </button>
                    ))}
                  </div>
                  <button className={styles['filter-clear']} onClick={clearFilters} type="button">
                    Limpar filtros
                  </button>
                </div>
              )}
              <h4 className={styles['filter-subheading']}>Departamento / centro</h4>
              <CustomSelect
                ariaLabel="Filtrar por departamento"
                className={styles['filter-select']}
                onChange={(value) => {
                  setDepartmentFilter(value === 'ALL'
                    ? 'ALL'
                    : departments.find((department) => department === value) ?? 'ALL')
                }}
                options={[
                  { value: 'ALL', label: 'Todos os departamentos' },
                  ...departments.map((department) => ({
                    value: department,
                    label: departmentLabels[department],
                  })),
                ]}
                value={departmentFilter}
              />
              <h4 className={styles['filter-subheading']}>Modalidade</h4>
              <div aria-label="Filtrar por modalidade" className={styles['filter-checkbox-list']}>
                {categoryOrder.map((item) => {
                  const count = opportunityCategoryResults.filter((opportunity) => (
                    opportunity.type === item
                  )).length
                  return (
                    <label className={styles['filter-checkbox']} key={item}>
                      <input
                        checked={categories.includes(item)}
                        className={styles['checkbox-input']}
                        onChange={() => setCategories((current) => (
                          current.includes(item)
                            ? current.filter((category) => category !== item)
                            : [...current, item]
                        ))}
                        type="checkbox"
                      />
                      <span>{categoryLabels[item]} ({count})</span>
                    </label>
                  )
                })}
              </div>
              <h4 className={styles['filter-subheading']}>Remuneração</h4>
              <div aria-label="Filtrar por remuneração" className={styles['filter-checkbox-list']}>
                {remunerationFilterOrder.map((item) => {
                  const count = opportunityRemunerationResults.filter((opportunity) => (
                    item === 'PAID' ? opportunity.remuneration > 0 : opportunity.remuneration <= 0
                  )).length
                  return (
                    <label className={styles['filter-checkbox']} key={item}>
                      <input
                        checked={remunerationFilters.includes(item)}
                        className={styles['checkbox-input']}
                        onChange={() => setRemunerationFilters((current) => (
                          current.includes(item)
                            ? current.filter((filter) => filter !== item)
                            : [...current, item]
                        ))}
                        type="checkbox"
                      />
                      <span>{remunerationLabels[item]} ({count})</span>
                    </label>
                  )
                })}
              </div>
              <h4 className={styles['filter-subheading']}>Status</h4>
              <label className={styles['filter-checkbox']}>
                <input
                  checked={includeClosed}
                  className={styles['checkbox-input']}
                  onChange={(event) => setIncludeClosed(event.target.checked)}
                  type="checkbox"
                />
                <span>Incluir encerradas (+{opportunityAvailabilityResults.filter(
                  (opportunity) => opportunity.status !== 'OPEN',
                ).length})</span>
              </label>
              </section>
            )}

            {!isProfessor && (
              <section className={styles['sidebar-note']}>
                <span className={styles['note-icon']}><Sparkles size={17} /></span>
                <h3>Ideia boa merece espaço.</h3>
                <p>Explore projetos e encontre docentes para tirar suas ideias do papel.</p>
                <button
                  className={styles['note-link']}
                  onClick={openProposalCreate}
                  type="button"
                >
                  Seu próximo projeto começa aqui <ArrowRight size={14} />
                </button>
              </section>
            )}
          </aside>

          <section
            aria-label={isProfessor ? 'Propostas de Alunos' : 'Explorar oportunidades e propostas'}
            className={styles['opportunity-feed']}
          >
            <div
              aria-labelledby={isProfessor
                ? undefined
                : isProposalTab
                  ? 'proposals-tab'
                  : 'opportunities-tab'}
              id="home-feed-panel"
              role={isProfessor ? undefined : 'tabpanel'}
            >
            <div className={styles['feed-toolbar']}>
              <label className={styles['search-field']}>
                <Search size={17} />
                <input
                  aria-label={isProposalTab ? 'Buscar propostas' : 'Buscar oportunidades'}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={isProposalTab ? 'Buscar propostas...' : 'Buscar oportunidades...'}
                  type="search"
                  value={query}
                />
                {query && (
                  <button
                    aria-label="Limpar busca"
                    onClick={() => setQuery('')}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
              <div className={styles['sort-indicator']}>
                <ArrowDownWideNarrow size={16} />
                <span>Ordenar:</span>
                <CustomSelect
                  align="right"
                  ariaLabel="Ordenar publicações"
                  className={styles['sort-select']}
                  menuClassName={styles['sort-select-menu']}
                  onChange={(value) => {
                    const selectedSort = availableFeedSorts.find((item) => item === value)
                    if (selectedSort) setFeedSort(selectedSort)
                  }}
                  options={availableFeedSorts.map((option) => ({
                    value: option,
                    label: feedSortLabels[option],
                  }))}
                  triggerClassName={styles['sort-select-trigger']}
                  value={feedSort}
                />
              </div>
            </div>

            {!isProposalTab && opportunitiesError && (
              <div className={styles['feed-error']} role="alert">
                <span>{opportunitiesError}</span>
                <button onClick={() => void reloadOpportunities()} type="button">Tentar novamente</button>
              </div>
            )}
            {!isProposalTab && candidaciesError && <p className={styles['feed-error']} role="alert">{candidaciesError}</p>}
            {!isProposalTab && professorProfilesError && (
              <p className={styles['feed-error']} role="alert">{professorProfilesError}</p>
            )}
            {isProposalTab && proposalsError && (
              <div className={styles['feed-error']} role="alert">
                <span>{proposalsError}</span>
                <button onClick={() => void reloadProposals()} type="button">Tentar novamente</button>
              </div>
            )}
            {isProposalTab && proposalAuthorsError && (
              <p className={styles['feed-error']} role="alert">{proposalAuthorsError}</p>
            )}

            <div className={styles['opportunity-list']}>
              {!isProposalTab && opportunitiesLoading && (
                <p className={styles['feed-status']} role="status">Carregando oportunidades...</p>
              )}
              {!isProposalTab && filteredOpportunities.map((opportunity) => (
                <OpportunityCard
                  isOwner={isProfessor && opportunity.professorId === profile.id}
                  key={opportunity.id}
                  onOpen={(selected) => {
                    setApplicationMessage(null)
                    setNotificationActionError(null)
                    setSelectedOpportunity(selected)
                  }}
                  opportunity={opportunity}
                  professorName={professorProfiles[opportunity.professorId]?.name
                    ?? (professorProfilesLoading
                      ? 'Carregando docente...'
                      : `Docente ${opportunity.professorId}`)}
                />
              ))}
              {!isProposalTab && filteredOpportunities.length === 0 && !opportunitiesLoading && !opportunitiesError && (
                <div className={styles['empty-state']}>
                  <Search size={24} />
                  <h3>Nenhuma oportunidade encontrada</h3>
                  <p>Ajuste a busca ou os filtros para ver outras oportunidades.</p>
                  <button
                    onClick={clearFilters}
                    type="button"
                  >
                    Limpar busca e filtros
                  </button>
                </div>
              )}
              {isProposalTab && proposalsLoading && (
                <p className={styles['feed-status']} role="status">Carregando propostas...</p>
              )}
              {isProposalTab && filteredProposals.map((proposal) => (
                <ProjectProposalCardView
                  authorsLoading={proposalAuthorsLoading}
                  authorNames={proposalAuthorNames}
                  key={proposal.id}
                  onOpen={(proposalToOpen) => {
                    setProposalInterestFeedback(null)
                    setProposalInviteFeedback(null)
                    setNotificationActionError(null)
                    setSelectedProposal(proposalToOpen)
                  }}
                  proposal={proposal}
                />
              ))}
              {isProposalTab && filteredProposals.length === 0
                && !proposalsLoading && !proposalsError && (
                  <div className={styles['empty-state']}>
                    <Search size={24} />
                    <h3>Nenhuma proposta encontrada</h3>
                    <p>Ajuste a busca ou os filtros para encontrar outras propostas.</p>
                    <button
                      onClick={clearFilters}
                      type="button"
                    >
                      Limpar busca e filtros
                    </button>
                  </div>
                )}
            </div>
            <p className={styles['feed-footnote']}>
              {isProposalTab
                ? 'Explore ideias de estudantes e encontre pessoas para construir projetos em conjunto.'
                : 'Novas oportunidades são adicionadas durante todo o período letivo.'}
            </p>
            </div>
          </section>
        </div>
      </main>

      {selectedOpportunity && (
        <div
          className={styles['dialog-backdrop']}
          onClick={() => setSelectedOpportunity(null)}
          role="presentation"
        >
          <section
            aria-labelledby="opportunity-dialog-title"
            aria-modal="true"
            className={styles['opportunity-dialog']}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Fechar detalhes"
              className={styles['dialog-close']}
              onClick={() => setSelectedOpportunity(null)}
              type="button"
            >
              <X size={19} />
            </button>
            <span className={`${styles['category-badge']} ${categoryStyles[selectedOpportunity.type]}`}>
              {categoryLabels[selectedOpportunity.type]}
            </span>
            <h2 id="opportunity-dialog-title">{selectedOpportunity.title}</h2>
            <p className={styles['dialog-owner']}>
              Docente responsável:{' '}
              <ResponsibleProfessorLink
                professorId={selectedOpportunity.professorId}
                professorName={professorProfiles[selectedOpportunity.professorId]?.name
                  ?? (professorProfilesLoading
                    ? 'Carregando docente...'
                    : `Docente ${selectedOpportunity.professorId}`)}
              />
            </p>
            <p className={styles['dialog-description']}>{selectedOpportunity.description}</p>
            <div className={styles['dialog-facts']}>
              <span><UsersRound size={17} /> {selectedOpportunity.positions} vagas</span>
              <span><Clock3 size={17} /> {selectedOpportunity.workloadHours} horas semanais</span>
              <span><CalendarDays size={17} /> Inscrições até {formatDate(selectedOpportunity.applicationDeadline)}</span>
              <span><BriefcaseBusiness size={17} /> {selectedOpportunity.remuneration > 0
                ? `${formatCurrency(selectedOpportunity.remuneration)} por mês`
                : 'Atuação voluntária'}</span>
            </div>
            <div className={styles['requirements']}>
              <h3>Requisitos</h3>
              <ul>
                {selectedOpportunity.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </div>
            {user.role === 'STUDENT' ? (
              <div className={styles['application-actions']}>
                <button
                  className={styles['application-button']}
                  disabled={hasApplied || candidaciesLoading}
                  onClick={() => void handleApply()}
                  type="button"
                >
                  {hasApplied ? 'Candidatura enviada' : 'Candidatar-se'}
                  {!hasApplied && <ArrowRight size={16} />}
                </button>
                {(applicationMessage || candidaciesError) && (
                  <p aria-live="polite" className={applicationMessage ? styles['application-success'] : styles['application-error']}>
                    {applicationMessage ?? candidaciesError}
                  </p>
                )}
                {notificationActionError && (
                  <p aria-live="polite" className={styles['application-error']}>
                    {notificationActionError}
                  </p>
                )}
              </div>
            ) : (
              <p className={styles['demo-dialog-note']}>As candidaturas a oportunidades são feitas por discentes.</p>
            )}
          </section>
        </div>
      )}
      {selectedProposal && canViewStudentProposal(selectedProposal, user) && (
        <div
          className={styles['dialog-backdrop']}
          onClick={closeProposalDetails}
          role="presentation"
        >
          <section
            aria-labelledby="proposal-dialog-title"
            aria-modal="true"
            className={styles['opportunity-dialog']}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Fechar detalhes da proposta"
              className={styles['dialog-close']}
              onClick={closeProposalDetails}
              type="button"
            >
              <X size={19} />
            </button>
            <span className={`${styles['category-badge']} ${selectedProposal.category
              ? proposalCategoryStyles[selectedProposal.category]
              : styles['category-other']}`}>
              {selectedProposal.category
                ? proposalCategoryLabels[selectedProposal.category]
                : 'Proposta de aluno'}
            </span>
            {selectedProposal.isPrivate && (
              <span className={styles['private-badge']}><LockKeyhole size={13} /> Privada</span>
            )}
            <h2 id="proposal-dialog-title">{selectedProposal.title}</h2>
            <p className={styles['dialog-owner']}>
              Proposto por:{' '}
              <ProjectProposalAuthorLinks
                authorIds={selectedProposal.authorIds}
                authorNames={proposalAuthorNames}
                isLoading={proposalAuthorsLoading}
              />
            </p>
            <p className={styles['dialog-description']}>{selectedProposal.description}</p>
            <div className={styles['dialog-facts']}>
              <span>
                <UsersRound size={17} />
                {selectedProposal.seeksAdvisor === null
                  ? 'Busca por orientador não informada'
                  : selectedProposal.seeksAdvisor
                    ? 'Busca orientador'
                    : 'Não busca orientador'}
              </span>
              <span>
                <CalendarDays size={17} /> {proposalStatusLabels[selectedProposal.status]}
              </span>
              {selectedProposal.publishedAt && (
                <span>
                  <Clock3 size={17} /> Publicada em {formatDate(selectedProposal.publishedAt)}
                </span>
              )}
            </div>
            {hasPendingProposalInvite && (
              <div className={styles['proposal-invite-banner']}>
                <div>
                  <strong>Você foi convidado para colaborar nesta proposta.</strong>
                  <span>Revise os detalhes antes de responder ao convite.</span>
                </div>
                <div className={styles['proposal-invite-actions']}>
                  <button
                    className={styles['proposal-invite-accept']}
                    disabled={isRespondingToInvite}
                    onClick={() => void handleProposalInviteResponse('accepted')}
                    type="button"
                  >
                    {isRespondingToInvite ? 'Atualizando...' : 'Aceitar convite'}
                  </button>
                  <button
                    className={styles['proposal-invite-decline']}
                    disabled={isRespondingToInvite}
                    onClick={() => void handleProposalInviteResponse('declined')}
                    type="button"
                  >
                    Recusar
                  </button>
                </div>
                {proposalInviteFeedback && (
                  <p className={styles['invite-response-feedback']} role="alert">
                    {proposalInviteFeedback}
                  </p>
                )}
              </div>
            )}
            {proposalInviteFeedback && !hasPendingProposalInvite && (
              <p className={styles['invite-response-feedback']} role="status">
                {proposalInviteFeedback}
              </p>
            )}
            {notificationActionError && (
              <p aria-live="polite" className={styles['application-error']}>
                {notificationActionError}
              </p>
            )}
            <div className={styles['requirements']}>
              <h3>Competências buscadas</h3>
              {selectedProposal.desiredSkills.length > 0 ? (
                <ul>
                  {selectedProposal.desiredSkills.map((skill) => <li key={skill}>{skill}</li>)}
                </ul>
              ) : (
                <p className={styles['proposal-no-skills']}>Nenhuma competência específica informada.</p>
              )}
            </div>
            {!hasPendingProposalInvite && !(user.role === 'STUDENT'
              && selectedProposal.authorIds.includes(profile.id)) && (
              <div className={styles['application-actions']}>
                <button
                  className={styles['application-button']}
                  disabled={isOfferingOrientation
                    || submittedProposalInterestIds.includes(selectedProposal.id)}
                  onClick={() => void handleProposalInterest()}
                  type="button"
                >
                  {isOfferingOrientation
                    ? user.role === 'PROFESSOR' ? 'Enviando oferta...' : 'Enviando solicitação...'
                    : submittedProposalInterestIds.includes(selectedProposal.id)
                      ? user.role === 'PROFESSOR' ? 'Orientação oferecida' : 'Colaboração solicitada'
                      : user.role === 'PROFESSOR' ? 'Oferecer orientação' : 'Quero colaborar'}
                  {!isOfferingOrientation
                    && !submittedProposalInterestIds.includes(selectedProposal.id)
                    && <ArrowRight size={16} />}
                </button>
                {proposalInterestFeedback && (
                  <p
                    aria-live="polite"
                    className={submittedProposalInterestIds.includes(selectedProposal.id)
                      ? styles['application-success']
                      : styles['application-error']}
                  >
                    {proposalInterestFeedback}
                  </p>
                )}
                {notificationActionError && (
                  <p aria-live="polite" className={styles['application-error']}>
                    {notificationActionError}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      {isCreateProposalOpen && (
        <ProjectProposalCreateDialog
          onClose={() => setIsCreateProposalOpen(false)}
          onCreate={handleCreateProjectProposal}
        />
      )}
    </div>
  )
}

export default HomePage
