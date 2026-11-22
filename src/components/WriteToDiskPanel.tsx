'use client'

import { useMemo, useState, useCallback } from 'react'
import { useStore } from '@/store'
import { buildFilePlan, FilePlanItem } from '@/lib/coder'
import { X, FolderOpen, FilePlus, CheckCircle, AlertTriangle, FileCode } from 'lucide-react'

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<any>
  }
}

interface Props {
  open: boolean
  onClose: () => void
}

export function WriteToDiskPanel({ open, onClose }: Props) {
  const { currentConversation } = useStore()
  const [dirHandle, setDirHandle] = useState<any | null>(null)
  const [dirName, setDirName] = useState<string>('')
  const [status, setStatus] = useState<{ kind: 'ok' | 'err' | 'info'; msg: string } | null>(null)
  const [previewIdx, setPreviewIdx] = useState(0)

  const plan = useMemo<FilePlanItem[]>(
    () => currentConversation ? buildFilePlan(currentConversation.messages) : [],
    [currentConversation?.id, currentConversation?.updatedAt]
  )

  const supported = typeof window !== 'undefined' && Boolean(window.showDirectoryPicker)

  const pickDir = useCallback(async () => {
    if (!window.showDirectoryPicker) return
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      setDirHandle(handle)
      setDirName(handle.name as string)
      setStatus({ kind: 'ok', msg: `Target: ${handle.name}` })
    } catch {
      setStatus({ kind: 'info', msg: 'Folder selection cancelled.' })
    }
  }, [])

  const writeFile = useCallback(async (handle: any, relPath: string, content: string) => {
    const parts = relPath.split('/').filter(Boolean)
    const fileName = parts.pop()
    if (!fileName) throw new Error('Bad path')
    let dir = handle
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true })
    }
    const file = await dir.getFileHandle(fileName, { create: true })
    const writable = await file.createWritable()
    await writable.write(content)
    await writable.close()
  }, [])

  const applyAll = useCallback(async () => {
    if (!dirHandle || plan.length === 0) return
    setStatus({ kind: 'info', msg: `Writing ${plan.length} file(s)…` })
    let ok = 0
    let err = 0
    for (const item of plan) {
      try {
        await writeFile(dirHandle, item.path, item.content)
        ok++
      } catch (e) {
        err++
        console.error('write failed', item.path, e)
      }
    }
    setStatus({
      kind: err > 0 ? 'err' : 'ok',
      msg: err === 0
        ? `Wrote ${ok} file${ok === 1 ? '' : 's'} to ${dirName}.`
        : `Wrote ${ok}, failed ${err}. Check console.`,
    })
  }, [dirHandle, plan, dirName, writeFile])

  if (!open) return null

  const preview = plan[previewIdx]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-5xl max-h-[86vh] overflow-hidden rounded-lg border border-theme-border bg-theme-bg flex flex-col">
        <div className="flex items-center justify-between border-b border-theme-border px-4 py-3">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-theme-muted-foreground" />
            <h2 className="text-sm font-semibold text-theme-foreground">Apply to local folder</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-theme-accent/40 text-theme-muted-foreground hover:text-theme-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          {!supported && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Browser doesn't expose the File System Access API. Use Chrome or Edge to write code directly to a local folder. (Safari/Firefox not supported.)</span>
            </div>
          )}

          {!currentConversation ? (
            <p className="text-theme-muted-foreground text-xs">Open a conversation containing code blocks first.</p>
          ) : plan.length === 0 ? (
            <p className="text-theme-muted-foreground text-xs">
              No fenced code blocks with inferable paths were found in this conversation. Ask the assistant for files like <code className="font-mono text-[10px] bg-theme-dim px-1 py-0.5 rounded">src/foo.ts</code> or <code className="font-mono text-[10px] bg-theme-dim px-1 py-0.5 rounded">README.md</code> first.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
              <div className="space-y-2">
                <div className="rounded-md border border-theme-border bg-theme-elevation p-3 space-y-2">
                  <p className="text-xs text-theme-muted-foreground">Detected <span className="text-theme-foreground font-semibold">{plan.length}</span> file{plan.length === 1 ? '' : 's'} in this conversation.</p>
                  <button
                    onClick={pickDir}
                    disabled={!supported}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-theme-border bg-theme-bg px-2.5 py-1.5 text-xs text-theme-foreground hover:bg-theme-hover disabled:opacity-50"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    {dirName || 'Pick target folder'}
                  </button>
                  <button
                    onClick={applyAll}
                    disabled={!dirHandle || plan.length === 0}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-lime-400 px-2.5 py-1.5 text-xs font-semibold text-black hover:bg-lime-300 disabled:opacity-40"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                    Apply {plan.length} file{plan.length === 1 ? '' : 's'} to disk
                  </button>
                  {status && (
                    <p className={`text-[11px] leading-relaxed ${status.kind === 'err' ? 'text-red-400' : status.kind === 'ok' ? 'text-lime-400' : 'text-theme-muted-foreground'}`}>
                      {status.msg}
                    </p>
                  )}
                </div>

                <div className="rounded-md border border-theme-border overflow-hidden">
                  <div className="bg-theme-elevation px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-theme-muted-foreground border-b border-theme-border">Files</div>
                  <div className="max-h-56 overflow-y-auto">
                    {plan.map((item, i) => (
                      <button
                        key={item.path}
                        onClick={() => setPreviewIdx(i)}
                        className={`block w-full text-left px-2.5 py-1.5 font-mono text-[11px] truncate ${i === previewIdx ? 'bg-theme-accent/40 text-theme-foreground' : 'text-theme-muted-foreground hover:bg-theme-accent/20'}`}
                      >
                        {item.path}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-theme-border overflow-hidden flex flex-col">
                <div className="bg-theme-elevation px-3 py-1.5 flex items-center justify-between border-b border-theme-border">
                  <span className="font-mono text-[11px] text-theme-foreground">{preview?.path}</span>
                  <span className="text-[10px] text-theme-muted-foreground">{preview?.language ?? 'plain'}</span>
                </div>
                <pre className="flex-1 overflow-auto p-3 text-[11px] leading-relaxed bg-theme-bg text-theme-foreground">
                  <code>{preview?.content}</code>
                </pre>
                <div className="border-t border-theme-border px-3 py-1.5 text-[10px] text-theme-muted-foreground">
                  This file was detected from the assistant's message — applying will overwrite any file at this path inside the folder you picked.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
