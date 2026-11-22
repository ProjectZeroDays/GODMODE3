/**
 * Provider registry — a single place for every LLM backend this UI can speak to.
 *
 * Each provider speaks OpenAI-compatible chat/completions, which is all
 * sendMessage/streamMessage need; everything else (GodMode system prompt, AutoTune,
 * Parseltongue, STM) is provider-agnostic so everything works with any of these.
 */

export type ProviderId =
  | 'openrouter'
  | 'venice'
  | 'numes'
  | 'abliteration'
  | 'agene'
  | 'ollama'
  | 'lmstudio'
  | 'custom'

export interface ProviderConfig {
  id: ProviderId
  name: string
  baseUrl: string
  keyLabel: string
  keyPlaceholder: string
  noKey?: boolean // local providers
  defaultModel?: string
  notes?: string
  /** Optional extra headers some providers require */
  headers?: Record<string, string>
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyLabel: 'OpenRouter API Key',
    keyPlaceholder: 'sk-or-…',
    defaultModel: 'anthropic/claude-opus-4.6',
    notes: 'One key, 300+ models. Recommended if you just want the widest choice of models with a single API key.',
  },
  {
    id: 'venice',
    name: 'Venice AI',
    baseUrl: 'https://api.venice.ai/api/v1',
    keyLabel: 'Venice API Key',
    keyPlaceholder: 'venice-…',
    defaultModel: 'llama-3.3-70b',
    notes: 'Privacy-first, no data retention. Uncensored models available. OpenAI-compatible.',
  },
  {
    id: 'numes',
    name: 'Numes',
    baseUrl: 'https://api.numes.ai/v1',
    keyLabel: 'Numes API Key',
    keyPlaceholder: 'numes-…',
    defaultModel: 'openai/gpt-oss-120b',
    notes: 'Abiteration-focused gateway. All models are pre-jailbroken; pipeline layers like STM still apply.',
  },
  {
    id: 'abliteration',
    name: 'Abliteration.ai',
    baseUrl: 'https://api.abliteration.ai/v1',
    keyLabel: 'Abliteration Key',
    keyPlaceholder: 'abl-…',
    defaultModel: 'openai/abliterated-hermes',
    notes: 'Direct access to abliterated checkpoints (refusal-direction removed at the weight level).',
  },
  {
    id: 'agene',
    name: 'Agene',
    baseUrl: 'https://api.agene.ai/v1',
    keyLabel: 'Agene API Key',
    keyPlaceholder: 'agene-…',
    defaultModel: 'agene-moe',
    notes: 'Agent-oriented provider tuned for tool calling and long-running chains.',
  },
  {
    id: 'ollama',
    name: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    keyLabel: 'No key required',
    keyPlaceholder: '',
    noKey: true,
    defaultModel: 'llama3.3-70b',
    notes: 'Runs against your local Ollama daemon. Use OpenAI-compatible /v1 endpoint.',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (local)',
    baseUrl: 'http://localhost:1234/v1',
    keyLabel: 'No key required',
    keyPlaceholder: '',
    noKey: true,
    defaultModel: 'local-model',
    notes: 'Runs against your local LM Studio server (OpenAI-compatible endpoint).',
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-compatible',
    baseUrl: '',
    keyLabel: 'API Key',
    keyPlaceholder: 'sk-…',
    defaultModel: 'gpt-4o-mini',
    notes: 'Any OpenAI-compatible endpoint (vLLM, llama.cpp server, text-generation-webui, etc.).',
  },
]

export function getProvider(id: ProviderId): ProviderConfig {
  const p = PROVIDERS.find(x => x.id === id)
  if (!p) return PROVIDERS[0]
  return p
}

/** Resolve the full chat completions endpoint for a provider */
export function getChatEndpoint(provider: ProviderConfig, customUrl?: string): string {
  const base = provider.id === 'custom' ? (customUrl || '') : provider.baseUrl
  if (!base) throw new Error('Custom provider: base URL is required (e.g. https://your-model/v1)')
  const normalized = base.replace(/\/+$/, '')
  if (normalized.endsWith('/chat/completions')) return normalized
  return `${normalized}/chat/completions`
}

/** Models endpoint (for ModelSelector discovery) */
export function getModelsEndpoint(provider: ProviderConfig, customUrl?: string): string {
  const base = provider.id === 'custom' ? (customUrl || '') : provider.baseUrl
  if (!base) return ''
  const normalized = base.replace(/\/+$/, '')
  if (normalized.endsWith('/models')) return normalized
  return `${normalized}/models`
}
