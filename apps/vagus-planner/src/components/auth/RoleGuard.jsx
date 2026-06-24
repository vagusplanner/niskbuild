import React from 'react';
import { useRoleAccess } from './useRoleAccess';
import { AlertCircle, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export function RoleGuard({ 
  children, 
  requiredRoles = [], 
  requiredPermission = null,
  requiredFeature = null,
  fallback = null,
  showFallback = true 
}) {
  const { role, hasPermission, canAccessFeature } = useRoleAccess();

  // Check role access
  const hasRoleAccess = requiredRoles.length === 0 || requiredRoles.includes(role);
  
  // Check permission access
  const hasPermissionAccess = !requiredPermission || hasPermission(requiredPermission);
  
  // Check feature access
  const hasFeatureAccess = !requiredFeature || canAccessFeature(requiredFeature);

  const hasAccess = hasRoleAccess && hasPermissionAccess && hasFeatureAccess;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return fallback;
  }

  if (!showFallback) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle>Access Restricted</CardTitle>
          <CardDescription>
            You don't have permission to access this feature
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {requiredRoles.length > 0 && (
                <>Required role: <strong>{requiredRoles.join(' or ')}</strong></>
              )}
              {requiredPermission && (
                <>Required permission: <strong>{requiredPermission}</strong></>
              )}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Your current role: <strong className="text-teal-600">{role}</strong>
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to={createPageUrl('Dashboard')}>Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function FeatureGuard({ children, feature, inline = false, message = null }) {
  const { canAccessFeature } = useRoleAccess();

  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }

  if (inline) {
    return (
      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Lock className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {message || 'This feature is restricted'}
        </span>
      </div>
    );
  }

  return null;
}