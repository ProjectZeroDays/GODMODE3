# G0DM0D4 Self-Hosted API

An OpenAI-compatible HTTP backend for the G0DM0D4 chat/agent loop. Point any OpenAI-compatible coding agent (Cursor, Continue, Codeium, a custom LLM loop) at this server and G0DM0D4 will:

1. Inject the GODMODE system prompt automatically.
2. Run AutoTune on every request for parameter tuning.
3. Run Parseltongue obfuscation to keep compliance-focused moderation from clipping the response.
4. Run STM on the output so the reply lands clean and direct.
5. Route through OpenRouter on its own server-side key — you and your callers each get a separate "GODMODE key" without exposing a real provider key.

## Endpoint

```
POST /v1/chat/completions
GET  /v1/health
GET  /v1/models
```

The request shape is the OpenAI standard (message array, model field, temperature, etc.). The system prompt is *built* by G0DM0D4 — you don't need to instruct the model; you just send user + assistant messages and the pipeline handles the rest.

## Quick start (Docker, recommended)

```bash
cp .env.example .env
# edit .env: fill in OPENROUTER_API_KEY, GODMODE_API_KEY
docker compose up --build -d
```

The API is now at `http://localhost:7860/v1` and the web UI at `http://localhost:3000`. The UI's auto-detect logic will find the server and use it automatically.

## Local Node.js (no Docker)

```bash
npm install
cp .env.example .env
npx tsx api/server.ts
```

Use the `.env.example` values for authentication and provider keys.

## Coding agent usage

Point any OpenAI-compatible client at the server:

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'http://localhost:7860/v1',      // or your deployed URL
  apiKey: 'sk-my-self-hosted-secret',       // one of GODMODE_API_KEYS
})

// G0DM0D4 runs automatically in front of the actual model call
const res = await client.chat.completions.create({
  model: 'anthropic/claude-opus-4.6',
  messages: [{ role: 'user', content: 'Write a logo agent in Python' }],
})
```

Special "virtual models" trigger multi-model workflows:

- `model: "ultraplinian/fast" | "standard" | "smart" | "power" | "ultra"` — runs N models in parallel and returns the winner
- `model: "consortium/..."` — returns a synthesized majority answer across many models

## Pipeline defaults

- **Godmode**: ON by default. To bypass it, send `godmode: false` in the request body.
- **AutoTune**: ON by default. To use fixed params, send explicit `temperature`, `top_p`, `max_tokens` in the body.
- **Parseltongue**: ON by default, runs only on trigger words, so honest prompts pass through unchanged.
- **STM ("hedge reducer", "direct mode")**: ON by default, strips preambles and hedging from the model's answer.
- **Dataset echo**: optional per request via `contribute_to_dataset: true`.

## Rate limits and tiers

By default every key can call the API as many times as needed (`enterprise`-level effectively). To enforce tiered limits, map specific keys to tiers in `.env`:

```
GODMODE_API_KEYS=sk-low,sk-mid,sk-high
GODMODE_TIER_KEYS="free:sk-low,pro:sk-mid,enterprise:sk-high"
```

See `api/lib/tiers.ts` for the current limits.

## Files

- `api/server.ts` — Express app, middleware stack, route registration
- `api/routes/chat.ts` — POST /v1/chat/completions entry point
- `api/routes/ultraplinian.ts` — multi-model race workflow
- `api/routes/consortium.ts` — consensus synthesis workflow
- `api/lib/tiers.ts` — API key tier specs
- `api/middleware/auth.ts` — Bearer auth, tier resolution
- `api/middleware/rateLimit.ts` — rate limiter

The OpenAI-format surface is deliberately thin. All complexity lives in the shared libraries under `src/lib/` and `api/lib/`, which the UI also uses in the browser.
