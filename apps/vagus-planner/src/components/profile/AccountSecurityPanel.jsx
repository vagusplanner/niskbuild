import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, LogOut, KeyRound, Info } from 'lucide-react';
import TwoFactorAuth from '@/components/settings/TwoFactorAuth';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { requestVpPasswordReset } from '@/lib/vp-password-reset';

/**
 * Security tab: password reset email, sign-out, and 2FA overview.
 */
export default function AccountSecurityPanel() {
  const { logout, user } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);

  const handleChangePassword = async () => {
    const email = user?.email;
    if (!email) {
      toast.error('No email on this account. Sign out and use Forgot password on the login page.');
      return;
    }
    setSendingReset(true);
    try {
      await requestVpPasswordReset(email);
      toast.success('Password reset email sent. Check your inbox for a Vagus Planner link.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send reset email');
    } finally {
      setSendingReset(false);
    }
  };

  const handleLogout = () => {
    void logout();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="w-5 h-5 text-teal-600" />
            Password &amp; Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                How to change your password
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">
                Tap <strong>Send reset email</strong> below. Open the Vagus Planner link in the
                email and choose a new password. You can also use{' '}
                <strong>Forgot password?</strong> on the sign-in page.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex-shrink-0">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Reset Password</p>
                <p className="text-xs text-slate-500 truncate">
                  Email a reset link to {user?.email || 'your account'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              variant="outline"
              size="sm"
              disabled={sendingReset}
              className="flex-shrink-0"
            >
              {sendingReset ? 'Sending…' : 'Send reset email'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <LogOut className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Sign Out</p>
                <p className="text-xs text-slate-500">Log out of Vagus Planner on this device</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 no-select"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          Two-factor &amp; protection
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Account safety overview, two-factor guidance, and recovery references.
        </p>
        <TwoFactorAuth />
      </div>
    </div>
  );
}
