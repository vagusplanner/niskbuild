import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, Shield, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Personal Info only — name / email / membership metadata.
 * Photo upload lives once in Account → Personal Info (ProfilePictureUploader).
 * Password, 2FA, sign-out, and delete live in Security / Privacy tabs.
 */
export default function AccountSettings({ user, onUpdate, isSaving }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
  });

  useEffect(() => {
    setFormData({ full_name: user?.full_name || '' });
  }, [user?.full_name]);

  const handleSave = () => {
    onUpdate(formData);
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <Card>
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
              <div className="space-y-2">
                <Label className="text-slate-500">Email</Label>
                <p className="text-sm font-medium flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {user?.email}
                </p>
                <p className="text-xs text-slate-500">
                  Email cannot be changed here. Contact support if needed.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormData({ full_name: user?.full_name || '' });
                    setEditing(false);
                  }}
                >
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
                <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4" />
                  {user?.created_date && format(new Date(user.created_date), 'MMMM d, yyyy')}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-lg text-center">
              <CheckCircle className="w-8 h-8 text-teal-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-300">Active Account</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
              <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-300">Email Verified</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-center">
              <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-300 capitalize">{user?.role} User</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
              <Calendar className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {user?.created_date &&
                  Math.floor((new Date() - new Date(user.created_date)) / (1000 * 60 * 60 * 24))}{' '}
                days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
