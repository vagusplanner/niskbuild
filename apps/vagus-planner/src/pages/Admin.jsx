import React from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ROLES } from '@/components/auth/roleConfig';
import UserManagement from '@/components/admin/UserManagement';
import SubscriptionNotificationSettings from '@/components/admin/SubscriptionNotificationSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, BarChart3, Mail, Activity } from 'lucide-react';
import UserActivityDashboard from '@/components/admin/UserActivityDashboard';

export default function AdminPage() {
  return (
    <RoleGuard requiredRoles={[ROLES.ADMIN]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            Admin Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage users, settings, and system configuration
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Mail className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              System Settings
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <Activity className="w-4 h-4" />
              User Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="notifications">
            <SubscriptionNotificationSettings />
          </TabsContent>

          <TabsContent value="settings">
            <div className="text-center py-12 text-slate-600 dark:text-slate-400">
              System settings coming soon
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <UserActivityDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}