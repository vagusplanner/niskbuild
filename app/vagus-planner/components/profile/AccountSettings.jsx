import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, Lock, Calendar, Shield, AlertCircle, CheckCircle, LogOut, KeyRound, Info, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import ProfilePictureUploader from './ProfilePictureUploader';
import AccountDeletionDialog from './AccountDeletionDialog';

export default function AccountSettings({ user, onUpdate, isSaving }) {
  const [editing, setEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || ''
  });
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);

  const handleSave = () => {
    onUpdate(formData);
    setEditing(false);
  };

  const handleChangePassword = () => {
    // Log out and redirect to login with password reset flow
    base44.auth.logout();
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture & Basic Info */}
      <div className="grid lg:grid-cols-3 gap-6">
        <ProfilePictureUploader currentUser={user} />
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" />
                Personal Information
              </span>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input 
                    value={formData.full_name} 
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-slate-500">Full Name</Label>
                  <p className="text-lg font-medium">{user?.full_name || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Email</Label>
                  <p className="text-lg font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {user?.email}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Email cannot be changed here. Contact support if needed.
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Account Role</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Shield className="w-3 h-3" />
                      {user?.role}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-500">Member Since</Label>
                  <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    {user?.created_date && format(new Date(user.created_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-teal-600" />
            Security & Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* How to change password */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">How to change your password</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">
                Sign out, then click <strong>"Forgot Password"</strong> on the login page. You'll receive a reset link by email within a few minutes.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Reset Password</p>
                <p className="text-xs text-slate-500">Sign out to access the password reset flow</p>
              </div>
            </div>
            <Button onClick={handleChangePassword} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <LogOut className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Sign Out</p>
                <p className="text-xs text-slate-500">Log out of Vagus Planner</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 no-select">
              Sign Out
            </Button>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-red-700 dark:text-red-300">Delete Account</p>
                <p className="text-xs text-red-500 dark:text-red-400">Permanently delete all your data</p>
              </div>
            </div>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="outline"
              size="sm"
              className="border-red-400 text-red-600 hover:bg-red-100 dark:hover:bg-red-950 no-select"
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <AccountDeletionDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        userEmail={user?.email}
      />

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Account Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-teal-50 rounded-lg text-center">
              <CheckCircle className="w-8 h-8 text-teal-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Active Account</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Email Verified</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600 capitalize">{user?.role} User</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg text-center">
              <Calendar className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                {user?.created_date && Math.floor((new Date() - new Date(user.created_date)) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}