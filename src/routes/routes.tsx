import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import Login from '../pages/Login'
import Home from '../pages/Home'
import MyProjects from '../pages/MyProjects'
import Profile from '../pages/Profile'
import NotFound from './NotFound'
import PrivateRoute from './PrivateRoute'
import { useAuth } from '../hooks/useAuth'
import type { LoginCredentials } from '../types/domain'

function AuthenticatedHomePage({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth()
  return user ? <Home user={user} onLogout={onLogout} /> : <Navigate to="/login" replace />
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
            <Login
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
      <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/perfil/:id" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route
        path="/meus-projetos"
        element={(
          <PrivateRoute>
            <MyProjects />
          </PrivateRoute>
        )}
      />
      <Route
        path="/discente/perfil"
        element={(
          <PrivateRoute allowedRoles={['STUDENT']}>
            <Profile />
          </PrivateRoute>
        )}
      />
      <Route
        path="/docente/perfil"
        element={(
          <PrivateRoute allowedRoles={['PROFESSOR']}>
            <Profile />
          </PrivateRoute>
        )}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Application />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRoutes
