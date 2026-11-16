import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './components/HomePage'
import LoginPage from './components/LoginPage'
import MyProjectsPage from './components/MyProjectsPage'
import PrivateRoute from './components/PrivateRoute'
import ProfilePage from './components/ProfilePage'
import { useAuth } from './hooks/useAuth'
import type { LoginCredentials } from './types/domain'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Application />
      </AuthProvider>
    </BrowserRouter>
  )
}

function AuthenticatedHomePage({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth()
  return user ? <HomePage user={user} onLogout={onLogout} /> : <Navigate to="/login" replace />
}

function Application() {
  const { user, isLoading, error, login, logout, clearError } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (credentials: LoginCredentials) => {
    const authenticated = await login(credentials)
    if (authenticated) navigate('/')
    return authenticated
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user
          ? <Navigate to="/" replace />
          : (
            <LoginPage
              clearError={clearError}
              error={error}
              isLoading={isLoading}
              onLogin={handleLogin}
            />
          )}
      />
      <Route
        path="/"
        element={(
          <PrivateRoute>
            <AuthenticatedHomePage onLogout={logout} />
          </PrivateRoute>
        )}
      />
      <Route path="/perfil" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/perfil/:id" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route
        path="/meus-projetos"
        element={(
          <PrivateRoute>
            <MyProjectsPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/discente/perfil"
        element={(
          <PrivateRoute allowedRoles={['STUDENT']}>
            <ProfilePage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/docente/perfil"
        element={(
          <PrivateRoute allowedRoles={['PROFESSOR']}>
            <ProfilePage />
          </PrivateRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
