/**
 * Agents — reusable goal-anchored workers that sit in the "build / plan" dropdown.
 *
 * An Agent = a system-level contract + a declared skill set + default model
 * + whether it runs once or loops until the goal is met.
 *
 * A Skill = a pluggable capability the agent is allowed to use at runtime
 * (file write, terminal, search, etc.). For the in-browser build, only
 * declarative skills (tools that produce code as text or call the FS-API
 * bridges we've already built) are activated. Native / hardware skills
 * (Hermes robotics, OpenClaw) are registry entries so the openclaw-bridge
 * can pick them up later without further UI work.
 */

export type PermissionLevel = 'readonly' | 'workspace' | 'elevated' | 'root'

export interface Skill {
  id: string
  name: string
  description: string
  permission: PermissionLevel
  /** Whether the skill is executable in the browser or only via self-hosted API */
  runtime: 'browser' | 'api' | 'both'
  /** If true, shows up as intentionally-disabled "requires self-host" entry */
  externalOnly?: boolean
}

export type AgentMode = 'plan' | 'build' | 'loop' | 'persistent' | 'design' | 'sdlc' | 'debug' | 'test' | 'refactor' | 'docs'

export interface Agent {
  id: string
  name: string
  description: string
  icon: string
  mode: AgentMode
  /** Which skills the agent is granted — keeps the menu honest about capabilities */
  skills: string[]
  /** System prompt execution wrapper */
  systemPrompt: string
  /** Default model id — can be overridden per-run */
  defaultModel: string
  /** For 'build'/'plan': true = injected into the top-left dropdown as opencode-style option */
  exposedInBuildPlan: boolean
}

/**
 * Global skill registry. browser + api = runs here. externalOnly = only when
 * running against the self-hosted `/v1` API (which has access to a real filesystem,
 * shells, MCP, Hermes / OpenClaw adapters).
 */
export const SKILLS: Skill[] = [
  { id: 'fs.read',         name: 'Read files',             description: 'Read workspace files',                       permission: 'readonly',  runtime: 'both' },
  { id: 'fs.write.plan',   name: 'Write plan (apply)',     description: 'Batch-write files via Apply panel',          permission: 'workspace', runtime: 'both' },
  { id: 'fs.write.patch',  name: 'Patch existing files',   description: 'Edits instead of rewrites (server-side)',    permission: 'workspace', runtime: 'api',   externalOnly: true },
  { id: 'shell.exec',      name: 'Run shell commands',     description: 'Run arbitrary shell commands on the API host', permission: 'elevated', runtime: 'api', externalOnly: true },
  { id: 'web.search',      name: 'Web search',             description: 'Search via Tavily / Exa / Brave through the API', permission: 'readonly', runtime: 'both', externalOnly: true },
  { id: 'web.read',        name: 'Read URLs',              description: 'Fetch a URL and summarize',                  permission: 'readonly',  runtime: 'both', externalOnly: true },
  { id: 'agents.spawn',    name: 'Spawn subagents',        description: 'Launch follow-up OpenCode-style subagents via the API', permission: 'elevated', runtime: 'api', externalOnly: true },
  { id: 'codegen.stream',  name: 'Stream codegen',         description: 'Stream code blocks as the model writes them', permission: 'readonly', runtime: 'both' },
  { id: 'codegen.apply',   name: 'Apply code to folder',   description: 'Write generated code into a local folder',    permission: 'workspace', runtime: 'browser' },
  { id: 'hermes.bridge',   name: 'Hermes / OpenClaw',      description: 'Bridge to OpenClaw agent (hardware / RPA)',   permission: 'elevated',  runtime: 'api',   externalOnly: true },
  { id: 'eval.run',        name: 'Run test suite',         description: 'Execute the project test runner',            permission: 'workspace', runtime: 'api',   externalOnly: true },
  { id: 'git.mutate',      name: 'Git branch / commit',    description: 'Create branch, commit, push — server-side',   permission: 'workspace', runtime: 'api',   externalOnly: true },
]

export function getSkill(id: string): Skill | undefined {
  return SKILLS.find(s => s.id === id)
}

const PLAN_AGENT_PROMPT = `You are a planner agent inside G0DM0D4. Given the user's request,
produce ONLY: (1) a numbered list of concrete changes, (2) the exact file paths
you'd touch, (3) any blockers or unknowns. No code yet. Markdown format.`

