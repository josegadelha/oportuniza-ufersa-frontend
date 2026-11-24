import { useEffect, useMemo, useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { userService } from '../services/userService'
import type { ProjectProposalInvite, ProjectProposalInviteCandidate } from '../types/domain'
import styles from './ProposalInvitePicker.module.css'

interface ProposalInvitePickerProps {
  invites: ProjectProposalInvite[]
  onChange: (invites: ProjectProposalInvite[]) => void
  disabled?: boolean
}

function roleLabel(role: ProjectProposalInvite['role']) {
  return role === 'student' ? 'Aluno' : 'Docente'
}

function statusLabel(status: ProjectProposalInvite['status']) {
  return status === 'accepted' ? 'Aceito' : 'Convidado'
}

export default function ProposalInvitePicker({
  invites,
  onChange,
  disabled = false,
}: ProposalInvitePickerProps) {
  const [candidates, setCandidates] = useState<ProjectProposalInviteCandidate[]>([])
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    userService.listInviteCandidates(controller.signal)
      .then(setCandidates)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os usuários.')
        }
      })
    return () => controller.abort()
  }, [])

  const availableCandidates = useMemo(() => {
    const invitedIds = new Set(invites.map((invite) => invite.userId))
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
    return candidates.filter((candidate) => (
      !invitedIds.has(candidate.userId)
      && (candidate.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
        || roleLabel(candidate.role).toLocaleLowerCase('pt-BR').includes(normalizedSearch))
    ))
  }, [candidates, invites, search])

  function addInvite() {
    const candidate = availableCandidates.find((item) => item.userId === selectedUserId)
    if (!candidate) return
    onChange([...invites, { ...candidate, status: 'pending' }])
    setSearch('')
    setSelectedUserId('')
  }

  return (
    <section className={styles.invitePicker} aria-label="Convidar pessoas para a proposta">
      <label className={styles.searchLabel}>
        <span>Convidar alunos ou docentes</span>
        <input
          disabled={disabled}
          onChange={(event) => {
            setSearch(event.target.value)
            setSelectedUserId('')
          }}
          placeholder="Buscar pelo nome"
          type="search"
          value={search}
        />
      </label>
      {availableCandidates.length > 0 && (
        <div className={styles.addRow}>
          <select
            aria-label="Selecionar usuário para convidar"
            disabled={disabled}
            onChange={(event) => setSelectedUserId(event.target.value)}
            value={selectedUserId}
          >
            <option value="">Selecione uma pessoa</option>
            {availableCandidates.map((candidate) => (
              <option key={candidate.userId} value={candidate.userId}>
                {candidate.name} · {roleLabel(candidate.role)}
              </option>
            ))}
          </select>
          <button disabled={disabled || !selectedUserId} onClick={addInvite} type="button">
            <UserPlus size={15} /> Convidar
          </button>
        </div>
      )}
      {loadError && <p className={styles.error} role="alert">{loadError}</p>}
      {invites.length > 0 ? (
        <ul className={styles.inviteList}>
          {invites.map((invite) => (
            <li className={styles.inviteRow} key={invite.userId}>
              <span className={styles.inviteName}>{invite.name}</span>
              <span className={styles.role}>{roleLabel(invite.role)}</span>
              <span className={styles.status}>{statusLabel(invite.status)}</span>
              <button
                aria-label={`Remover convite de ${invite.name}`}
                disabled={disabled}
                onClick={() => onChange(invites.filter((item) => item.userId !== invite.userId))}
                type="button"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Ninguém foi convidado ainda.</p>
      )}
    </section>
  )
}
