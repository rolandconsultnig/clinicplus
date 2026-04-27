import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Enhanced page wrapper component with improved UI/UX
 * Features: breadcrumbs, better spacing, improved visual hierarchy
 */
export function PageWrapper({ title, description, icon: Icon, children, actions, breadcrumbs }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/35 to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            <Home className="w-4 h-4" />
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 font-medium">{crumb}</span>
                ) : (
                  <span className="hover:text-gray-900 transition-colors">{crumb}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Enhanced Header Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/80 p-6 lg:p-8 transition-all duration-200 hover:shadow-md hover:border-teal-200/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {Icon && (
                <div className="w-14 h-14 bg-gradient-to-br from-teal-600 to-teal-800 rounded-xl flex items-center justify-center shadow-lg shadow-teal-900/20">
                  <Icon className="w-7 h-7 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                  {title}
                </h1>
                {description && (
                  <p className="text-gray-600 mt-2 text-base lg:text-lg leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-3 flex-wrap">
                {actions}
              </div>
            )}
          </div>
        </div>

        {/* Content with improved spacing */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </div>
    </div>
  );
}

export default PageWrapper;

