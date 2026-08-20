import { useState } from 'react'
import { getUserLastLogin, usePlatform } from '../../context/PlatformContext'
import { mockUsers } from '../../data/mockUsers'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export function AdminUsers() {
  const { userRoles, getManagedDevices, getDeviceOwnerEmail, updateUserRole, assignPersonalDevice } =
    usePlatform()
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [draftRole, setDraftRole] = useState('Operator')
  const [draftDeviceId, setDraftDeviceId] = useState('dev-bt-admin')

  function openEditor(email: string) {
    setEditingEmail(email)
    setDraftRole(userRoles[email] ?? 'Operator')
    const owned = getManagedDevices(email).find((device) => device.id.startsWith('dev-bt-'))
    setDraftDeviceId(owned?.id ?? 'dev-bt-admin')
  }

  function saveEditor() {
    if (!editingEmail) return
    updateUserRole(editingEmail, draftRole)
    assignPersonalDevice(draftDeviceId, editingEmail)
    setEditingEmail(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">User accounts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage roles and personal Bluetooth monitor assignment.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4 font-medium">User</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Managed devices</th>
                <th className="pb-3 pr-4 font-medium">Last login</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => {
                const managed = getManagedDevices(user.email)
                const personal = managed.filter((device) => Boolean(getDeviceOwnerEmail(device)))
                const personalNames = personal.map((device) => device.name).join(', ') || '—'
                const sharedCount = managed.length - personal.length

                return (
                  <tr key={user.email} className="border-b border-gray-100 align-top last:border-0">
                    <td className="py-4 pr-4">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant="muted">{userRoles[user.email] ?? user.role}</Badge>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="font-medium text-gray-900">{managed.length} total</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {sharedCount} shared fleet · Personal: {personalNames}
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-gray-600">{getUserLastLogin(user.email)}</td>
                    <td className="py-4">
                      <button
                        type="button"
                        onClick={() => openEditor(user.email)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editingEmail && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Edit user</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Role</span>
              <select
                value={draftRole}
                onChange={(event) => setDraftRole(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="Administrator">Administrator</option>
                <option value="Operator">Operator</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Personal Bluetooth monitor</span>
              <select
                value={draftDeviceId}
                onChange={(event) => setDraftDeviceId(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="dev-bt-admin">BM-01 (Admin unit)</option>
                <option value="dev-bt-operator">BM-01 (Operator unit)</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={saveEditor}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={() => setEditingEmail(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
