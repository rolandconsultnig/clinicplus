import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const STORAGE_KEY_PREFIX = 'digiclinic_personalize_v1'

const defaultState = {
  accentId: 'teal',
  backgroundId: 'default',
  sidebarLayout: 'default',
  sidebarStyle: 'dark',
}

/** Main canvas backgrounds — single source for CSS + Personalize previews */
export const BACKGROUND_GRADIENTS = {
  default: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 40%, #ecfdf5 100%)',
  warm: 'linear-gradient(180deg, #fffbeb 0%, #fef9c3 38%, #f8fafc 100%)',
  cool: 'linear-gradient(180deg, #ecfeff 0%, #e0f2fe 42%, #f8fafc 100%)',
  neutral: '#f1f5f9',
  rose: 'linear-gradient(180deg, #fff1f2 0%, #ffe4e6 40%, #f8fafc 100%)',
  red: 'linear-gradient(180deg, #fef2f2 0%, #fecaca 36%, #f8fafc 100%)',
  orange: 'linear-gradient(180deg, #fff7ed 0%, #ffedd5 38%, #f8fafc 100%)',
  amber: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 38%, #f8fafc 100%)',
  yellow: 'linear-gradient(180deg, #fefce8 0%, #fef08a 32%, #f8fafc 100%)',
  lime: 'linear-gradient(180deg, #f7fee7 0%, #ecfccb 36%, #f8fafc 100%)',
  green: 'linear-gradient(180deg, #f0fdf4 0%, #bbf7d0 36%, #f8fafc 100%)',
  emerald: 'linear-gradient(180deg, #ecfdf5 0%, #a7f3d0 36%, #f8fafc 100%)',
  teal: 'linear-gradient(180deg, #f0fdfa 0%, #99f6e4 36%, #f8fafc 100%)',
  cyan: 'linear-gradient(180deg, #ecfeff 0%, #a5f3fc 36%, #f8fafc 100%)',
  sky: 'linear-gradient(180deg, #f0f9ff 0%, #bae6fd 36%, #f8fafc 100%)',
  blue: 'linear-gradient(180deg, #eff6ff 0%, #bfdbfe 36%, #f8fafc 100%)',
  indigo: 'linear-gradient(180deg, #eef2ff 0%, #c7d2fe 36%, #f8fafc 100%)',
  violet: 'linear-gradient(180deg, #f5f3ff 0%, #ddd6fe 36%, #f8fafc 100%)',
  purple: 'linear-gradient(180deg, #faf5ff 0%, #e9d5ff 36%, #f8fafc 100%)',
  fuchsia: 'linear-gradient(180deg, #fdf4ff 0%, #f5d0fe 36%, #f8fafc 100%)',
  pink: 'linear-gradient(180deg, #fdf2f8 0%, #fbcfe8 36%, #f8fafc 100%)',
  slate: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 42%, #f1f5f9 100%)',
  stone: 'linear-gradient(180deg, #fafaf9 0%, #e7e5e4 42%, #f5f5f4 100%)',
}

const BG_IDS = new Set(Object.keys(BACKGROUND_GRADIENTS))

/** Order + labels for Personalize UI (ids must exist in BACKGROUND_GRADIENTS) */
export const BACKGROUND_SWATCHES = [
  { id: 'default', label: 'Clinical mint' },
  { id: 'warm', label: 'Warm sand' },
  { id: 'cool', label: 'Cool breeze' },
  { id: 'neutral', label: 'Flat gray' },
  { id: 'rose', label: 'Rose mist' },
  { id: 'red', label: 'Coral wash' },
  { id: 'orange', label: 'Peach glow' },
  { id: 'amber', label: 'Amber haze' },
  { id: 'yellow', label: 'Soft lemon' },
  { id: 'lime', label: 'Lime dew' },
  { id: 'green', label: 'Sage field' },
  { id: 'emerald', label: 'Emerald air' },
  { id: 'teal', label: 'Teal spa' },
  { id: 'cyan', label: 'Cyan mist' },
  { id: 'sky', label: 'Sky wash' },
  { id: 'blue', label: 'Blue calm' },
  { id: 'indigo', label: 'Indigo dusk' },
  { id: 'violet', label: 'Violet veil' },
  { id: 'purple', label: 'Lilac haze' },
  { id: 'fuchsia', label: 'Fuchsia glow' },
  { id: 'pink', label: 'Pink blush' },
  { id: 'slate', label: 'Cool slate' },
  { id: 'stone', label: 'Warm stone' },
]

const LAYOUT_IDS = new Set(['compact', 'default', 'comfortable'])
const STYLE_IDS = new Set(['dark', 'light'])

