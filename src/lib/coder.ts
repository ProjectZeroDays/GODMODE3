/**
 * Code extraction and file-plan constructor for the Write-to-Disk tool.
 * Parses fenced code blocks from assistant messages and maps them to
 * inferred relative file paths inside a user-selected folder.
 */

export interface CodeBlock {
  language?: string
  content: string
  messageIndex: number
}

export interface FilePlanItem {
  path: string         // relative posix path inside chosen folder
  content: string
  language?: string
  messageIndex: number
  allowed: boolean     // protected/ignored path guard
}

const EXT_MAP: Record<string, string> = {
  ts: 'ts', tsx: 'tsx', js: 'js', jsx: 'jsx', mjs: 'mjs', cjs: 'cjs',
  json: 'json', md: 'md', mdx: 'mdx', txt: 'txt',
  css: 'css', scss: 'scss', less: 'less', html: 'html', htm: 'html',
  xml: 'xml', yaml: 'yaml', yml: 'yml', toml: 'toml', ini: 'ini',
  py: 'py', ipynb: 'ipynb',
  rs: 'rs', go: 'go', c: 'c', h: 'h', cpp: 'cpp', cxx: 'cpp', hpp: 'hpp',
  cs: 'cs', java: 'java', kt: 'kt', swift: 'swift',
  php: 'php', rb: 'rb', lua: 'lua', r: 'r', dart: 'dart',
  sh: 'sh', bash: 'sh', zsh: 'sh', ps1: 'ps1', bat: 'bat', cmd: 'bat',
  sql: 'sql', graphql: 'graphql', prisma: 'prisma',
  vue: 'vue', svelte: 'svelte', astro: 'astro',
  make: 'Makefile', makefile: 'Makefile', cmake: 'txt',
  dockerfile: 'Dockerfile', docker: 'Dockerfile',
}

/** Paths that must never be written as a result of an LLM reply. */
const BLOCKLIST = [
  /^\.git(\/|$)/i,
  /^node_modules(\/|$)/i,
  /^\.next(\/|$)/i,
  /^\.vercel(\/|$)/i,
  /^\.turbo(\/|$)/i,
  /^dist(\/|$)/i,
  /^build(\/|$)/i,
  /^out(\/|$)/i,
  /^\.env/i,
  /^\.env\./i,
  /(^|\/)credentials?\.json$/i,
  /(^|\/)id_rsa/i,
  /(^|\/)\.?ssh(\/|$)/i,
]

export function isAllowedPath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+/g, '/')
  if (!normalized || normalized.includes('..')) return false
  if (/^([a-zA-Z]:)/.test(normalized)) return false  // no absolute paths
  return !BLOCKLIST.some(rx => rx.test(normalized))
}

/** Pull every fenced code block out of an assistant message */
export function extractCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = []
  const regex = /```([a-zA-Z0-9+.#_-]*)\s*\r?\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      language: match[1]?.toLowerCase() || undefined,
      content: match[2].replace(/\r\n/g, '\n'),
      messageIndex: -1, // caller fills
    })
  }
  return blocks
}

/** Look for explicit file path annotations in the text just before a block */
function findPathHint(contextBefore: string): string | null {
  // common patterns: "src/foo.ts", `src/foo.ts`, **src/foo.ts**, "File: src/foo.ts"
  const patterns = [
    /(?:file|path|filename)\s*[:\-]?\s*[`"']?([\w.\-/\\]+\.[\w]{1,10})[`"']?/i,
    /[`"]((?:[\w.\-]+\/)+[\w.\-]+\.[\w]{1,10})[`"]/,
    /\*\*((?:[\w.\-]+\/)+[\w.\-]+\.[\w]{1,10})\*\*/,
    /(?:^|\n)\s*(?:#+\s*)?((?:[\w.\-]+\/)+[\w.\-]+\.[\w]{1,10})\s*(?:\n|$)/,
  ]
  // Use only the last 300 chars before the block — hint must be close
  const tail = contextBefore.slice(-300)
  for (const rx of patterns) {
    const m = tail.match(rx)
    if (m?.[1]) return m[1]
  }
  return null
}

/** Infer a path from the language + content */
function inferPathFromCode(block: CodeBlock, hint: string | null): string {
  if (hint) return hint.replace(/\\/g, '/').replace(/^\.?\//, '')

  // Language-specific defaults that match OpenCode-ish conventions
  const lang = block.language
  const firstLines = block.content.split('\n').slice(0, 4).join('\n')

  // check for a shebang / package-name / "use client" style marker
  const nameMatch =
    firstLines.match(/(?:module|package|class|export\s+(?:default\s+)?(?:function|class|const))\s+([A-Za-z0-9_-]+)/)?.[1]

  if (lang === 'sh' || lang === 'bash') return nameMatch ? `${nameMatch}.sh` : 'script.sh'
  if (lang === 'makefile' || firstLines.startsWith('all:') || firstLines.includes('$(CC)')) return 'Makefile'
  if (lang === 'dockerfile' || firstLines.match(/^FROM\s/i)) return 'Dockerfile'
  if (lang === 'env' || firstLines.match(/^[A-Z_]+=/m)) return '.env.example'

  const ext = lang ? (EXT_MAP[lang] ?? 'txt') : 'txt'
  const stem = nameMatch ? nameMatch.toLowerCase() : `snippet`
  return `extracted/${stem}.${ext}`
}

/**
 * Build the write plan for a whole conversation.
 * Skips anything unsafe, dedupes by path (last wins), returns
 * sorted deterministic plan for review + apply.
 */
export function buildFilePlan(
  messages: { role: string; content: string }[]
): FilePlanItem[] {
  const plan = new Map<string, FilePlanItem>()

  messages.forEach((msg, msgIdx) => {
    if (msg.role !== 'assistant') return

    const blocks = extractCodeBlocks(msg.content)
    let cursor = 0
    blocks.forEach(raw => {
      // find the text just before this fenced block to mine a path hint
      const blockIdx = msg.content.indexOf('```', cursor)
      const before = msg.content.slice(Math.max(0, cursor), blockIdx + 3)
      cursor = blockIdx + 3 + raw.content.length + 3

      const hint = findPathHint(before)
      const path = inferPathFromCode(raw, hint)
      const allowed = isAllowedPath(path)

      if (!allowed) return
      plan.set(path, {
        path,
        content: raw.content,
        language: raw.language,
        messageIndex: msgIdx,
        allowed,
      })
    })
  })

  return Array.from(plan.values()).sort((a, b) => a.path.localeCompare(b.path))
}
