import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { EmptyState, PageLoader } from './StateViews'

/**
 * Hides admin pages from non-admins. This is a UX convenience only —
 * every admin API route is independently protected on the server.
 */
export function RequireAdmin() {
  const { user, isAdmin, status } = useAuth()
  const location = useLocation()

  if (status === 'checking') return <PageLoader label="Checking your session…" />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (!isAdmin)
    return (
      <EmptyState
        title="Admins only"
        message="You don't have permission to view this page."
        action={
          <Link to="/" className="btn-primary mt-2">
            Back to products
          </Link>
        }
      />
    )
  return <Outlet />
}

/**
 * Keeps logged-in users away from /login and /register. Also performs the
 * post-login redirect back to the page that sent the user here.
 */
export function GuestOnly() {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'checking') return <PageLoader />
  if (user) {
    const from = location.state?.from
    const target = from ? `${from.pathname}${from.search || ''}` : '/'
    return <Navigate to={target} replace />
  }
  return <Outlet />
}
