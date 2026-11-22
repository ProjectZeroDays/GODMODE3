'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ChatArea } from '@/components/ChatArea'
import { SettingsModal } from '@/components/SettingsModal'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { WriteToDiskPanel } from '@/components/WriteToDiskPanel'
import { StatusStrip } from '@/components/StatusStrip'
import { Workbench } from '@/components/Workbench'
import { useStore } from '@/store'
import { useEasterEggs } from '@/hooks/useEasterEggs'
import { useApiAutoDetect } from '@/hooks/useApiAutoDetect'

export default function Home() {
  const {
    theme,
    currentConversation,
    showSettings,
    setShowSettings,
    apiKey,
    ultraplinianApiUrl,
    ultraplinianApiKey,
    isHydrated
  } = useStore()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showWriteToDisk, setShowWriteToDisk] = useState(false)

  // Listen for the "open write-to-disk" event the chat header dispatches,
  // so the panel is hosted at the root where state is held.
  useEffect(() => {
    const onOpen = () => setShowWriteToDisk(true)
    window.addEventListener('g0d:open-write-to-disk', onOpen)
    return () => window.removeEventListener('g0d:open-write-to-disk', onOpen)
  }, [])

  // Initialize easter eggs
  useEasterEggs()

  // Auto-detect self-hosted API server at same origin
  useApiAutoDetect()

  // Proxy mode: API server available but no personal OpenRouter key
  const proxyMode = !apiKey && !!ultraplinianApiUrl && !!ultraplinianApiKey

  // Sync theme class to <html> so CSS variables (scrollbar colours, etc.)
  // cascade to elements outside <main>
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-matrix', 'theme-hacker', 'theme-glyph', 'theme-minimal', 'theme-opencode', 'theme-graphite', 'theme-opencode-light', 'theme-graphite-light')
    root.classList.add(`theme-${theme}`)
  }, [theme])

  // Don't render until hydrated to prevent mismatch
  if (!isHydrated) {
    return (
      <div className={`theme-${theme} theme-bg min-h-screen flex items-center justify-center`}>
        <div className="theme-primary text-xl font-mono">
          <span className="loading-dots">Initializing g0dm0d4</span>
        </div>
      </div>
    )
  }

  return (
    <main className={`theme-${theme} theme-bg theme-text min-h-screen flex flex-col relative overflow-hidden`}>
      {/* Top status strip: IP, VPN/Proxy, agent status */}
      <StatusStrip />

      {/* Scanline effect for Matrix/Hacker themes */}
      {(theme === 'matrix' || theme === 'hacker') && (
        <div className="scanlines pointer-events-none absolute inset-0 z-50" />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main content — pushed right by the sidebar's width when open */}
      <div className={`flex-1 flex flex-col transition-all duration-300 overflow-hidden ${sidebarOpen ? '' : ''}`}>

        {/* Status strip at top */}
        <StatusStrip />

        {(!apiKey && !proxyMode) || !currentConversation ? (
          <WelcomeScreen onOpenSettings={() => setShowSettings(true)} />
        ) : (
          <ChatArea />
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Right workbench: file tree, terminal, diffs */}
      <Workbench />

      {/* Write-to-Disk batch apply */}
      <WriteToDiskPanel open={showWriteToDisk} onClose={() => setShowWriteToDisk(false)} />
    </main>
  )
}
