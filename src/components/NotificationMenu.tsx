import { useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import type { NotificationType } from '../types/domain'
import styles from './NotificationMenu.module.css'

const typeLabels: Record<NotificationType, string> = {
  NEW_OPPORTUNITY: 'Nova oportunidade',
  SELECTION_PROCESS_UPDATE: 'Processo seletivo',
  PITCH_INTEREST: 'Interesse em proposta',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
    new Date(`${value.slice(0, 10)}T12:00:00`),
  )
}

function NotificationMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    reload,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        aria-controls="notification-panel"
        aria-expanded={isOpen}
        aria-label={unreadCount ? `Notificações, ${unreadCount} não lidas` : 'Notificações'}
        className={styles.trigger}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && <span className={styles.count}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <section
          aria-label="Notificações"
          className={styles.panel}
          id="notification-panel"
          role="dialog"
        >
          <div className={styles.panelHeader}>
            <div>
              <h2>Notificações</h2>
              <p>{unreadCount ? `${unreadCount} não lidas` : 'Tudo em dia'}</p>
            </div>
            <div className={styles.panelHeaderActions}>
              {unreadCount > 0 && (
                <button className={styles.markAllRead} onClick={() => void markAllAsRead()} type="button">
                  <CheckCheck size={14} /> Marcar todas como lidas
                </button>
              )}
              <button
                aria-label="Fechar notificações"
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.error} role="alert">
              <span>{error}</span>
              <button onClick={() => void reload()} type="button">Tentar novamente</button>
            </div>
          )}

          {isLoading ? (
            <p className={styles.status} role="status">Carregando notificações...</p>
          ) : notifications.length ? (
            <ul className={styles.list}>
              {notifications.map((notification) => (
                <li
                  className={`${styles.item} ${notification.isRead ? '' : styles.unread}`}
                  key={notification.id}
                >
                  <div className={styles.itemMeta}>
                    <span>{typeLabels[notification.type]}</span>
                    <time dateTime={notification.sentAt}>{formatDate(notification.sentAt)}</time>
                  </div>
                  <h3>{notification.title}</h3>
                  <p>{notification.message}</p>
                  {!notification.isRead && (
                    <button
                      className={styles.markRead}
                      onClick={() => void markAsRead(notification.id)}
                      type="button"
                    >
                      <Check size={14} /> Marcar como lida
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            !error && <p className={styles.status}>Nenhuma notificação no momento</p>
          )}
        </section>
      )}
    </div>
  )
}

export default NotificationMenu
