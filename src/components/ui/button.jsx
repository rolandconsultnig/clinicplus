import React from 'react'

const buttonVariants = {
  default:
    'bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-900/15 border border-teal-700/30',
  outline:
    'border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-800 font-medium',
  ghost: 'bg-transparent hover:bg-slate-100 hover:text-slate-900 text-slate-600',
  /** Dark sidebar navigation */
  sidebarGhost:
    'bg-transparent text-slate-300 hover:bg-white/10 hover:text-white justify-start rounded-md',
  sidebarGhostLight:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 justify-start rounded-md',
  sidebarActive:
    'bg-[color:var(--dc-accent,#0d9488)] text-white hover:bg-[color:var(--dc-accent-hover,#0f766e)] shadow-sm border-l-4 border-[color:var(--dc-accent-soft,#5eead4)] rounded-l-none justify-start',
  destructive: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-500/30',
  success: 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 shadow-md shadow-emerald-500/30',
  secondary: 'bg-slate-600 text-white hover:bg-slate-700 shadow-sm',
}

export function Button({ 
  className = '', 
  variant = 'default', 
  size = 'default',
  children, 
  ...props 
}) {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  const variantClasses = buttonVariants[variant] || buttonVariants.default
  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-12 px-6 text-base',
    icon: 'h-10 w-10'
  }
  
  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses[size] || sizeClasses.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

