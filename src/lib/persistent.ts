/**
 * Persistent-loop agent runtime.
 *
 * Runs an agent in a loop until it declares the goal complete, the iteration
 * budget is hit, or the user aborts. `/never-ask` toggles the auto-approve path —
 * the UI submits each next-step plan without prompting for confirmation.
 */

import { getAgent, type Agent } from './agents'

export interface LoopConfig {
  agentId: string
  goal: string
  model: string
  apiKey: string
  baseUrl: string
  apiKeyHeader: string
  neverAsk: boolean         // /never-ask — auto-approve
  maxIterations: number     // safety cap, e.g. 50
  /** Hard ceiling on tokens spent (prompt + completion, estimated). */
  tokenBudget: number
  /** Estimated tokens consumed so far (updated incrementally). */
  tokensUsed: number
  /** SDLC mode — when 'unattended' the loop never asks for confirmation. */
  mode: 'interactive' | 'unattended'
  onStep: (a: LoopStep) => void
  signal: AbortSignal
}

export interface LoopStep {
  iteration: number
  phase: 'plan' | 'exec' | 'review'
  text: string
  filesProduced?: number
  toolActions?: string[]
  tokensUsed?: number
  tokensRemaining?: number
}

export interface LoopResult {
  status: 'done' | 'budget-exhausted' | 'token-budget-exhausted' | 'aborted' | 'error'
  totalIterations: number
  filesProduced: number
  tokensUsed: number
  error?: string
}

const DONE_MARKERS = [
  /\bgoal\s+complete\b/i,
  /\btask\s+complete\b/i,
  /\ball\s+done\b/i,
  /\bno\s+further\s+(?:action|steps?|work)\b/i,
]

export async function runPersistentAgent(cfg: LoopConfig): Promise<LoopResult> {
  const agent = getAgent(cfg.agentId)
  if (!agent) return { status: 'error', totalIterations: 0, filesProduced: 0, tokensUsed: 0, error: `Unknown agent ${cfg.agentId}` }

  let iteration = 0
  let filesProduced = 0
  let tokensUsed = cfg.tokensUsed ?? 0
  const transcript: string[] = []

  // ~4 chars per token (rough English estimate). Good enough for guardrails.
  const estimateTokens = (text: string) => Math.ceil(text.length / 4)

  while (iteration < cfg.maxIterations) {
    if (cfg.signal.aborted) {
      return { status: 'aborted', totalIterations: iteration, filesProduced, tokensUsed }
    }

    // Token budget gate: refuse another step if we're already at/over the cap.
    if (tokensUsed >= cfg.tokenBudget) {
      return { status: 'token-budget-exhausted', totalIterations: iteration, filesProduced, tokensUsed }
    }

    iteration++

    const budget_note = `Token budget: ${tokensUsed} / ${cfg.tokenBudget} used (est). If this step won't fit, either finish now or produce the smallest possible next step.`
    const autonomy_note = cfg.mode === 'unattended'
      ? `SDLC UNATTENDED: you have FULL authority. Never ask the user for input, confirmation, or decisions. Choose the best action yourself and proceed. You may write files, run commands, and take production-grade actions without waiting.`
      : cfg.neverAsk
        ? `You are in /never-ask mode: every action you propose is pre-approved. Do not ask for permission. Just do it.`
        : `You may ask the user before destructive steps (they will respond on the next loop).`

    const loopPrompt = [
      `GOAL: ${cfg.goal}`,
      '',
      transcript.length
        ? `Conversation so far:\n${transcript.join('\n---\n')}\n\nRemaining iteration budget: ${cfg.maxIterations - iteration} steps.`
        : `First step. Remaining iteration budget: ${cfg.maxIterations - iteration} steps.`,
      '',
      budget_note,
      '',
      autonomy_note,
    ].join('\n')

    const step: LoopStep = { iteration, phase: 'plan', text: `Iteration ${iteration}: planning…` }
    cfg.onStep({ ...step })

    const promptTokens = estimateTokens(loopPrompt)
    tokensUsed += promptTokens
    if (tokensUsed > cfg.tokenBudget) {
      return { status: 'token-budget-exhausted', totalIterations: iteration, filesProduced, tokensUsed }
    }

    let reply: string
    let completionTokens = 0
    try {
      const response = await callModel(cfg, agent, loopPrompt)
      reply = response.text
      // Prefer server-reported usage; fall back to the estimator.
      completionTokens = response.usage?.completion_tokens ?? estimateTokens(reply)
      tokensUsed += (response.usage?.prompt_tokens ?? 0) + completionTokens
    } catch (e: any) {
      return { status: 'error', totalIterations: iteration, filesProduced, tokensUsed, error: e?.message ?? String(e) }
    }

    transcript.push(`[iter ${iteration}] ${reply}`)
    const files = (reply.match(/```[\s\S]+?```/g) || []).length
    filesProduced += files

    cfg.onStep({
      iteration,
      phase: 'exec',
      text: reply,
      filesProduced: files,
      tokensUsed,
      tokensRemaining: Math.max(0, cfg.tokenBudget - tokensUsed),
    })

    if (tokensUsed >= cfg.tokenBudget) {
      return { status: 'token-budget-exhausted', totalIterations: iteration, filesProduced, tokensUsed }
    }

    if (DONE_MARKERS.some(m => m.test(reply))) {
      cfg.onStep({ iteration, phase: 'review', text: 'Goal declared complete by agent.', tokensUsed })
      return { status: 'done', totalIterations: iteration, filesProduced, tokensUsed }
    }
  }

  return { status: 'budget-exhausted', totalIterations: iteration, filesProduced, tokensUsed }
}

interface ModelReply {
  text: string
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

async function callModel(cfg: LoopConfig, agent: Agent, userPrompt: string): Promise<ModelReply> {
  const url = cfg.baseUrl.replace(/\/+$/, '')
  const endpoint = url.endsWith('/chat/completions') ? url : `${url}/chat/completions`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://godmod3.ai',
      'X-Title': 'G0DM0D3.AI',
    },
    body: JSON.stringify({
      model: cfg.model || agent.defaultModel,
      messages: [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
    signal: cfg.signal,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Loop call failed (${res.status}): ${body.slice(0, 400)}`)
  }

  const data = await res.json()
  return {
    text: data?.choices?.[0]?.message?.content ?? '',
    usage: data?.usage,
  }
}
