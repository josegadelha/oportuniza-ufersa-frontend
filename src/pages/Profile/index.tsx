import { useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  ExternalLink,
  GraduationCap,
  LogOut,
  Mail,
  Pencil,
  Save,
} from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { courseLabels, departmentLabels } from '../../constants/domainLabels'
import { useAuth } from '../../hooks/useAuth'
import { useOpportunities } from '../../hooks/useOpportunities'
import { useProjectProposals } from '../../hooks/useProjectProposals'
import { useProfile, type ProfileUpdate } from '../../hooks/useProfile'
import { ProjectsAndProcessesLink } from '../../UI/Header'
import NotificationMenu from '../../UI/NotificationMenu'
import type {
  OpportunityStatus,
  OpportunityType,
  ProjectProposalStatus,
  UserProfileDetails,
} from '../../types/domain'
import styles from './Profile.module.css'

interface ProfileFormState {
  lattesUrl: string
  githubUrl: string
  linkedinUrl: string
  description: string
  skills: string
  interests: string
  researchAreas: string
  researchLines: string
}

const opportunityTypeLabels: Record<OpportunityType, string> = {
  RESEARCH: 'Pesquisa',
  MONITORING: 'Monitoria',
  EXTENSION: 'Extensão',
  TEACHING: 'Ensino',
  VOLUNTEER: 'Voluntariado',
  OTHER: 'Outra oportunidade',
}

const opportunityStatusLabels: Record<OpportunityStatus, string> = {
  DRAFT: 'Rascunho',
  OPEN: 'Inscrições abertas',
  CLOSED: 'Encerrada',
  FINISHED: 'Finalizada',
}

const proposalStatusLabels: Record<ProjectProposalStatus, string> = {
  OPEN: 'Buscando equipe',
  IN_PROGRESS: 'Em andamento',
  CLOSED: 'Encerrada',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('pt-BR')
}

function createFormState(profile: UserProfileDetails): ProfileFormState {
  return {
    lattesUrl: profile.profile.lattesUrl ?? '',
    githubUrl: profile.profile.githubUrl ?? '',
    linkedinUrl: profile.profile.linkedinUrl ?? '',
    description: profile.profile.description ?? '',
    skills: profile.role === 'STUDENT' ? profile.extras.skills.join('\n') : '',
    interests: profile.role === 'STUDENT' ? profile.extras.interests.join('\n') : '',
    researchAreas: profile.role === 'PROFESSOR' ? profile.extras.researchAreas.join('\n') : '',
    researchLines: profile.role === 'PROFESSOR' ? profile.extras.researchLines.join('\n') : '',
  }
}

function parseList(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value)
    const validHostname = /^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i
    return ['http:', 'https:'].includes(url.protocol)
      && validHostname.test(url.hostname)
      && !url.username
      && !url.password
  } catch {
    return false
  }
}

