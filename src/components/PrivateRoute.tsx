import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types/domain'

interface PrivateRouteProps {
  children: ReactNode
  allowedRoles?: readonly UserRole[]
}

function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default PrivateRoute
