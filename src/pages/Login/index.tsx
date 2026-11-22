import { useEffect, useState, type FormEvent } from 'react'
import {
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  UserRound,
} from 'lucide-react'
import type { LoginCredentials } from '../../types/domain'
import styles from './Login.module.css'

interface LoginPageProps {
  onLogin: (credentials: LoginCredentials) => Promise<boolean>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

const SHOW_MOCK_HINT = import.meta.env.VITE_USE_MOCKS === 'true'

function LoginPage({ onLogin, isLoading, error, clearError }: LoginPageProps) {
  const [username, setUsername] = useState('student')
  const [password, setPassword] = useState('oportuniza')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onLogin({ username: username.trim(), password })
  }

  return (
    <main className={styles['login-page']}>
      <section className={styles['login-card']} aria-label="Acesso à plataforma">
        <div className={styles['login-intro']}>
          <div className={styles['intro-content']}>
            <div className={styles.brand}>
              <span className={styles['brand-mark']}>
                <GraduationCap size={23} strokeWidth={2.2} />
              </span>
              <div className={styles['brand-text']}>
                <span className={styles['brand-name']}>oportuniza<span>.</span></span>
                <span className={styles['brand-institution']}>UNIVERSIDADE FEDERAL RURAL DO SEMI-ÁRIDO</span>
              </div>
            </div>

            <span className={styles['accent-bar']} aria-hidden="true" />

            <h1>Conectando discentes e docentes por meio de oportunidades acadêmicas.</h1>
            <p>
              Encontre projetos, bolsas e orientadores, ou divulgue vagas e
              acompanhe candidaturas em um só lugar.
            </p>

            <dl className={styles['intro-points']}>
              <div><dt>Pesquisa</dt><dd>iniciação científica e inovação</dd></div>
              <div><dt>Extensão</dt><dd>projetos e impacto social</dd></div>
              <div><dt>Monitoria</dt><dd>ensino e bolsas acadêmicas</dd></div>
            </dl>
          </div>
        </div>

        <div className={styles['login-form-panel']}>
          <div className={styles['login-form-card']}>
            <div className={styles['form-heading']}>
              <h2>Entrar</h2>
              <p>Use o mesmo login do SIGAA.</p>
            </div>

            <form className={styles['login-form']} onSubmit={handleSubmit}>
              <label className={styles['form-label']} htmlFor="username">Usuário</label>
              <div className={styles['input-shell']}>
                <UserRound size={17} aria-hidden="true" />
                <input
                  autoComplete="username"
                  id="username"
                  name="username"
                  onChange={(event) => {
                    setUsername(event.target.value)
                    clearError()
                  }}
                  placeholder="Seu usuário institucional"
                  required
                  value={username}
                />
              </div>

              <label className={styles['form-label']} htmlFor="password">Senha</label>
              <div className={styles['input-shell']}>
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  autoComplete="current-password"
                  id="password"
                  name="password"
                  onChange={(event) => {
                    setPassword(event.target.value)
                    clearError()
                  }}
                  placeholder="Sua senha"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className={styles['password-toggle']}
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              <button className={styles['login-submit']} disabled={isLoading} type="submit">
                {isLoading ? 'Entrando...' : 'Entrar'} <span aria-hidden="true">→</span>
              </button>
            </form>

            {error && <p className={styles['login-error']} role="alert">{error}</p>}
            {SHOW_MOCK_HINT && (
              <p className={styles['demo-note']}>
                <span className={styles['demo-dot']} />
                <span>
                  Para testar, use <code>aluno.ufersa</code> (discente) ou <code>prof.ufersa</code> (docente).
                </span>
              </p>
            )}
          </div>
          <p className={styles['login-footer']}>
            Oportuniza UFERSA • Universidade Federal Rural do Semi-Árido
          </p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
