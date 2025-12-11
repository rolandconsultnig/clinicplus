import React from 'react'

const buttonVariants = {
  default: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40',
  outline: 'border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700 font-medium',
  ghost: 'hover:bg-gray-100 hover:text-gray-900 text-gray-700',
  destructive: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-500/30',
  success: 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 shadow-md shadow-emerald-500/30',
  secondary: 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 shadow-md',
}

export function Button({ 
  className = '', 
  variant = 'default', 
  size = 'default',
  children, 
  ...props 
}) {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]'
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