function ProfileTags({
  items,
  emptyMessage,
}: {
  items: string[]
  emptyMessage: string
}) {
  if (!items.length) return <p className={styles.emptyList}>{emptyMessage}</p>
  return (
    <ul className={styles.tagList}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

function ProfilePage() {
  const { id } = useParams()
  return <ProfileView key={id ?? 'self'} profileId={id} />
}

function ProfileView({ profileId }: { profileId?: string }) {
  const { user, logout } = useAuth()
  const {
    profile,
    isLoading,
    isSaving,
    error,
    reload,
    save,
    isOwnProfile,
    supportsExtendedProfileFields,
  } = useProfile(profileId)
  const isProfessor = profile?.role === 'PROFESSOR'
  const { opportunities, isLoading: opportunitiesLoading, error: opportunitiesError } =
    useOpportunities(Boolean(isProfessor && isOwnProfile))
  const {
    proposals,
    isLoading: proposalsLoading,
    error: proposalsError,
  } = useProjectProposals()
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<ProfileFormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  if (!user) return <Navigate to="/login" replace />

  const studentProfile = profile?.role === 'STUDENT' ? profile : null
  const professorProfile = profile?.role === 'PROFESSOR' ? profile : null
  const ownOpportunities = professorProfile
    ? opportunities.filter((opportunity) => opportunity.professorId === professorProfile.profile.id)
    : []
  const studentProposals = studentProfile
    ? proposals.filter((proposal) => (
      proposal.studentId === studentProfile.profile.id
      || proposal.authorIds.includes(studentProfile.profile.id)
    ))
    : []
  const emptyListMessage = supportsExtendedProfileFields
    ? 'Ainda não foram adicionados itens.'
    : 'Essas informações ainda não são fornecidas pelo backend atual.'

  const updateForm = <Key extends keyof ProfileFormState>(
    key: Key,
    value: ProfileFormState[Key],
  ) => {
    setForm((current) => current ? { ...current, [key]: value } : current)
    setFormError(null)
    setSaveSuccess(null)
  }

  const handleEditToggle = () => {
    if (!isEditing && profile) setForm(createFormState(profile))
    setFormError(null)
    setSaveSuccess(null)
    setIsEditing((current) => !current)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile || !form) return

    const externalLinks = [
      ['Lattes', form.lattesUrl],
      ['GitHub', form.githubUrl],
      ['LinkedIn', form.linkedinUrl],
    ] as const
    for (const [label, value] of externalLinks) {
      if (value.trim() && !isValidExternalUrl(value.trim())) {
        setFormError(`Informe um link válido para ${label}, iniciado por http:// ou https://.`)
        return
      }
    }

    setFormError(null)
    setSaveSuccess(null)
    const sharedProfileFields = {
      lattesUrl: form.lattesUrl.trim() || null,
      ...(supportsExtendedProfileFields
        ? {
          githubUrl: form.githubUrl.trim() || null,
          linkedinUrl: form.linkedinUrl.trim() || null,
        }
        : {}),
      description: form.description.trim() || null,
    }

    let update: ProfileUpdate
    if (profile.role === 'STUDENT') {
      update = {
        role: 'STUDENT',
        update: {
          profile: {
            ...sharedProfileFields,
          },
          extras: supportsExtendedProfileFields
            ? { skills: parseList(form.skills), interests: parseList(form.interests) }
            : profile.extras,
        },
      }
    } else {
      update = {
        role: 'PROFESSOR',
        update: {
          profile: sharedProfileFields,
          extras: supportsExtendedProfileFields
            ? {
              researchAreas: parseList(form.researchAreas),
              researchLines: parseList(form.researchLines),
            }
            : profile.extras,
        },
      }
    }

    if (await save(update)) {
      setIsEditing(false)
      setSaveSuccess('Alterações salvas com sucesso.')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link className={styles.brand} to="/" aria-label="Oportuniza início">
            <span className={styles.brandMark}><GraduationCap size={21} strokeWidth={2.2} /></span>
            <span className={styles.brandName}>oportuniza<span>.</span></span>
          </Link>
          <div className={styles.headerActions}>
            <ProjectsAndProcessesLink />
            <NotificationMenu />
            <button className={styles.logoutButton} onClick={logout} type="button" aria-label="Sair da conta">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className={styles.profileContainer}>
        <Link className={styles.backLink} to="/">
          <ArrowLeft size={15} /> Voltar para as oportunidades
        </Link>

        {(error || formError) && (
          <div className={styles.errorBanner} role="alert">
            <span>{formError ?? error}</span>
            {error && !profile && <button onClick={() => void reload()} type="button">Tentar novamente</button>}
          </div>
        )}
        {saveSuccess && <div className={styles.successBanner} role="status">{saveSuccess}</div>}

        {isLoading && !profile && <p className={styles.loadingState} role="status">Carregando perfil...</p>}

        {profile && (
          <>
            <section className={`${styles.profileCard} ${styles.identityCard}`}>
              <div className={styles.profileHeader}>
                <div className={styles.profileIdentity}>
                  <div
                    className={`${styles.profileAvatar} ${professorProfile ? styles.professorAvatar : ''}`}
                    aria-hidden="true"
                  >
                    {getInitials(profile.profile.name)}
                  </div>
                  <div className={styles.identityContent}>
                    <span className={`${styles.roleBadge} ${professorProfile ? styles.professorBadge : ''}`}>
                      {studentProfile ? 'Perfil discente' : 'Perfil docente'}
                    </span>
                    <h1>{profile.profile.name}</h1>
                    <p className={styles.profileSubline}>
                      {studentProfile
                        ? `Matrícula: ${studentProfile.profile.registration} · ${courseLabels[studentProfile.profile.course]}`
                        : `SIAPE: ${professorProfile?.profile.registration} · Departamento de ${departmentLabels[professorProfile?.profile.department ?? 'OUTRO']}`}
                    </p>
                    <div className={styles.profilePills}>
                      {studentProfile ? (
                        <>
                          <span className={`${styles.pill} ${styles.pillNeutral}`}>
                            <GraduationCap size={14} /> {courseLabels[studentProfile.profile.course]}
                          </span>
                          <span className={`${styles.pill} ${styles.pillSuccess}`}>
                            IRA {studentProfile.profile.ira.toFixed(1)} / 10
                          </span>
                        </>
                      ) : professorProfile ? (
                        <span className={`${styles.pill} ${styles.pillNeutral}`}>
                          <BriefcaseBusiness size={14} /> {departmentLabels[professorProfile.profile.department]}
                        </span>
                      ) : null}
                      {profile.profile.lattesUrl ? (
                        <a
                          className={`${styles.pill} ${styles.pillPrimary}`}
                          href={profile.profile.lattesUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Currículo Lattes <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className={`${styles.pill} ${styles.pillMuted}`}>Lattes não informado</span>
                      )}
                      {profile.profile.githubUrl && (
                        <a
                          className={`${styles.pill} ${styles.pillPrimary}`}
                          href={profile.profile.githubUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          GitHub <ExternalLink size={13} />
                        </a>
                      )}
                      {profile.profile.linkedinUrl && (
                        <a
                          className={`${styles.pill} ${styles.pillPrimary}`}
                          href={profile.profile.linkedinUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          LinkedIn <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                {!isOwnProfile && <span className={styles.publicBadge}>Perfil público</span>}
                {isOwnProfile && (
                  <button className={styles.editButton} onClick={handleEditToggle} type="button">
                    <Pencil size={15} /> {isEditing ? 'Fechar edição' : 'Editar perfil'}
                  </button>
                )}
              </div>

              <div className={styles.profileStats}>
                {studentProfile ? (
                  <>
                    <div><span>Curso</span><strong>{courseLabels[studentProfile.profile.course]}</strong></div>
                    <div><span>Período atual</span><strong>{studentProfile.profile.currentPeriod}º período</strong></div>
                    <div><span>IRA geral</span><strong>{studentProfile.profile.ira.toFixed(1)} / 10.0</strong></div>
                    <div><span>Notificações</span><strong>{studentProfile.profile.receiveNotifications ? 'Ativadas' : 'Desativadas'}</strong></div>
                  </>
                ) : professorProfile ? (
                  <>
                    <div><span>Registro</span><strong>SIAPE {professorProfile.profile.registration}</strong></div>
                    <div><span>Departamento</span><strong>{departmentLabels[professorProfile.profile.department]}</strong></div>
                    <div><span>Oportunidades</span><strong>{ownOpportunities.length} publicadas</strong></div>
                  </>
                ) : null}
              </div>
            </section>

            {isOwnProfile && isEditing && form ? (
              <form
                className={`${styles.profileCard} ${styles.editor}`}
                noValidate
                onSubmit={(event) => void handleSubmit(event)}
              >
                <div className={styles.sectionHeading}>
                  <span>PERFIL PÚBLICO</span>
                  <h2>Editar informações complementares</h2>
                </div>
                <p className={styles.editorIntro}>
                  Os dados institucionais sincronizados com o SIGAA são somente leitura.
                </p>
                <div className={styles.formGrid}>
                  <label>
                    Nome completo
                    <input value={profile.profile.name} readOnly />
                  </label>
                  <label>
                    {studentProfile ? 'Matrícula' : 'SIAPE'}
                    <input value={profile.profile.registration} readOnly />
                  </label>
                  <label>
                    E-mail institucional
                    <input autoComplete="email" value={profile.profile.email} readOnly />
                  </label>
                  {studentProfile ? (
                    <>
                      <label>
                        Curso
                        <input value={courseLabels[studentProfile.profile.course]} readOnly />
                      </label>
                      <label>
                        Período atual
                        <input value={`${studentProfile.profile.currentPeriod}º período`} readOnly />
                      </label>
                      <label>
                        IRA geral
                        <input value={`${studentProfile.profile.ira.toFixed(1)} / 10`} readOnly />
                      </label>
                      <label>
                        Notificações institucionais
                        <input
                          value={studentProfile.profile.receiveNotifications ? 'Ativadas' : 'Desativadas'}
                          readOnly
                        />
                      </label>
                    </>
                  ) : professorProfile ? (
                    <label>
                      Departamento
                      <input value={departmentLabels[professorProfile.profile.department]} readOnly />
                    </label>
                  ) : null}
                  <label>
                    Currículo Lattes / link externo
                    <input
                      onChange={(event) => updateForm('lattesUrl', event.target.value)}
                      placeholder="https://lattes.cnpq.br/..."
                      type="url"
                      value={form.lattesUrl}
                    />
                  </label>
                  {supportsExtendedProfileFields && (
                    <>
                      <label>
                        GitHub
                        <input
                          onChange={(event) => updateForm('githubUrl', event.target.value)}
                          placeholder="https://github.com/usuario"
                          type="url"
                          value={form.githubUrl}
                        />
                      </label>
                      <label>
                        LinkedIn
                        <input
                          onChange={(event) => updateForm('linkedinUrl', event.target.value)}
                          placeholder="https://www.linkedin.com/in/usuario"
                          type="url"
                          value={form.linkedinUrl}
                        />
                      </label>
                    </>
                  )}
                  <label className={styles.fullWidth}>
                    Descrição acadêmica
                    <textarea
                      onChange={(event) => updateForm('description', event.target.value)}
                      rows={3}
                      value={form.description}
                    />
                  </label>
                  {supportsExtendedProfileFields && studentProfile && (
                    <>
                      <label>
                        Habilidades
                        <textarea
                          onChange={(event) => updateForm('skills', event.target.value)}
                          placeholder="Uma habilidade por linha"
                          rows={3}
                          value={form.skills}
                        />
                      </label>
                      <label>
                        Interesses acadêmicos
                        <textarea
                          onChange={(event) => updateForm('interests', event.target.value)}
                          placeholder="Um interesse por linha"
                          rows={3}
                          value={form.interests}
                        />
                      </label>
                    </>
                  )}
                  {supportsExtendedProfileFields && professorProfile && (
                    <>
                      <label>
                        Áreas de pesquisa
                        <textarea
                          onChange={(event) => updateForm('researchAreas', event.target.value)}
                          placeholder="Uma área por linha"
                          rows={3}
                          value={form.researchAreas}
                        />
                      </label>
                      <label>
                        Linhas de atuação
                        <textarea
                          onChange={(event) => updateForm('researchLines', event.target.value)}
                          placeholder="Uma linha por linha"
                          rows={3}
                          value={form.researchLines}
                        />
                      </label>
                    </>
                  )}
                  {!supportsExtendedProfileFields && (
                    <p className={`${styles.infoNotice} ${styles.fullWidth}`}>
                      O backend atual ainda não oferece campos para links GitHub/LinkedIn, habilidades, interesses ou áreas de pesquisa.
                    </p>
                  )}
                </div>

                <div className={styles.formActions}>
                  <button className={styles.saveButton} disabled={isSaving} type="submit">
                    <Save size={16} /> {isSaving ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                  <button className={styles.cancelButton} onClick={handleEditToggle} type="button">
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <section className={styles.profileCard}>
                  <div className={styles.sectionHeading}>
                    <span>APRESENTAÇÃO ACADÊMICA</span>
                    <h2>Sobre</h2>
                  </div>
                  <p className={styles.biography}>
                    {profile.profile.description || (isOwnProfile
                      ? 'Adicione uma descrição para contar um pouco sobre sua trajetória acadêmica.'
                      : 'Nenhuma descrição foi adicionada a este perfil.')}
                  </p>
                  <a className={styles.emailLink} href={`mailto:${profile.profile.email}`}>
                    <Mail size={15} /> {profile.profile.email}
                  </a>
                </section>

                {studentProfile ? (
                  <>
                    <div className={styles.profileTwoCol}>
                    <section className={`${styles.profileCard} ${styles.listCard}`}>
                      <div className={styles.sectionHeading}>
                        <span>SEU PERFIL</span>
                        <h2>Habilidades</h2>
                      </div>
                      <ProfileTags items={studentProfile.extras.skills} emptyMessage={emptyListMessage} />
                    </section>
                    <section className={`${styles.profileCard} ${styles.listCard}`}>
                      <div className={styles.sectionHeading}>
                        <span>O QUE VOCÊ BUSCA</span>
                        <h2>Interesses acadêmicos</h2>
                      </div>
                      <ProfileTags items={studentProfile.extras.interests} emptyMessage={emptyListMessage} />
                    </section>
                    </div>
                    <section className={`${styles.profileCard} ${styles.listCard} ${styles.activityCard}`}>
                      <div className={styles.sectionHeading}>
                        <span>IDEIAS E PROJETOS</span>
                        <h2>
                          {isOwnProfile ? 'Minhas propostas' : 'Propostas publicadas'}
                          <small> ({studentProposals.length})</small>
                        </h2>
                      </div>
                      {proposalsLoading ? (
                        <p className={styles.emptyList} role="status">Carregando propostas...</p>
                      ) : proposalsError ? (
                        <p className={styles.inlineError} role="alert">{proposalsError}</p>
                      ) : studentProposals.length ? (
                        <div className={styles.activityList}>
                          {studentProposals.map((proposal) => (
                            <article className={styles.activityItem} key={proposal.id}>
                              <span className={styles.activityIcon}><BookOpen size={17} /></span>
                              <div className={styles.activityContent}>
                                <strong>{proposal.title}</strong>
                                <span>{proposal.desiredSkills.join(' · ') || 'Proposta acadêmica'}</span>
                              </div>
                              <span className={`${styles.statusBadge} ${proposal.status === 'OPEN' ? styles.statusSuccess : ''}`}>
                                {proposalStatusLabels[proposal.status]}
                              </span>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.emptyActivity}>
                          <BookOpen size={22} />
                          <p>
                            {isOwnProfile
                              ? 'As propostas criadas por você aparecerão aqui.'
                              : 'Este discente ainda não publicou propostas.'}
                          </p>
                        </div>
                      )}
                    </section>
                  </>
                ) : professorProfile ? (
                  <>
                    <div className={styles.profileTwoCol}>
                      <section className={`${styles.profileCard} ${styles.listCard}`}>
                        <div className={styles.sectionHeading}>
                          <span>ATUAÇÃO ACADÊMICA</span>
                          <h2>Áreas de pesquisa</h2>
                        </div>
                        <ProfileTags items={professorProfile.extras.researchAreas} emptyMessage={emptyListMessage} />
                      </section>
                      <section className={`${styles.profileCard} ${styles.listCard}`}>
                        <div className={styles.sectionHeading}>
                          <span>ESPECIALIDADES</span>
                          <h2>Linhas de atuação</h2>
                        </div>
                        <ProfileTags items={professorProfile.extras.researchLines} emptyMessage={emptyListMessage} />
                      </section>
                    </div>
                    <section className={`${styles.profileCard} ${styles.listCard}`}>
                      <div className={styles.sectionHeading}>
                        <span>OPORTUNIDADES</span>
                        <h2>
                          {isOwnProfile ? 'Minhas oportunidades' : 'Oportunidades publicadas'}
                          <small> ({ownOpportunities.length})</small>
                        </h2>
                      </div>
                      {opportunitiesLoading ? (
                        <p className={styles.emptyList} role="status">Carregando oportunidades...</p>
                      ) : opportunitiesError ? (
                        <p className={styles.inlineError} role="alert">{opportunitiesError}</p>
                      ) : ownOpportunities.length ? (
                        <div className={styles.activityList}>
                          {ownOpportunities.map((opportunity) => (
                            <article className={styles.activityItem} key={opportunity.id}>
                              <span className={`${styles.activityIcon} ${styles.professorActivityIcon}`}>
                                <BriefcaseBusiness size={17} />
                              </span>
                              <div className={styles.activityContent}>
                                <strong>{opportunity.title}</strong>
                                <span>{opportunityTypeLabels[opportunity.type]}</span>
                              </div>
                              <span className={styles.statusBadge}>
                                {opportunityStatusLabels[opportunity.status]}
                              </span>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.emptyActivity}>
                          <BriefcaseBusiness size={22} />
                          <p>
                            {isOwnProfile
                              ? 'As oportunidades criadas por você aparecerão aqui.'
                              : 'Este docente ainda não publicou oportunidades.'}
                          </p>
                        </div>
                      )}
                    </section>
                  </>
                ) : null}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default ProfilePage
