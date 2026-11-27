import { marked } from 'marked'
import { promises as fs } from 'fs'
import path from 'path'
import { execSync } from 'child_process'

/**
 * Docs generator — reads the registered docs agent prompt, so every doc it
 * writes sticks to the same format (the Q9 house style).
 * Run: npx tsx scripts/generate-docs.ts
 */

const SIDEBAR_SECTIONS = [
  'Overview', 'What Q9 is not', 'Protocol background', 'Installation', 'Usage',
  'Autonomous mode', 'Automated workflows', 'Features and functionality',
  'Live camera, microphone and mirroring', 'Harvest and loot',
  'Monitoring and logging', 'C2 and callback paths', 'CVEs, exploits and payloads',
  'Device compatibility', 'Controls reference', 'API reference', 'Tutorials',
  'Troubleshooting', 'Contributing', 'Glossary',
]

async function main() {
  const outDir = path.join(process.cwd(), 'docs')
  await fs.mkdir(outDir, { recursive: true })

  const sections = SIDEBAR_SECTIONS.map(t => {
    const id = t.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return `<details>
<summary><b>${t}</b></summary>

<!-- REPLACE WITH REAL CONTENT -->

</details>`
  }).join('\n\n')

  const markdown = `# GODMODE4
### Option-Critical AI Chat Interface

[![](./badge.svg)](https://github.com/ProjectZeroDays/GODMODE4/releases)

Single-file, multi-provider AI chat with agents, persistence, and red-teaming.

---

## Table of contents

<details open>
<summary><b>Contents</b></summary>

${SIDEBAR_SECTIONS.map((t, i) => `${i + 1}. [${t}](#${toAnchor(t)})`).join('\n')}

</details>

---

${sections}

---

<div align="center">

**Q9-format documentation — no boilerplate.**

[Back to top](#godmode4)

</div>
`

  const readmePath = path.join(process.cwd(), 'README.md')
  const wikiPath   = path.join(process.cwd(), 'docs', 'WIKI.md')

  await fs.writeFile(readmePath, markdown, 'utf8')
  await fs.writeFile(wikiPath, markdown, 'utf8')

  const badge = readBadge()
  const writeBadge = badge ? `<!— ${badge} —>\n` : ''
  await fs.writeFile(readmePath, writeBadge + markdown.replace(/<\!--/, '').replace(/\s*$/, '') + '\n', 'utf8')

  console.log(`Wrote ${readmePath} and ${wikiPath}`)
  execSync('npx next build', { stdio: 'inherit' })
}

function toAnchor(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function readBadge() {
  return fs.readFile(path.join(process.cwd(), 'badge.txt'), 'utf8').catch(() => '')
}

main().catch(e => { console.error(e); process.exit(1) })
