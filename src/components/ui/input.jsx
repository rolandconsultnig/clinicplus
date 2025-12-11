import React from 'react'

export function Input({ className = '', variant = 'default', ...props }) {
  const baseClasses = 'flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
  
  const variantClasses = {
    default: 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-gray-400',
    filled: 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white',
    error: 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
    success: 'border-emerald-300 bg-emerald-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  }
  
  return (
    <input
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`}
      {...props}
    />
  )
}

