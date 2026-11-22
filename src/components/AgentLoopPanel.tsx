'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store'
import { getAgent } from '@/lib/agents'
import { runPersistentAgent, type LoopStep, type LoopResult } from '@/lib/persistent'
import { getChatEndpoint, getProvider } from '@/lib/providers'
import { X, Zap, StopCircle } from 'lucide-react'

interface Props {
  open: boolean
  agentId: string | null
  goal: string
  neverAsk: boolean
  mode: 'interactive' | 'unattended'
  tokenBudget: number
  onClose: () => void
}

/**
 * Live view of a persistent agent run — streams each iteration into a feed,
 * shows progress, and offers an abort button. The "never-ask" flag makes it
 * auto-approve all steps without user prompts.
 */
export function AgentLoopPanel({ open, agentId, goal, neverAsk, mode, tokenBudget, onClose }: Props) {
  const [steps, setSteps] = useState<LoopStep[]>([])
  const [result, setResult] = useState<LoopResult | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const feedEndRef = useRef<HTMLDivElement>(null)

  const { apiKey, ultraplinianApiUrl, ultraplinianApiKey, providerId, customProviderUrl, currentConversation } = useStore() as any
  const model = currentConversation?.model ?? 'anthropic/claude-opus-4.6'

  useEffect(() => {
    if (!open || !agentId) return
    const agent = getAgent(agentId)
    if (!agent) return

    setSteps([])
    setResult(null)
    abortRef.current = new AbortController()

    const endpoint = ultraplinianApiUrl && ultraplinianApiKey
      ? `${ultraplinianApiUrl.replace(/\/+$/, '')}/v1/chat/completions`
      : getChatEndpoint(getProvider(providerId ?? 'openrouter'), customProviderUrl)

    const apiKeyToUse = ultraplinianApiKey || apiKey

    void (async () => {
      const res = await runPersistentAgent({
        agentId,
        goal,
        model,
        apiKey: apiKeyToUse,
        baseUrl: endpoint,
        apiKeyHeader: 'Authorization',
        neverAsk,
        maxIterations: 50,
        tokenBudget: tokenBudget ?? 100_000,
        tokensUsed: 0,
        mode,
        signal: abortRef.current!.signal,
        onStep: (step: LoopStep) => setSteps(prev => [...prev, step]),
      })
      setResult(res)
    })()

    return () => abortRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agentId, goal, neverAsk, mode, tokenBudget])

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps])

  if (!open || !agentId) return null
  const agent = getAgent(agentId)
  if (!agent) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl max-h-[86vh] overflow-hidden rounded-lg border border-theme-border bg-theme-bg flex flex-col">
        <div className="flex items-center justify-between border-b border-theme-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-lime-400" />
            <h2 className="text-sm font-semibold text-theme-foreground">
              {agent.name} — {mode === 'unattended' ? 'SDLC unattended' : neverAsk ? 'auto-run' : 'interactive'} until goal met
            </h2>
            <div className="flex items-center gap-2 text-[10px] mono text-theme-muted-foreground">
              <span>budget: {tokenBudget.toLocaleString()} tok</span>
              {steps.length > 0 && (
                <span className={steps[steps.length - 1].tokensUsed ?? 0 > tokenBudget * 0.85 ? 'text-amber-400' : ''}>
                  used: {(steps[steps.length - 1].tokensUsed ?? 0).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!result && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20"
              >
                <StopCircle className="h-3.5 w-3.5" /> Abort
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-theme-accent/40 text-theme-muted-foreground hover:text-theme-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          <div className="rounded-md border border-theme-border bg-theme-elevation p-2.5 text-[11px]">
            <div className="text-theme-muted-foreground mb-1">GOAL</div>
            <div className="text-theme-foreground font-mono whitespace-pre-wrap">{goal}</div>
            <div className="mt-1 text-[10px] text-theme-muted-foreground">
              {mode === 'unattended'
                ? 'SDLC UNATTENDED — agent makes all calls, never prompts. Wake up when done.'
                : neverAsk ? '/never-ask active — agent auto-approves all steps' : 'Interactive — model may ask for your confirmation'}
            </div>
          </div>

          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="rounded-md border border-theme-border overflow-hidden">
                <div className="bg-theme-elevation px-3 py-1.5 text-[10px] text-theme-muted-foreground border-b border-theme-border flex items-center justify-between">
                  <span>iteration {s.iteration} · {s.phase}</span>
                  {s.filesProduced !== undefined && s.filesProduced > 0 && (
                    <span className="text-lime-400">+{s.filesProduced} code blocks</span>
                  )}
                </div>
                <pre className="max-h-64 overflow-y-auto p-3 text-[11px] leading-relaxed bg-theme-bg text-theme-foreground whitespace-pre-wrap">
                  {s.text}
                </pre>
              </div>
            ))}
            <div ref={feedEndRef} />
          </div>

          {result && (
            <div className={`rounded-md border px-3 py-2 text-xs ${
              result.status === 'done' ? 'border-lime-500/40 bg-lime-500/10 text-lime-400'
              : result.status === 'aborted' ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
              : 'border-red-500/40 bg-red-500/10 text-red-400'
            }`}>
              {result.status === 'done' && `Goal reached in ${result.totalIterations} iterations. ${result.filesProduced} code blocks produced.`}
              {result.status === 'aborted' && 'Stopped by user.'}
              {result.status === 'budget-exhausted' && `Iteration budget exceeded. ${result.filesProduced} code blocks produced.`}
              {result.status === 'error' && `Error: ${result.error}`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
