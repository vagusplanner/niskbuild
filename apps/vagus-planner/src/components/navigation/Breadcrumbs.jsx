import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Breadcrumbs() {
  const location = useLocation();
  
  // Parse current path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  if (pathSegments.length === 0) return null;

  const breadcrumbs = [
    { label: 'Home', path: '/' }
  ];

  // Build breadcrumb trail
  pathSegments.forEach((segment, index) => {
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    breadcrumbs.push({ label, path });
  });

  // Don't show breadcrumbs on root pages
  if (breadcrumbs.length <= 2) return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-slate-600 mb-4">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.path}>
          {index > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-slate-800">{crumb.label}</span>
          ) : (
            <Link 
              to={crumb.path}
              className="hover:text-teal-600 transition-colors"
            >
              {index === 0 ? (
                <Home className="w-4 h-4" />
              ) : (
                crumb.label
              )}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}