/** Tailwind-aligned 600/700/300 + ring — full hue range for UI accents */
export const ACCENT_PRESETS = {
  rose: { '--dc-accent': '#e11d48', '--dc-accent-hover': '#be123c', '--dc-accent-soft': '#fda4af', '--dc-ring': 'rgba(225, 29, 72, 0.45)' },
  red: { '--dc-accent': '#dc2626', '--dc-accent-hover': '#b91c1c', '--dc-accent-soft': '#fca5a5', '--dc-ring': 'rgba(220, 38, 38, 0.45)' },
  orange: { '--dc-accent': '#ea580c', '--dc-accent-hover': '#c2410c', '--dc-accent-soft': '#fdba74', '--dc-ring': 'rgba(234, 88, 12, 0.45)' },
  amber: { '--dc-accent': '#d97706', '--dc-accent-hover': '#b45309', '--dc-accent-soft': '#fcd34d', '--dc-ring': 'rgba(217, 119, 6, 0.45)' },
  yellow: { '--dc-accent': '#ca8a04', '--dc-accent-hover': '#a16207', '--dc-accent-soft': '#fde047', '--dc-ring': 'rgba(202, 138, 4, 0.45)' },
  lime: { '--dc-accent': '#65a30d', '--dc-accent-hover': '#4d7c0f', '--dc-accent-soft': '#bef264', '--dc-ring': 'rgba(101, 163, 13, 0.45)' },
  green: { '--dc-accent': '#16a34a', '--dc-accent-hover': '#15803d', '--dc-accent-soft': '#86efac', '--dc-ring': 'rgba(22, 163, 74, 0.45)' },
  emerald: { '--dc-accent': '#059669', '--dc-accent-hover': '#047857', '--dc-accent-soft': '#6ee7b7', '--dc-ring': 'rgba(16, 185, 129, 0.45)' },
  teal: { '--dc-accent': '#0d9488', '--dc-accent-hover': '#0f766e', '--dc-accent-soft': '#5eead4', '--dc-ring': 'rgba(20, 184, 166, 0.45)' },
  cyan: { '--dc-accent': '#0891b2', '--dc-accent-hover': '#0e7490', '--dc-accent-soft': '#67e8f9', '--dc-ring': 'rgba(6, 182, 212, 0.45)' },
  sky: { '--dc-accent': '#0284c7', '--dc-accent-hover': '#0369a1', '--dc-accent-soft': '#7dd3fc', '--dc-ring': 'rgba(14, 165, 233, 0.45)' },
  blue: { '--dc-accent': '#2563eb', '--dc-accent-hover': '#1d4ed8', '--dc-accent-soft': '#93c5fd', '--dc-ring': 'rgba(37, 99, 235, 0.45)' },
  indigo: { '--dc-accent': '#4f46e5', '--dc-accent-hover': '#4338ca', '--dc-accent-soft': '#a5b4fc', '--dc-ring': 'rgba(79, 70, 229, 0.45)' },
  violet: { '--dc-accent': '#7c3aed', '--dc-accent-hover': '#6d28d9', '--dc-accent-soft': '#c4b5fd', '--dc-ring': 'rgba(139, 92, 246, 0.45)' },
  purple: { '--dc-accent': '#9333ea', '--dc-accent-hover': '#7e22ce', '--dc-accent-soft': '#d8b4fe', '--dc-ring': 'rgba(147, 51, 234, 0.45)' },
  fuchsia: { '--dc-accent': '#c026d3', '--dc-accent-hover': '#a21caf', '--dc-accent-soft': '#f0abfc', '--dc-ring': 'rgba(192, 38, 211, 0.45)' },
  pink: { '--dc-accent': '#db2777', '--dc-accent-hover': '#be185d', '--dc-accent-soft': '#f9a8d4', '--dc-ring': 'rgba(219, 39, 119, 0.45)' },
  slate: { '--dc-accent': '#475569', '--dc-accent-hover': '#334155', '--dc-accent-soft': '#cbd5e1', '--dc-ring': 'rgba(71, 85, 105, 0.45)' },
  stone: { '--dc-accent': '#57534e', '--dc-accent-hover': '#44403c', '--dc-accent-soft': '#d6d3d1', '--dc-ring': 'rgba(87, 83, 78, 0.45)' },
}

/** UI order + Tailwind swatch classes (keep ids in sync with ACCENT_PRESETS) */
export const ACCENT_SWATCHES = [
  { id: 'rose', label: 'Rose', swatch: 'bg-rose-600' },
  { id: 'red', label: 'Red', swatch: 'bg-red-600' },
  { id: 'orange', label: 'Orange', swatch: 'bg-orange-600' },
  { id: 'amber', label: 'Amber', swatch: 'bg-amber-600' },
  { id: 'yellow', label: 'Yellow', swatch: 'bg-yellow-500' },
  { id: 'lime', label: 'Lime', swatch: 'bg-lime-600' },
  { id: 'green', label: 'Green', swatch: 'bg-green-600' },
  { id: 'emerald', label: 'Emerald', swatch: 'bg-emerald-600' },
  { id: 'teal', label: 'Teal', swatch: 'bg-teal-600' },
  { id: 'cyan', label: 'Cyan', swatch: 'bg-cyan-600' },
  { id: 'sky', label: 'Sky', swatch: 'bg-sky-600' },
  { id: 'blue', label: 'Blue', swatch: 'bg-blue-600' },
  { id: 'indigo', label: 'Indigo', swatch: 'bg-indigo-600' },
  { id: 'violet', label: 'Violet', swatch: 'bg-violet-600' },
  { id: 'purple', label: 'Purple', swatch: 'bg-purple-600' },
  { id: 'fuchsia', label: 'Fuchsia', swatch: 'bg-fuchsia-600' },
  { id: 'pink', label: 'Pink', swatch: 'bg-pink-600' },
  { id: 'slate', label: 'Slate', swatch: 'bg-slate-600' },
  { id: 'stone', label: 'Stone', swatch: 'bg-stone-600' },
]

