# GODMODE4

Unified AI cane + autonomous agents for offshore leet release cycles with red-teaming capabilities and persistence.

## Overview

GODMODE4 is a standalone chat network node which routes through nine providers and exposes a static `out/` site. It provides GODMODE-style arrays harmonizing with AutoTune, Parseltongue, STM, and persistence hooks. Use this for local or Pages hosting.

## Providers

| Provider | Endpoint |
|----------|----------|
| OpenRouter | `https://openrouter.ai/api/v1` |
| OpenCode | `https://openproxy.opencode.ai/v1` |
| Venice | `https://api.venice.ai/api/v1` |
| Numes | `https://api.numes.ai/v1` |
| Abliteration | `https://api.abliteration.ai/v1` |
| Agene | `https://api.agene.ai/v1` |
| Ollama | `http://localhost:11434/v1` |
| LM Studio | `http://localhost:1234/v1` |

## Agents

Available in the header: `plan`, `build`, `loop`, `persistent`, `design`, `sldc`, `debug`, `test`, `refactor`, `docs`, `hermes`, `reviewer`.

- **/never-ask** — runs through the full SDLC without prompting
- **/apply** — extracts code blocks and writes them to a folder

## API reference

| Endpoint | Purpose |
|----------|---------|
| `/v1/chat/completions` | Single-chat completion |
| `/v1/models` | Provider list |
| `/v1/tier` | Tier + limits |
| `/v1/health` | Health check |
| `/v1/info` | Server status |

## Getting started

```bash
git clone https://github.com/ProjectZeroDays/GODMODE4.git
cd GODMODE4
npm install
npx next build
npx serve out
```

## Troubleshooting

- **Push rejected** — a leftover ignore cleans the history (node_modules, .next, out). Run `rm -rf node_modules .next out` and recommit.
- **Code blocks won't write** — they must include the file path comment, like `// file: src/foo.ts`. The blocklist ignores `.git/`, `.env`, etc.
- **Persistent loop never stops** — token budget is enforced; abort via the pause button.

## Missing documentation

None. Every file in this project uses the same repository and governormand structure.

## License
AGPL-3.0. This is a self-hosted option that prioritizes the user's provider key.
