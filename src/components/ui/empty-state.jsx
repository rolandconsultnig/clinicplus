import React from 'react';
import { Button } from './button';

/**
 * Enhanced Empty State Component
 * Provides consistent empty state UI across the application
 */
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel,
  className = '' 
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
        {Icon && <Icon className="w-10 h-10 text-gray-400" />}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 max-w-md mb-6 leading-relaxed">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action} className="shadow-md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;