export function applyAccentVariables(el, accentId) {
  if (!el || typeof el.style === 'undefined') return
  const vars = ACCENT_PRESETS[accentId] || ACCENT_PRESETS.teal
  Object.entries(vars).forEach(([k, v]) => {
    el.style.setProperty(k, v)
  })
}

const PersonalizationContext = createContext(null)

export function usePersonalization() {
  const ctx = useContext(PersonalizationContext)
  if (!ctx) {
    throw new Error('usePersonalization must be used within PersonalizationProvider')
  }
  return ctx
}

function getStorageIdentity(user) {
  const candidate = user?.id ?? user?.user_id ?? user?.username ?? user?.email ?? 'default'
  const raw = String(candidate).trim().toLowerCase()
  return raw.replace(/[^a-z0-9_-]/g, '_') || 'default'
}

function getStorageKey(user) {
  return `${STORAGE_KEY_PREFIX}:${getStorageIdentity(user)}`
}

export function PersonalizationProvider({ user, children }) {
  const storageKey = useMemo(() => getStorageKey(user), [user])
  const [accentId, setAccentId] = useState(defaultState.accentId)
  const [backgroundId, setBackgroundId] = useState(defaultState.backgroundId)
  const [sidebarLayout, setSidebarLayout] = useState(defaultState.sidebarLayout)
  const [sidebarStyle, setSidebarStyle] = useState(defaultState.sidebarStyle)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(false)
    setAccentId(defaultState.accentId)
    setBackgroundId(defaultState.backgroundId)
    setSidebarLayout(defaultState.sidebarLayout)
    setSidebarStyle(defaultState.sidebarStyle)
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const p = JSON.parse(raw)
        if (p.accentId && ACCENT_PRESETS[p.accentId]) setAccentId(p.accentId)
        if (p.backgroundId && BG_IDS.has(p.backgroundId)) setBackgroundId(p.backgroundId)
        if (p.sidebarLayout && LAYOUT_IDS.has(p.sidebarLayout)) setSidebarLayout(p.sidebarLayout)
        if (p.sidebarStyle && STYLE_IDS.has(p.sidebarStyle)) setSidebarStyle(p.sidebarStyle)
      }
    } catch (_) {
      /* ignore */
    }
    setHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(
      storageKey,
      JSON.stringify({ accentId, backgroundId, sidebarLayout, sidebarStyle })
    )
  }, [accentId, backgroundId, sidebarLayout, sidebarStyle, hydrated, storageKey])

  const appShellRef = useRef(null)

  /** Apply accent tokens as soon as the shell node exists (and on every accent / hydration change). */
  useLayoutEffect(() => {
    applyAccentVariables(appShellRef.current, accentId)
  }, [accentId, hydrated])

  const setAppShellRef = useCallback(
    (node) => {
      appShellRef.current = node
      if (node) applyAccentVariables(node, accentId)
    },
    [accentId]
  )

  const mainSurfaceClass = useMemo(() => 'digiclinic-main-area', [])

  const mainCanvasStyle = useMemo(
    () => ({
      background: BACKGROUND_GRADIENTS[backgroundId] ?? BACKGROUND_GRADIENTS.default,
    }),
    [backgroundId]
  )

  const sidebarWidthClass = useMemo(() => {
    switch (sidebarLayout) {
      case 'compact':
        return 'w-60'
      case 'comfortable':
        return 'w-80'
      default:
        return 'w-72'
    }
  }, [sidebarLayout])

  const value = useMemo(
    () => ({
      accentId,
      setAccentId,
      backgroundId,
      setBackgroundId,
      dataDcBg: backgroundId,
      sidebarLayout,
      setSidebarLayout,
      sidebarStyle,
      setSidebarStyle,
      appShellRef,
      setAppShellRef,
      mainSurfaceClass,
      mainCanvasStyle,
      sidebarWidthClass,
      hydrated,
      storageKey,
    }),
    [
      accentId,
      backgroundId,
      sidebarLayout,
      sidebarStyle,
      mainSurfaceClass,
      mainCanvasStyle,
      sidebarWidthClass,
      hydrated,
      storageKey,
    ]
  )

  return (
    <PersonalizationContext.Provider value={value}>{children}</PersonalizationContext.Provider>
  )
}
