import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Users, Shield, User, Crown, Search, Mail, Eye, Info } from 'lucide-react';
import { ROLES, ROLE_META } from '@/components/auth/roleConfig';
import { format } from 'date-fns';

const ROLE_ICONS = {
  [ROLES.ADMIN]: Crown,
  [ROLES.MANAGER]: Shield,
  [ROLES.USER]: User,
  [ROLES.READONLY]: Eye
};

const ALL_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER, ROLES.READONLY];

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingRole, setPendingRole] = useState('');
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLES.USER);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }) => base44.entities.User.update(userId, { role: newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('Role updated successfully');
      setShowRoleDialog(false);
      setSelectedUser(null);
    },
    onError: () => toast.error('Failed to update role')
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => base44.users.inviteUser(email, role),
    onSuccess: () => {
      toast.success('Invitation sent!');
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole(ROLES.USER);
    },
    onError: (err) => toast.error(err.message || 'Failed to send invitation')
  });

  const handleOpenRoleDialog = (user) => {
    setSelectedUser(user);
    setPendingRole(user.role || ROLES.USER);
    setShowRoleDialog(true);
  };

  const handleConfirmRole = () => {
    if (selectedUser && pendingRole && pendingRole !== selectedUser.role) {
      updateRoleMutation.mutate({ userId: selectedUser.id, newRole: pendingRole });
    } else {
      setShowRoleDialog(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleCounts = ALL_ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => (u.role || ROLES.USER) === r).length;
    return acc;
  }, {});

  const getRoleIcon = (role) => {
    const Icon = ROLE_ICONS[role] || User;
    return <Icon className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
              <CardDescription>Manage roles and invite new members</CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)} className="gap-2 self-start">
              <Mail className="w-4 h-4" />
              Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Role stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALL_ROLES.map(role => {
              const meta = ROLE_META[role];
              return (
                <div key={role} className={`p-3 rounded-lg border ${meta.badgeClass.replace('text-', 'border-').split(' ')[0]}/30 bg-${meta.color}-50 dark:bg-${meta.color}-950/30`}>
                  <div className="text-2xl font-bold">{roleCounts[role] || 0}</div>
                  <div className="text-xs font-medium mt-0.5">{meta.label}s</div>
                </div>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User list */}
          <div className="space-y-2">
            {filteredUsers.length === 0 && (
              <p className="text-center text-slate-500 py-8">No users found</p>
            )}
            {filteredUsers.map(u => {
              const role = u.role || ROLES.USER;
              const meta = ROLE_META[role] || ROLE_META[ROLES.USER];
              const isCurrentUser = u.email === currentUser?.email;
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${meta.badgeClass}`}>
                      {getRoleIcon(role)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                        <span className="truncate">{u.full_name || 'Unnamed User'}</span>
                        {isCurrentUser && <Badge variant="outline" className="text-[10px]">You</Badge>}
                      </div>
                      <div className="text-sm text-slate-500 truncate">{u.email}</div>
                      {u.created_date && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          Joined {format(new Date(u.created_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                    <Badge className={`${meta.badgeClass} flex-shrink-0 hidden sm:flex items-center gap-1`}>
                      {getRoleIcon(role)}
                      {meta.label}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenRoleDialog(u)}
                    disabled={isCurrentUser}
                    title={isCurrentUser ? "You cannot change your own role" : "Change role"}
                  >
                    Change Role
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-4 h-4" />
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {ALL_ROLES.map(role => {
              const meta = ROLE_META[role];
              const Icon = ROLE_ICONS[role] || User;
              return (
                <div key={role} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${meta.badgeClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">{meta.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update role for <strong>{selectedUser?.full_name || selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={pendingRole} onValueChange={setPendingRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map(role => {
                    const meta = ROLE_META[role];
                    const Icon = ROLE_ICONS[role] || User;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="font-medium">{meta.label}</span>
                          <span className="text-slate-400 text-xs hidden sm:inline">—</span>
                          <span className="text-slate-500 text-xs hidden sm:inline truncate max-w-[160px]">{meta.description.split('.')[0]}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {pendingRole && (
              <div className={`p-3 rounded-lg text-sm ${ROLE_META[pendingRole]?.badgeClass}`}>
                <div className="font-medium">{ROLE_META[pendingRole]?.label}</div>
                <div className="mt-0.5 opacity-80">{ROLE_META[pendingRole]?.description}</div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleConfirmRole}
                disabled={updateRoleMutation.isPending}
                className="flex-1"
              >
                {updateRoleMutation.isPending ? 'Saving...' : 'Confirm Change'}
              </Button>
              <Button variant="outline" onClick={() => setShowRoleDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>Send an invitation email to add someone to the app</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map(role => {
                    const meta = ROLE_META[role];
                    const Icon = ROLE_ICONS[role] || User;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {meta.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {inviteRole && (
                <p className="text-xs text-slate-500">{ROLE_META[inviteRole]?.description}</p>
              )}
            </div>
            <Button
              onClick={() => {
                if (!inviteEmail) { toast.error('Please enter an email address'); return; }
                inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
              }}
              disabled={inviteMutation.isPending}
              className="w-full"
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}