import React from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, LogOut, KeyRound, Info } from 'lucide-react';
import TwoFactorAuth from '@/components/settings/TwoFactorAuth';

/**
 * Security tab: password reset guidance, sign-out, and 2FA overview.
 */
export default function AccountSecurityPanel() {
  const handleChangePassword = () => {
    // Sign out so the user can use Forgot Password on the login page.
    base44.auth.logout();
  };

  const handleLogout = () => {
    base44.auth.logout();
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
                Sign out, then click <strong>&quot;Forgot Password&quot;</strong> on the login page.
                You&apos;ll receive a reset link by email within a few minutes.
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
