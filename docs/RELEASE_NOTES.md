# GODMODE4 v4.0.0

## Highlights
- OpenCode theme is the default (dark + neon-green accent); Graphite, Matrix, Hacker, Glyph, Minimal are selectable
- Agent registry: Plan / Build / Loop / Persistent / Debug / Test / Refactor / Docs / Design / SDLC / Hermes (OpenClaw bridge)
- Provider registry: OpenRouter, Venice, Numes, Abliteration, Agene, Ollama, LM Studio, custom OpenAI-compatible
- Secure local storage: API keys and PATs are AES-GCM encrypted in the browser via WebCrypto + IndexedDB
- Write-to-Disk panel extracts code blocks from chat and batch-writes them to a local folder
- /never-ask persistent loop with token budget, iteration cap, and SDLC unattended mode
- Static build for GitHub Pages deploys via the included workflow

## Install

    git clone https://github.com/ProjectZeroDays/GODMODE3.git godmode4
    cd godmode4
    npm install
    npx next build

## Self-hosted API

    cp .env.example .env   # set OPENROUTER_API_KEY + GODMODE_API_KEY
    docker compose up --build -d
    # API on :7860, web UI on :3000

## Assets
- `g0dm0d4-v4.0.0-web.zip` — static export of the web UI (unpack anywhere static hosting is allowed)
