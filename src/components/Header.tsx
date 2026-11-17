import { FolderKanban } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
