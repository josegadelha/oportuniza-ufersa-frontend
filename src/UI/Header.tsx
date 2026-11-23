import { FolderKanban } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { courseLabels, departmentLabels } from '../constants/domainLabels'
import styles from './Header.module.css'

export function ProjectsAndProcessesLink() {
  const { user } = useAuth()
  const label = user?.role === 'PROFESSOR'
    ? 'Meus projetos e processos'
    : 'Meus projetos e candidaturas'

  return (
    <NavLink
      aria-label={label}
      className={({ isActive }) => (
        isActive ? `${styles.link} ${styles.active}` : styles.link
      )}
      end
      title={label}
      to="/meus-projetos"
    >
      <FolderKanban aria-hidden="true" size={19} />
    </NavLink>
  )
}

export function ProfileLink() {
  const { user } = useAuth()
  if (!user) return null

  const initials = user.profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const roleAndDepartment = user.role === 'PROFESSOR'
    ? `Docente · ${departmentLabels[user.profile.department]}`
    : `${courseLabels[user.profile.course]} · ${user.profile.currentPeriod}º período`

  return (
    <NavLink
      aria-label="Abrir meu perfil"
      className={({ isActive }) => (
        isActive ? `${styles.profileLink} ${styles.profileLinkActive}` : styles.profileLink
      )}
      end
      title={user.profile.name}
      to="/perfil"
    >
      <span className={`${styles.avatar} ${user.role === 'PROFESSOR' ? styles.avatarProfessor : ''}`}>
        {initials}
      </span>
      <span className={styles.profileSummary}>
        <strong>{user.profile.name}</strong>
        <span>{roleAndDepartment}</span>
      </span>
    </NavLink>
  )
}
