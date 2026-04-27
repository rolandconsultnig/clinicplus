import React from 'react'

const badgeVariants = {
  default: 'border-transparent bg-teal-600 text-white shadow-sm',
  secondary: 'border-transparent bg-slate-600 text-white',
  destructive: 'border-transparent bg-gradient-to-r from-red-600 to-rose-600 text-white',
  outline: 'border-2 border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50',
  success: 'border-transparent bg-gradient-to-r from-emerald-600 to-green-600 text-white',
  warning: 'border-transparent bg-gradient-to-r from-amber-600 to-orange-600 text-white',
  info: 'border-transparent bg-gradient-to-r from-teal-600 to-cyan-700 text-white',
}

export function Badge({ className = '', variant = 'default', children, ...props }) {
  const baseClasses = 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:ring-offset-2'
  const variantClasses = badgeVariants[variant] || badgeVariants.default
  
  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </div>
  )
}

