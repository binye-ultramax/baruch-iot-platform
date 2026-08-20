import { LogOut, Settings2, Shield, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface BreadcrumbItem {
  label: string
  to?: string
}

interface AppHeaderProps {
  title: string
  subtitle?: string
  showAdminLink?: boolean
  breadcrumb?: BreadcrumbItem[]
}

export function AppHeader({ title, subtitle, showAdminLink = false, breadcrumb }: AppHeaderProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-2">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-1 flex items-center gap-1.5 text-sm text-gray-500">
            {breadcrumb.map((item, index) => (
              <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
                {index > 0 && <span>&gt;</span>}
                {item.to ? (
                  <Link to={item.to} className="hover:text-primary">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-700">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/manage"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Settings2 className="h-4 w-4" />
          Manage
        </Link>
        {showAdminLink && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary-light px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <User className="h-4 w-4" />
          Profile
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  )
}
