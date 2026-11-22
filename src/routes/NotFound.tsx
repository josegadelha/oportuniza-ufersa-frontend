import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import styles from './NotFound.module.css'

function NotFound() {
  return (
    <main className={styles['not-found-page']}>
      <div className={styles['not-found-container']}>
        <div className={styles['error-icon']}>
          <Search size={56} strokeWidth={1.5} />
        </div>
        <h1>Página não encontrada</h1>
        <p>Desculpe, não conseguimos encontrar a página que você está procurando.</p>
        <Link className={styles['back-link']} to="/">
          Voltar para a página inicial
        </Link>
      </div>
    </main>
  )
}

export default NotFound
