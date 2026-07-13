import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
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
import AccountDeletionDialog from '@/components/profile/AccountDeletionDialog';
import ConsentPreferencesPanel from '@/components/legal/ConsentPreferencesPanel';
import { supabase } from '@/api/base44Client';

export default function DataProtectionPage() {
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const exportMyData = async () => {
    setExporting(true);
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${apiBase}/api/vagus-planner/gdpr/export`, {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Export failed');
      }
      const userData = await res.json();
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VagusPlanner_Data_Export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <CardTitle className="text-2xl">Your Data Protection Rights</CardTitle>
                <CardDescription className="text-cyan-100">
                  [LEGAL REVIEW NEEDED] Infrastructure for access, portability, consent, and erasure
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Eye className="w-5 h-5 text-blue-600 mb-2" />
                <h3 className="font-semibold text-blue-900 mb-1">Right to Access</h3>
                <p className="text-sm text-slate-600">View and download your personal data</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <Download className="w-5 h-5 text-emerald-600 mb-2" />
                <h3 className="font-semibold text-emerald-900 mb-1">Data Portability</h3>
                <p className="text-sm text-slate-600">Export JSON across known Vagus Planner tables</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <Lock className="w-5 h-5 text-purple-600 mb-2" />
                <h3 className="font-semibold text-purple-900 mb-1">Right to Erasure</h3>
                <p className="text-sm text-slate-600">Delete your account and firstparty.vp_* data</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <Shield className="w-5 h-5 text-amber-600 mb-2" />
                <h3 className="font-semibold text-amber-900 mb-1">Consent controls</h3>
                <p className="text-sm text-slate-600">Withdraw Article 9 AI processing consents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <ConsentPreferencesPanel userEmail={user?.email} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-teal-600" />
              Export Your Data
            </CardTitle>
            <CardDescription>
              Complete JSON export of known personal data stores (Article 20 infrastructure)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <p className="text-sm text-slate-700 mb-3">Your export includes (where present):</p>
              <ul className="text-sm text-slate-600 space-y-1 ml-4">
                <li>✓ Profile + consent records</li>
                <li>✓ Calendar events, tasks, goals, holidays</li>
                <li>✓ Prayer logs, hadith SRS, reflections, chats</li>
                <li>✓ Expenses, notifications, reminders, device tokens</li>
                <li>✓ Live location history, billing metadata (Stripe IDs)</li>
                <li>✓ Upload object paths (binaries not embedded)</li>
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

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated Vagus Planner data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-2">Warning: This action is irreversible</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• All firstparty.vp_* personal rows for your user are deleted immediately</li>
                    <li>• Uploads under your storage prefix are removed</li>
                    <li>• Auth account is deleted after purge</li>
                    <li>• Immediate delete satisfies the policy “within 30 days” outer bound</li>
                  </ul>
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Delete My Account Permanently
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Continue to confirmation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be asked to type your email and DELETE to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => setShowDeleteDialog(true)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

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
                  <h4 className="font-semibold text-slate-800 mb-1">Encryption in transit</h4>
                  <p className="text-sm text-slate-600">[LEGAL REVIEW NEEDED] Confirm security claims before publishing.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AccountDeletionDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        userEmail={user?.email}
      />
    </div>
  );
}
