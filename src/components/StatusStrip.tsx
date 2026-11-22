'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { Shield, ShieldOff } from 'lucide-react'

/**
 * Top-right status strip:
 *  - Green dot:  agent connected and idle
 *  - Yellow dot: agent mid-write / paused
 *  - Red dot:    agent disconnected / error
 *  - Grey dot:   no agent selected
 *
 *  Plus the current public IP and simple VPN/proxy pellets.
 *  Everything is best-effort — a browser can't see VPN or proxy state
 *  directly, so it infers by comparing the IP it receives against the
 *  configured home/net IP in settings.
 */
export function StatusStrip() {
  const { agentStatus, vpnEnabled, proxyEnabled, knownIp } = useStore() as any

  const [ip, setIp] = useState<string | null>(null)
  const [ipLoading, setIpLoading] = useState(true)

  useEffect(() => {
    // Cloudflare's DNS-based trace is the fastest way to get the outgoing IP
    // from a browser. No API key, no corsies, single fetch.
    fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' })
      .then(r => r.text())
      .then(t => {
        const m = t.match(/^ip=(.+)$/m)
        if (m) setIp(m[1].trim())
      })
      .catch(() => setIp(null))
      .finally(() => setIpLoading(false))
  }, [])

  const agentColor =
    agentStatus === 'connected' ? 'bg-lime-400'
    : agentStatus === 'working' ? 'bg-amber-400 animate-pulse'
    : agentStatus === 'error'   ? 'bg-red-500'
    : 'bg-gray-500'

  const vpnColor = vpnEnabled ? (knownIp && ip && knownIp !== ip ? 'bg-lime-400' : 'bg-amber-400') : 'bg-gray-500'
  const proxyColor = proxyEnabled ? (knownIp && ip && knownIp !== ip ? 'bg-lime-400' : 'bg-amber-400') : 'bg-gray-500'

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-theme-border bg-theme-bg text-xs">
      <div className="flex items-center gap-3">
        {/* agent light */}
        <div className="flex items-center gap-1.5" title="Agent status">
          <span className={`w-2.5 h-2.5 rounded-full ${agentColor}`} />
          <span className="text-theme-muted-foreground uppercase tracking-wide text-[10px]">
            {agentStatus ?? 'idle'}
          </span>
        </div>
        <span className="text-theme-muted-foreground opacity-40">·</span>

        {/* IP / VPN / Proxy */}
        <div className="flex items-center gap-1.5" title={ip ? `public IP: ${ip}` : 'IP unknown'}>
          <span className="text-theme-muted-foreground uppercase tracking-wide text-[10px]">
            {ipLoading ? 'IP…' : (ip ?? 'offline')}
          </span>
          <span className={`w-2.5 h-2.5 rounded-full ${vpnColor}`} title="VPN" />
          <span className={`w-2.5 h-2.5 rounded-full ${proxyColor}`} title="Proxy" />
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-theme-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>local</span>
      </div>
    </div>
  )
}
