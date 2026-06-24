// Role-based access control configuration

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  READONLY: 'readonly'
};

export const PERMISSIONS = {
  // Admin permissions
  MANAGE_USERS: 'manage_users',
  VIEW_ALL_DATA: 'view_all_data',
  MANAGE_BILLING: 'manage_billing',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_FEEDBACK: 'view_feedback',
  
  // Manager permissions
  VIEW_TEAM_DATA: 'view_team_data',
  MANAGE_TEAM: 'manage_team',
  ASSIGN_TASKS: 'assign_tasks',
  VIEW_TEAM_ANALYTICS: 'view_team_analytics',
  
  // User permissions (default)
  VIEW_OWN_DATA: 'view_own_data',
  MANAGE_OWN_PROFILE: 'manage_own_profile',
  CREATE_EVENTS: 'create_events',
  CREATE_TASKS: 'create_tasks'
};

// Role to permissions mapping
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ALL_DATA,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.VIEW_FEEDBACK,
    PERMISSIONS.VIEW_TEAM_DATA,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.VIEW_TEAM_ANALYTICS,
    PERMISSIONS.VIEW_OWN_DATA,
    PERMISSIONS.MANAGE_OWN_PROFILE,
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.CREATE_TASKS
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_TEAM_DATA,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.VIEW_TEAM_ANALYTICS,
    PERMISSIONS.VIEW_OWN_DATA,
    PERMISSIONS.MANAGE_OWN_PROFILE,
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.CREATE_TASKS
  ],
  [ROLES.USER]: [
    PERMISSIONS.VIEW_OWN_DATA,
    PERMISSIONS.MANAGE_OWN_PROFILE,
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.CREATE_TASKS
  ],
  [ROLES.READONLY]: [
    PERMISSIONS.VIEW_OWN_DATA
  ]
};

// Feature access by role
export const FEATURE_ACCESS = {
  billing: [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  analytics: [ROLES.ADMIN, ROLES.MANAGER],
  userManagement: [ROLES.ADMIN],
  teamManagement: [ROLES.ADMIN, ROLES.MANAGER],
  feedback: [ROLES.ADMIN],
  integrations: [ROLES.ADMIN],
  advancedSettings: [ROLES.ADMIN, ROLES.MANAGER],
  createContent: [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  readOnly: [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER, ROLES.READONLY]
};

// Human-readable role metadata
export const ROLE_META = {
  [ROLES.ADMIN]: {
    label: 'Admin',
    description: 'Full access to all features including user management, billing, and system settings',
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    iconName: 'Crown'
  },
  [ROLES.MANAGER]: {
    label: 'Manager',
    description: 'Team management, analytics, and the ability to assign tasks to team members',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    iconName: 'Shield'
  },
  [ROLES.USER]: {
    label: 'Member',
    description: 'Standard access: can create events, tasks, and manage their own profile',
    color: 'teal',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
    iconName: 'User'
  },
  [ROLES.READONLY]: {
    label: 'Read-only',
    description: 'Can only view their own data. Cannot create, edit, or delete anything',
    color: 'slate',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    iconName: 'Eye'
  }
};

// Check if role has permission
export function hasPermission(userRole, permission, customPermissions = []) {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission) || customPermissions.includes(permission);
}

// Check if role can access feature
export function canAccessFeature(userRole, feature) {
  const allowedRoles = FEATURE_ACCESS[feature] || [];
  return allowedRoles.includes(userRole);
}