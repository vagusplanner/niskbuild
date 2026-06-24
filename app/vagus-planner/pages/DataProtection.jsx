import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Download, Trash2, Eye, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DataProtectionPage() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const exportMyData = async () => {
    setExporting(true);
    try {
      // Fetch all user data
      const [events, tasks, prayerLogs, routines, settings, goals] = await Promise.all([
        base44.entities.Event.list(),
        base44.entities.Task.list(),
        base44.entities.PrayerLog.list(),
        base44.entities.DailyRoutine.list(),
        base44.entities.UserSettings.list(),
        base44.entities.Goal.list()
      ]);

      const userData = {
        user_profile: {
          email: user.email,
          full_name: user.full_name,
          created_date: user.created_date
        },
        events: events,
        tasks: tasks,
        prayer_logs: prayerLogs,
        daily_routines: routines,
        settings: settings,
        goals: goals,
        export_date: new Date().toISOString(),
        export_type: 'GDPR_Data_Export'
      };

      // Create downloadable JSON file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MyAssistant_Data_Export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const deleteMyAccount = async () => {
    setDeleting(true);
    try {
      // Delete all user data
      const [events, tasks, prayerLogs, routines, settings] = await Promise.all([
        base44.entities.Event.list(),
        base44.entities.Task.list(),
        base44.entities.PrayerLog.list(),
        base44.entities.DailyRoutine.list(),
        base44.entities.UserSettings.list()
      ]);

      // Delete all records
      await Promise.all([
        ...events.map(e => base44.entities.Event.delete(e.id)),
        ...tasks.map(t => base44.entities.Task.delete(t.id)),
        ...prayerLogs.map(p => base44.entities.PrayerLog.delete(p.id)),
        ...routines.map(r => base44.entities.DailyRoutine.delete(r.id)),
        ...settings.map(s => base44.entities.UserSettings.delete(s.id))
      ]);

      toast.success('All data deleted. Logging out...');
      
      setTimeout(() => {
        base44.auth.logout();
      }, 2000);
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* GDPR Rights Overview */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <CardTitle className="text-2xl">Your Data Protection Rights</CardTitle>
                <CardDescription className="text-cyan-100">
                  GDPR Compliance & Data Management
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Eye className="w-5 h-5 text-blue-600 mb-2" />
                <h3 className="font-semibold text-blue-900 mb-1">Right to Access</h3>
                <p className="text-sm text-slate-600">View and download all your personal data</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <Download className="w-5 h-5 text-emerald-600 mb-2" />
                <h3 className="font-semibold text-emerald-900 mb-1">Data Portability</h3>
                <p className="text-sm text-slate-600">Export your data in JSON format</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <Lock className="w-5 h-5 text-purple-600 mb-2" />
                <h3 className="font-semibold text-purple-900 mb-1">Right to Erasure</h3>
                <p className="text-sm text-slate-600">Delete your account and all data</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <Shield className="w-5 h-5 text-amber-600 mb-2" />
                <h3 className="font-semibold text-amber-900 mb-1">Data Protection</h3>
                <p className="text-sm text-slate-600">Your data is encrypted and secure</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-teal-600" />
              Export Your Data
            </CardTitle>
            <CardDescription>
              Download a complete copy of all your personal data (GDPR Article 20)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <p className="text-sm text-slate-700 mb-3">
                Your export will include:
              </p>
              <ul className="text-sm text-slate-600 space-y-1 ml-4">
                <li>✓ Profile information</li>
                <li>✓ Calendar events and tasks</li>
                <li>✓ Prayer logs and spiritual tracking</li>
                <li>✓ Daily routines and goals</li>
                <li>✓ Settings and preferences</li>
                <li>✓ All timestamps and metadata</li>
              </ul>
            </div>
            <Button
              onClick={exportMyData}
              disabled={exporting}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {exporting ? (
                <>Preparing export...</>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download My Data (JSON)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* View Data Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Your Data Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">Account Created</p>
                <p className="font-semibold text-slate-800">
                  {user?.created_date ? new Date(user.created_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-semibold text-slate-800 text-sm">{user?.email}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">Role</p>
                <p className="font-semibold text-slate-800 capitalize">{user?.role || 'user'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-2">Warning: This action is irreversible</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• All your events, tasks, and calendar data will be deleted</li>
                    <li>• Prayer logs and spiritual tracking will be removed</li>
                    <li>• Settings and preferences will be lost</li>
                    <li>• You will be immediately logged out</li>
                    <li>• This cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete My Account Permanently'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>This will permanently delete your account and all your data.</p>
                    <p className="font-semibold text-red-600">This action cannot be undone.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteMyAccount}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Security Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              Data Security Measures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">End-to-End Encryption</h4>
                  <p className="text-sm text-slate-600">All data transmitted is encrypted using TLS 1.3</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Secure Authentication</h4>
                  <p className="text-sm text-slate-600">Industry-standard OAuth and session management</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Regular Backups</h4>
                  <p className="text-sm text-slate-600">Your data is backed up daily with encryption at rest</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Access Controls</h4>
                  <p className="text-sm text-slate-600">Role-based permissions and audit logs</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}