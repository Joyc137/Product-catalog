import { Link } from 'react-router-dom'
import { EmptyState } from '../components/StateViews'

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      message="The page you're looking for doesn't exist."
      action={
        <Link to="/" className="btn-primary mt-2">
          Back to products
        </Link>
      }
    />
  )
}
