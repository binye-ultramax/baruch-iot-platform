import {
  AlertTriangle,
  Lock,
  PlugZap,
  RefreshCw,
  Unplug,
} from 'lucide-react'
import { useState } from 'react'
import type { DeviceData } from '../../data/mockDevices'

interface DeviceActionPanelProps {
  device: DeviceData
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected'

function StatusDot({ color }: { color: 'gray' | 'green' | 'amber' | 'red' }) {
  const colors = {
    gray: 'bg-gray-400',
    green: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red: 'bg-red-500',
  }

  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {color === 'green' && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[color]}`} />
    </span>
  )
}

export function DeviceActionPanel({ device }: DeviceActionPanelProps) {
  const [lockedDown, setLockedDown] = useState(device.status === 'offline')
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(device.lastUpdate)
  const [showLockdownWarning, setShowLockdownWarning] = useState(false)

  const isConnected = connectionState === 'connected'
  const isConnecting = connectionState === 'connecting'
  const canConnect = !lockedDown && connectionState === 'disconnected'

  function handleRefresh() {
    setRefreshing(true)
    window.setTimeout(() => {
      setRefreshing(false)
      setLastRefreshed(
        new Date().toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
    }, 800)
  }

  function handleConnect() {
    if (!canConnect) return
    setConnectionState('connecting')
    window.setTimeout(() => setConnectionState('connected'), 1000)
  }

  function handleDisconnect() {
    setConnectionState('disconnected')
  }

  function requestLockdown() {
    setShowLockdownWarning(true)
  }

  function confirmLockdown() {
    setLockedDown(true)
    setConnectionState('disconnected')
    setShowLockdownWarning(false)
  }

  function releaseLockdown() {
    setLockedDown(false)
    setShowLockdownWarning(false)
  }

  const status = lockedDown
    ? {
        dot: 'red' as const,
        title: 'Locked down',
        subtitle: 'Battery supply off · Not connected',
        panelClass: 'border-red-200 bg-red-50',
      }
    : isConnecting
      ? {
          dot: 'amber' as const,
          title: 'Connecting…',
          subtitle: `Establishing link to ${device.name}`,
          panelClass: 'border-amber-200 bg-amber-50',
        }
      : isConnected
        ? {
            dot: 'green' as const,
            title: 'Connected',
            subtitle: 'Live telemetry active',
            panelClass: 'border-emerald-200 bg-emerald-50',
          }
        : {
            dot: 'gray' as const,
            title: 'Not connected',
            subtitle: 'Connect to enable live control',
            panelClass: 'border-gray-200 bg-gray-50',
          }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">Actions</h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh data"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className={`mb-4 rounded-lg border px-3 py-3 ${status.panelClass}`}>
        <div className="flex items-center gap-2.5">
          {lockedDown ? (
            <Lock className="h-4 w-4 shrink-0 text-red-600" />
          ) : (
            <StatusDot color={status.dot} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{status.title}</p>
            <p className="text-xs text-gray-600">{status.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {canConnect && (
          <button
            type="button"
            onClick={handleConnect}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
          >
            <PlugZap className="h-4 w-4" />
            Connect to device
          </button>
        )}

        {isConnecting && (
          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-wait items-center justify-center gap-2 rounded-lg bg-primary/80 px-4 py-2.5 text-sm font-medium text-white"
          >
            <RefreshCw className="h-4 w-4 animate-spin" />
            Connecting…
          </button>
        )}

        {isConnected && !lockedDown && (
          <button
            type="button"
            onClick={handleDisconnect}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Unplug className="h-4 w-4" />
            Disconnect
          </button>
        )}

        <div className="border-t border-gray-200 pt-3">
          {!lockedDown ? (
            <>
              <button
                type="button"
                onClick={requestLockdown}
                disabled={showLockdownWarning}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
              >
                <Lock className="h-4 w-4" />
                Lock down device
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">
                Shuts off battery supply and disconnects from platform
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={releaseLockdown}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Release lockdown
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">
                Restores power — reconnect manually after release
              </p>
            </>
          )}
        </div>

        {showLockdownWarning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-3 flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">Lock down device?</p>
                <p className="mt-1 text-xs text-amber-800">
                  Locking down {device.name} will shut down the battery supply.
                  {isConnected && ' The active connection will be closed immediately.'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmLockdown}
                className="flex-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                Confirm lockdown
              </button>
              <button
                type="button"
                onClick={() => setShowLockdownWarning(false)}
                className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">Last refresh: {lastRefreshed}</p>
      </div>
    </div>
  )
}