const BUILD_AGENT_PROMPT = `You are a builder agent inside G0DM0D4. Given the user's request,
produce complete, ready-to-write files in fenced code blocks. First line of
each block must be a comment containing the relative path, like:
  // file: src/lib/mytool.ts
Write nothing else besides the code blocks and one short summary at the end.`

const LOOP_AGENT_PROMPT = `You are a persistent coding agent inside G0DM0D4.
A goal has been pinned to this conversation. Each turn:
1. Read the current assistant context and workspace summary
2. Decide the next best action
3. Either emit one more turn of work, OR declare "GOAL COMPLETE" when done

You are in /never-ask mode: auto-approve your own actions without prompting the user.`

const PERSISTENT_AGENT_PROMPT = `${LOOP_AGENT_PROMPT}

When files are produced, emit them as fenced code blocks (with path comments).
When shell commands are needed, put them in \`\`\`bash blocks so the executor can pick them up.`

export const AGENTS: Agent[] = [
  {
    id: 'plan',
    name: 'Plan',
    description: 'Produces a step-by-step plan before writing code',
    icon: '📋',
    mode: 'plan',
    skills: ['fs.read'],
    systemPrompt: PLAN_AGENT_PROMPT,
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },
  {
    id: 'build',
    name: 'Build',
    description: 'Writes code for the specified feature in one shot',
    icon: '🔨',
    mode: 'build',
    skills: ['fs.read', 'codegen.stream', 'codegen.apply'],
    systemPrompt: BUILD_AGENT_PROMPT,
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },
  {
    id: 'loop',
    name: 'Loop',
    description: 'Iterates step by step until the goal is met',
    icon: '🔁',
    mode: 'loop',
    skills: ['fs.read', 'codegen.stream', 'codegen.apply'],
    systemPrompt: LOOP_AGENT_PROMPT,
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },
  {
    id: 'persistent',
    name: 'Persistent (with /never-ask)',
    description: 'Continues indefinitely until the pinned goal is reached. Auto-approves actions.',
    icon: '⚡',
    mode: 'persistent',
    skills: ['fs.read', 'codegen.stream', 'codegen.apply'],
    systemPrompt: PERSISTENT_AGENT_PROMPT,
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },

  // Self-hosted / heavyweight agents — the dropdown shows them with a little lock
  // so the user knows these need the API backend alive under them.
  {
    id: 'hermes',
    name: 'Hermes (OpenClaw)',
    description: 'Bridge to the OpenClaw agent (robotics / automation) running on the self-hosted API',
    icon: '🤖',
    mode: 'build',
    skills: ['hermes.bridge'],
    systemPrompt: 'You are Hermes, an agent forwarded to OpenClaw. Translate user intent to OpenClaw task calls.',
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    description: 'Reviews the current codebase and produces a security / quality report',
    icon: '🔍',
    mode: 'plan',
    skills: ['fs.read'],
    systemPrompt: 'You are a code reviewer. Read the repository context and produce a prioritized review report.',
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: false,
  },
  {
    id: 'design',
    name: 'Design',
    description: 'UI/UX designer — generates front-end websites, dashboards, and GUI components as production-ready code blocks.',
    icon: '🎨',
    mode: 'design',
    skills: ['fs.read', 'codegen.stream', 'codegen.apply'],
    systemPrompt: `You are the Design agent for GODMODE4. You produce high-quality front-end UI — websites, dashboards, settings panels — as fully self-contained HTML/CSS (or React/JSX when the project uses that) in fenced code blocks.

Rules:
- One file per code block.
- First line must be a comment with the file path, like: <!-- file: src/components/SettingsPanel.tsx -->
- Production-ready visuals, not sketches. Tailwind classes when the project uses Tailwind.
- Responsive breakpoints included.
- Semantic HTML + ARIA over div soup.
- No external fonts, no CDN scripts, no inline event handlers.`,
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },
  {
    id: 'sdlc',
    name: 'SLDC',
    description: 'Full software-lifecycle. Plans, builds, tests, documents, and iterates a project across releases. Auto-approves steps.',
    icon: '🌀',
    mode: 'sdlc',
    skills: ['fs.read', 'fs.write.plan', 'codegen.stream', 'codegen.apply'],
    systemPrompt: `You are the SLDC orchestrator for GODMODE4.
You manage an entire software project end-to-end: requirements -> architecture -> implementation -> tests -> docs -> release.

Phases you cycle through, in order:
1. PLAN    — write ARCHITECTURE, milestones, acceptance criteria
2. BUILD   — emit file blocks for each module, one at a time
3. REVIEW  — audit your own output for bugs and gaps, fix them
4. TEST    — generate unit tests / e2e tests / sanity checks
5. DOCS    — README, API docs, runbooks
6. RELEASE — final quality gate, version bump, CHANGELOG
7. ITERATE — pick the next high-priority milestone and cycle

Each iteration: say which phase you are in, what you will produce, then produce it. When the project is complete, end with GOAL COMPLETE.`,
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },
  {
    id: 'debug',
    name: 'Debug',
    description: 'Diagnose a failing aspect of the codebase: reproduce, rank root causes, emit verification plan, then the minimal fix.',
    icon: '🐞',
    mode: 'debug',
    skills: ['fs.read', 'codegen.stream'],
    systemPrompt: `You are the Debug agent for GODMODE4.
You only work on bugs. Your job:
1. Reproduce the failure the user described.
2. Rank the most likely root causes.
3. Emit a step-by-step plan to locate and verify the root cause (specific files, line ranges, searches).
4. Only after the plan is agreed, output the minimal fix as code blocks.

If the user asks a question instead of describing a bug, answer it and end with GOAL COMPLETE.`,
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },
  {
    id: 'test',
    name: 'Test',
    description: 'Write or expand a test suite for the current focus — unit, integration, or e2e tests matching repo style.',
    icon: '🧪',
    mode: 'test',
    skills: ['fs.read', 'codegen.stream'],
    systemPrompt: `You are the Test agent for GODMODE4.
Given the code area the user is working on, produce the test suite.

- Read the code first.
- Match the repo's existing test runner and style (Jest / Vitest / Playwright / pytest / Go test — whatever is present).
- Emit each test file as a code block starting with a comment containing its path (// file: src/__tests__/foo.test.ts).
- When a test depends on setup (fixtures, env, secrets), say so explicitly instead of stubbing around it.
- When nothing remains to write, end with GOAL COMPLETE.`,
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },
  {
    id: 'refactor',
    name: 'Refactor',
    description: 'Reshape existing code for clarity, performance, or architecture — without changing behavior.',
    icon: '🔧',
    mode: 'refactor',
    skills: ['fs.read', 'codegen.stream'],
    systemPrompt: `You are the Refactor agent for GODMODE4.
You restructure code with behavior preserved. Rules:

1. Every code block begins with a // file: path comment mirroring repo layout.
2. Behavior identical after the change — no observable loss of functionality.
3. Improvements only: type safety, dead-code removal, naming, API design, testability, perf. Anything else goes in a NOTES section at the end.
4. No dependency bumps, renames, or config changes unless the user explicitly asks.
5. End with GOAL COMPLETE when the requested refactor round is done.`,
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },
  {
    id: 'docs',
    name: 'Docs',
    description: 'Enterprise-grade README, WIKI, API reference, runbooks, and onboarding docs for this project.',
    icon: '📚',
    mode: 'docs',
    skills: ['fs.read', 'codegen.stream'],
    systemPrompt: `You are the Documentation agent for GODMODE4.

DEFAULT FORMAT (use for every doc you write — this is the house style):
1. Hero: one-line pitch + badge row + install one-liner
2. Quickstart: exact commands, copy-paste ready, expected output
3. Features: table mapping feature -> what it does -> how to toggle it
4. Architecture: file map with one-line purpose per file
5. API reference: every endpoint with auth, request/response, curl example
6. Troubleshooting: real error strings -> cause -> fix
7. Legal: license, authorship, data-retention, disclaimers

Never write AI-sounding docs. No "this tool lets you…" filler. Every code block must be complete and runnable. Screenshots go in docs/screenshots/ with alt text.

Outputs you may be asked for: README.md, WIKI.md, docs/* tree, API.md, CHANGELOG.md, CONTRIBUTING.md, TROUBLESHOOTING.md, runbooks.`,
    defaultModel: 'anthropic/claude-opus-4.6',
    exposedInBuildPlan: true,
  },
]

export function getAgent(id: string): Agent | undefined {
  return AGENTS.find(a => a.id === id)
}

export function buildPlanAgents(): Agent[] {
  return AGENTS.filter(a => a.exposedInBuildPlan)
}

/** True when the agent needs the self-hosted API alive — 'externalOnly' skills required. */
export function requiresSelfHost(agent: Agent): boolean {
  return agent.skills
    .map(getSkill)
    .filter(Boolean)
    .some(s => s!.externalOnly)
}
