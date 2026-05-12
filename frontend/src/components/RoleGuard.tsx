import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  allow: string[]
  children: React.ReactNode
  redirectTo?: string
}

export default function RoleGuard({ allow, children, redirectTo = '/dashboard' }: Props) {
  const { user } = useAuth()
  if (!user || !allow.includes(user.role)) return <Navigate to={redirectTo} replace />
  return <>{children}</>
}
