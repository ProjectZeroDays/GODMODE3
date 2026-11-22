/**
 * Curated free-model registry.
 *
 * Each entry is what the provider itself exposes for free (no card / no
 * billing) — either the provider's dedicated free tier, trial credits, or
 * "free best" auto-router. The UI shows a "FREE" badge next to these rows.
 */

export interface FreeModel {
  id: string
  label: string
  provider: 'openrouter' | 'opencode'
  /** Rough rate-limit blurb shown in the picker */
  quota: string
}

export const FREE_MODELS: FreeModel[] = [
  // OpenRouter's built-in free routing alias + the biggest free models on the platform
  { id: 'openrouter/free',                label: 'Free best (router)', provider: 'openrouter', quota: 'pooled' },
  { id: 'zephyr/zephyr-7b-beta',          label: 'Zephyr 7B',          provider: 'openrouter', quota: '1500/day' },
  { id: 'mistralai/mistral-7b-instruct',  label: 'Mistral 7B',         provider: 'openrouter', quota: '1500/day' },
  { id: 'gryphe/mythomist-7b',            label: 'MythoMist 7B',       provider: 'openrouter', quota: '1500/day' },
  { id: 'undi95/toppy-m-7b',              label: 'Toppy M 7B',         provider: 'openrouter', quota: '1500/day' },

  // OpenCode's free tier (proxied through their OpenAI-compatible endpoint)
  { id: 'opencode/auto',                  label: 'Auto (free)',        provider: 'opencode',   quota: 'POC / free' },
  { id: 'opencode/grok-code',             label: 'Grok Code Fast',     provider: 'opencode',   quota: 'free pool' },
  { id: 'opencode/mimo-v2-flash',         label: 'MiMo V2 Flash',      provider: 'opencode',   quota: 'free pool' },
  { id: 'opencode/step-3.5-flash',        label: 'Step 3.5 Flash',     provider: 'opencode',   quota: 'free pool' },
]

export function isFreeModel(providerId: string | undefined, modelId: string): boolean {
  if (!providerId) return false
  return FREE_MODELS.some(m => m.provider === providerId && m.id === modelId)
}
