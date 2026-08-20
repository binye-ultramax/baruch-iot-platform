import { useState } from 'react'
import { ManageDevices } from '../components/manage/ManageDevices'
import { ManageOverview } from '../components/manage/ManageOverview'
import { ManageSidebar, type ManageSection } from '../components/manage/ManageSidebar'
import { AppHeader } from '../components/layout/AppHeader'
import { useAuth } from '../context/AuthContext'

export function FleetManagePage() {
  const { user } = useAuth()
  const [section, setSection] = useState<ManageSection>('overview')

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppHeader
        title="Fleet Management"
        subtitle={`Managing devices for ${user?.name}`}
        showAdminLink={user?.role === 'Administrator'}
        breadcrumb={[
          { label: 'Devices', to: '/devices' },
          { label: 'Manage' },
        ]}
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        <ManageSidebar activeSection={section} onSelect={setSection} />

        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-6xl">
            {section === 'overview' && <ManageOverview />}
            {section === 'devices' && <ManageDevices />}
          </div>
        </main>
      </div>
    </div>
  )
}
