import * as React from "react"

const Textarea = React.forwardRef(({ className = '', variant = 'default', ...props }, ref) => {
  const baseClasses = "flex min-h-[100px] w-full rounded-lg border bg-background px-4 py-3 text-sm transition-all duration-200 placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y"
  
  const variantClasses = {
    default: 'border-gray-300 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-gray-400',
    filled: 'border-gray-200 bg-gray-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white',
    error: 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
    success: 'border-emerald-300 bg-emerald-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  }
  
  return (
    <textarea
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
