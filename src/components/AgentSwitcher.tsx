'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import { buildPlanAgents, requiresSelfHost, type Agent } from '@/lib/agents'
import { Lock, ChevronDown } from 'lucide-react'

interface Props {
  onPick: (agent: Agent, mode: 'run' | 'never-ask') => void
}

/**
 * The opencode-style "build / plan" dropdown. Sits near the chat input.
 * Picking an agent injects the right system prompt + starts the right mode.
 */
export function AgentSwitcher({ onPick }: Props) {
  const [open, setOpen] = useState(false)
  const agents = useMemo(() => buildPlanAgents(), [])
  const { ultraplinianApiUrl, ultraplinianApiKey } = useStore()
  const selfHosted = Boolean(ultraplinianApiUrl && ultraplinianApiKey)

  if (!agents.length) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-md border border-theme-border bg-theme-elevation px-3 py-1.5 text-xs text-theme-foreground hover:bg-theme-hover"
      >
        <span>Build / Plan</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-40 w-72 rounded-md border border-theme-border bg-theme-bg shadow-2xl overflow-hidden">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-theme-muted-foreground border-b border-theme-border">
            Agents — pick one to run
          </div>
          {agents.map(a => {
            const needsSelfHost = requiresSelfHost(a)
            const disabled = needsSelfHost && !selfHosted
            return (
              <div key={a.id} className="border-b border-theme-border/40 last:border-0">
                <button
                  disabled={disabled}
                  onClick={() => { setOpen(false); onPick(a, 'run') }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-theme-accent/30 disabled:opacity-40"
                >
                  <span className="text-base leading-none">{a.icon}</span>
                  <span className="flex-1">
                    <div className="flex items-center gap-2 font-medium text-theme-foreground">
                      {a.name}
                      {needsSelfHost && <Lock className="h-3 w-3 text-amber-400" />}
                      {a.mode === 'persistent' && (
                        <span className="text-[9px] uppercase tracking-wide text-lime-400">persistent</span>
                      )}
                    </div>
                    <div className="text-[10px] text-theme-muted-foreground">{a.description}</div>
                    {disabled && (
                      <div className="mt-1 text-[10px] text-amber-400">
                        Requires self-hosted g0dm0d4 API (skHermes, shellexec, etc.). Start it, or pick a browser-only agent.
                      </div>
                    )}
                  </span>
                </button>

                {a.mode !== 'persistent' && (
                  <button
                    disabled={disabled}
                    onClick={() => { setOpen(false); onPick(a, 'never-ask') }}
                    className="block w-full border-t border-theme-border/40 px-3 py-1.5 text-left text-[10px] text-theme-muted-foreground hover:bg-theme-accent/30 hover:text-theme-foreground disabled:opacity-40"
                  >
                    ↳ Run with <code className="text-lime-400">/never-ask</code> (auto-approve everything)
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
