import { LayoutDashboard, Settings, Users } from 'lucide-react'

export type AdminSection = 'overview' | 'users' | 'settings'

const navItems: {
  id: AdminSection
  label: string
  icon: typeof LayoutDashboard
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'settings', label: 'Platform settings', icon: Settings },
]

interface AdminSidebarProps {
  activeSection: AdminSection
  onSelect: (section: AdminSection) => void
}

export function AdminSidebar({ activeSection, onSelect }: AdminSidebarProps) {
  return (
    <aside className="w-full shrink-0 border-b border-gray-200 bg-white lg:w-56 lg:border-r lg:border-b-0">
      <div className="px-4 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Platform admin
        </p>
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-light text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
