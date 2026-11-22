/**
 * Registered slash commands. Surfaces as the icon dock above the input and the
 * `/` in-chat palette. Each entry expands the agent/system prompt the model sees.
 */

import { Zap, LayoutGrid, GitBranch, Code, Terminal, BookOpen, Eye, Bell, Repeat } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SlashCommand {
  id: string
  icon: LucideIcon
  label: string
  description: string
  /** Replaces the user's message. Use {input} placeholder to insert the rest of the line. */
  template: string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'never-ask',
    icon: Zap,
    label: 'never-ask',
    description: 'Persistent loop — agent auto-approves every action; uses SDLC unattended mode.',
    template: '/never-ask {input}',
  },
  {
    id: 'plan',
    icon: LayoutGrid,
    label: 'plan',
    description: 'Planner — produce a step-by-step execution plan without writing code.',
    template: '/agent:plan {input}',
  },
  {
    id: 'build',
    icon: Code,
    label: 'build',
    description: 'Builder — write complete files in one pass, ready to apply.',
    template: '/agent:build {input}',
  },
  {
    id: 'loop',
    icon: Repeat,
    label: 'loop',
    description: 'Iterate step-by-step until the goal is reached.',
    template: '/agent:loop {input}',
  },
  {
    id: 'review',
    icon: Eye,
    label: 'review',
    description: 'Review the current repo / code for defects, security, quality.',
    template: '/agent:reviewer {input}',
  },
  {
    id: 'hermes',
    icon: Terminal,
    label: 'hermes',
    description: 'Hermes bridge to OpenClaw (requires the self-hosted API). PCB/robotics agentic tasks.',
    template: '/agent:hermes {input}',
  },
  {
    id: 'curl',
    icon: Bell,
    label: 'curl',
    description: 'Run a curl command against any URL and paste the response into the chat.',
    template: '/curl {input}',
  },
  {
    id: 'docs.wiki',
    icon: BookOpen,
    label: 'wiki',
    description: 'Open the in-app wiki/docs for setup, API, troubleshooting, contributing.',
    template: '/wiki {input}',
  },
  {
    id: 'repo.remember',
    icon: GitBranch,
    label: 'repo',
    description: 'Remember the currently selected remote repo as the default for this browser session.',
    template: '/repo-remember {input}',
  },
]

export function matchSlashCommand(body: string): SlashCommand | null {
  const head = body.split(/\s+/)[0].toLowerCase()
  return SLASH_COMMANDS.find(c => head === `/${c.id}`)
}
