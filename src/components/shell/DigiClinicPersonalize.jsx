import React, { useState } from 'react'
import { MessageSquare, Phone, Settings, Palette, PanelLeft, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import {
  ACCENT_SWATCHES,
  BACKGROUND_GRADIENTS,
  BACKGROUND_SWATCHES,
  usePersonalization,
} from '@/contexts/PersonalizationContext.jsx'

const LAYOUT_OPTIONS = [
  { id: 'compact', label: 'Compact', desc: 'Narrow rail' },
  { id: 'default', label: 'Balanced', desc: 'Default width' },
  { id: 'comfortable', label: 'Spacious', desc: 'Wider sidebar' },
]

const STYLE_OPTIONS = [
  { id: 'dark', label: 'Dark rail', desc: 'Classic DigiClinic dark sidebar' },
  { id: 'light', label: 'Light rail', desc: 'Bright sidebar, dark text' },
]

export function PersonalizeSections({ dense = false }) {
  const {
    accentId,
    setAccentId,
    backgroundId,
    setBackgroundId,
    sidebarLayout,
    setSidebarLayout,
    sidebarStyle,
    setSidebarStyle,
  } = usePersonalization()

  return (
    <div className={dense ? 'space-y-4' : 'space-y-5'}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Colors</p>
        <p className="text-xs text-slate-600 mb-2">Accent for buttons, focus rings & highlights</p>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8">
          {ACCENT_SWATCHES.map((a) => (
            <button
              key={a.id}
              type="button"
              title={a.label}
              aria-label={a.label}
              aria-pressed={accentId === a.id}
              onClick={() => setAccentId(a.id)}
              className={`h-7 w-7 rounded-full ring-2 ring-offset-1 ring-offset-white transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                a.swatch
              } ${accentId === a.id ? 'ring-slate-900 scale-105' : 'ring-transparent'}`}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Backgrounds</p>
        <p className="text-xs text-slate-600 mb-2">Canvas tint and gradient</p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {BACKGROUND_SWATCHES.map((b) => (
            <button
              key={b.id}
              type="button"
              title={b.label}
              aria-label={b.label}
              aria-pressed={backgroundId === b.id}
              onClick={() => setBackgroundId(b.id)}
              className={`rounded-lg border overflow-hidden text-left transition-colors ${
                backgroundId === b.id
                  ? 'border-[color:var(--dc-accent,#0d9488)] ring-2 ring-[color:var(--dc-ring,rgba(20,184,166,0.35))]'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                className="h-9 w-full"
                style={{ background: BACKGROUND_GRADIENTS[b.id] }}
              />
              <span className="block px-1.5 py-1 text-[10px] font-medium leading-tight text-slate-800 bg-white/95">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Sidebar layout</p>
        <p className="text-xs text-slate-600 mb-2">Change sidebar layout style</p>
        <div className="space-y-2">
          {LAYOUT_OPTIONS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSidebarLayout(l.id)}
              className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                sidebarLayout === l.id
                  ? 'border-[color:var(--dc-accent,#0d9488)] bg-teal-50/90 text-slate-900'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <PanelLeft className="w-4 h-4 shrink-0 opacity-70" />
              <span>
                <span className="font-medium block">{l.label}</span>
                <span className="text-xs text-slate-500">{l.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Sidebar style</p>
        <div className="grid grid-cols-2 gap-2">
          {STYLE_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSidebarStyle(s.id)}
              className={`rounded-lg border px-2 py-2 text-left text-xs transition-colors ${
                sidebarStyle === s.id
                  ? 'border-[color:var(--dc-accent,#0d9488)] bg-teal-50/80 text-slate-900'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="font-medium block">{s.label}</span>
              <span className="text-xs text-slate-500">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DigiClinicSidebarFooter({ onNavigate }) {
  return (
    <div className="mt-auto pt-3 border-t border-slate-700/80 space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Quick links</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-center gap-1.5 h-9 text-xs border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-800 hover:text-white"
            onClick={() => onNavigate('messaging')}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-center gap-1.5 h-9 text-xs border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-800 hover:text-white"
            onClick={() => onNavigate('messaging-management')}
          >
            <Phone className="w-3.5 h-3.5" />
            Calls
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full mt-2 justify-start gap-2 h-9 text-xs border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-800"
          onClick={() => onNavigate('system-settings')}
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </Button>
      </div>
    </div>
  )
}

export function DigiClinicSidebarFooterLight({ onNavigate }) {
  return (
    <div className="mt-auto pt-3 border-t border-slate-200 space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Quick links</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-center gap-1.5 h-9 text-xs"
            onClick={() => onNavigate('messaging')}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-center gap-1.5 h-9 text-xs"
            onClick={() => onNavigate('messaging-management')}
          >
            <Phone className="w-3.5 h-3.5" />
            Calls
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full mt-2 justify-start gap-2 h-9 text-xs"
          onClick={() => onNavigate('system-settings')}
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </Button>
      </div>
    </div>
  )
}

export function PersonalizeFloatingDock() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
        {open && (
          <div className="w-[min(100vw-1.5rem,26rem)] max-h-[min(85vh,32rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[color:var(--dc-accent,#0d9488)]" />
                  Personalize
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Theme, background & sidebar look — not in the main menu</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <PersonalizeSections dense />
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg text-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: 'var(--dc-accent, #0d9488)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
          }}
          title="Appearance & layout"
        >
          {open ? <X className="w-5 h-5" /> : <Palette className="w-5 h-5" />}
        </button>
      </div>
    </>
  )
}
