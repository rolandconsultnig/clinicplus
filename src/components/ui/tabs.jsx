import React, { createContext, useContext, useState } from 'react'

const TabsContext = createContext()

export function Tabs({ defaultValue, value, onValueChange, className = '', children, ...props }) {
  const [internalValue, setInternalValue] = useState(defaultValue || '')
  const currentValue = value !== undefined ? value : internalValue
  const handleValueChange = onValueChange || setInternalValue

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className = '', children, ...props }) {
  return (
    <div
      className={`inline-flex h-11 items-center justify-center rounded-lg bg-gray-100 p-1 text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, className = '', children, ...props }) {
  const { value: currentValue, onValueChange } = useContext(TabsContext)
  const isActive = currentValue === value

  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? 'bg-teal-600 text-white shadow-sm shadow-teal-900/20'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      } ${className}`}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className = '', children, ...props }) {
  const { value: currentValue } = useContext(TabsContext)
  
  if (currentValue !== value) return null

  return (
    <div
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

