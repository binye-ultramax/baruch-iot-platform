import { useState } from 'react'
import { usePlatform } from '../../context/PlatformContext'
import { Card } from '../ui/Card'

export function AdminSettings() {
  const { settings, updateSettings } = usePlatform()
  const [draft, setDraft] = useState(settings)
  const [saved, setSaved] = useState(false)

  function updateDraft<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    updateSettings(draft)
    setSaved(true)
  }

  function handleReset() {
    setDraft(settings)
    setSaved(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Platform defaults</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure default telemetry and alert behaviour for newly provisioned devices.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Default upload interval</span>
            <input
              value={draft.uploadInterval}
              onChange={(event) => updateDraft('uploadInterval', event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Default sampling interval</span>
            <input
              value={draft.samplingInterval}
              onChange={(event) => updateDraft('samplingInterval', event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Data retention</span>
            <input
              value={draft.dataRetention}
              onChange={(event) => updateDraft('dataRetention', event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Alert delivery</span>
            <select
              value={draft.alertDelivery}
              onChange={(event) => updateDraft('alertDelivery', event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="Email + dashboard">Email + dashboard</option>
              <option value="Dashboard only">Dashboard only</option>
              <option value="Email + SMS + dashboard">Email + SMS + dashboard</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Low SOC threshold (%)</span>
            <input
              type="number"
              min={5}
              max={50}
              value={draft.lowSocThreshold}
              onChange={(event) => updateDraft('lowSocThreshold', Number(event.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Offline alert after (minutes)</span>
            <input
              type="number"
              min={5}
              max={240}
              value={draft.offlineAlertMinutes}
              onChange={(event) => updateDraft('offlineAlertMinutes', Number(event.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            Save settings
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          {saved && <span className="text-sm text-emerald-600">Settings saved in this session.</span>}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Security</h2>
        <p className="text-sm text-gray-500">
          Password policy, SSO, and audit export are not available in this mock environment.
        </p>
      </Card>
    </div>
  )
}
