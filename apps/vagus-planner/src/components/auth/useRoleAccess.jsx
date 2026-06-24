import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { hasPermission, canAccessFeature, ROLES } from './roleConfig';

export function useRoleAccess() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const userRole = user?.role || ROLES.USER;
  const customPermissions = user?.permissions || [];

  return {
    user,
    role: userRole,
    isAdmin: userRole === ROLES.ADMIN,
    isManager: userRole === ROLES.MANAGER,
    isUser: userRole === ROLES.USER,
    isReadOnly: userRole === ROLES.READONLY,
    canWrite: userRole !== ROLES.READONLY,
    hasPermission: (permission) => hasPermission(userRole, permission, customPermissions),
    canAccessFeature: (feature) => canAccessFeature(userRole, feature),
    customPermissions
  };
}