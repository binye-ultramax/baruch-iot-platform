import { useState } from 'react'
import { AdminOverview } from '../components/admin/AdminOverview'
import { AdminSettings } from '../components/admin/AdminSettings'
import { AdminSidebar, type AdminSection } from '../components/admin/AdminSidebar'
import { AdminUsers } from '../components/admin/AdminUsers'
import { AppHeader } from '../components/layout/AppHeader'
import { useAuth } from '../context/AuthContext'

export function AdminPage() {
  const { user } = useAuth()
  const [section, setSection] = useState<AdminSection>('overview')

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppHeader
        title="Platform Administration"
        subtitle={`Platform admin · ${user?.name}`}
        breadcrumb={[
          { label: 'Devices', to: '/devices' },
          { label: 'Admin' },
        ]}
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        <AdminSidebar activeSection={section} onSelect={setSection} />

        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-6xl">
            {section === 'overview' && <AdminOverview />}
            {section === 'users' && <AdminUsers />}
            {section === 'settings' && <AdminSettings />}
          </div>
        </main>
      </div>
    </div>
  )
}
