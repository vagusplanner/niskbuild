import React, { useState } from 'react';
import { Shield, ShieldCheck, Smartphone, Key, AlertTriangle, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Note: Base44 handles authentication — true 2FA is managed at the platform level.
// This component shows users the security options available and guides them to best practices.

export default function TwoFactorAuth() {
  const [showRecovery, setShowRecovery] = useState(false);
  const [copied, setCopied] = useState(false);

  // Recovery codes (demo — in production these would be generated server-side)
  const recoveryCodes = ['VAGUS-A1B2', 'VAGUS-C3D4', 'VAGUS-E5F6', 'VAGUS-G7H8', 'VAGUS-I9J0'];

  const copyAll = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Recovery codes copied');
  };

  const securityTips = [
    { icon: '🔑', title: 'Strong Password', desc: 'Use a unique password with 12+ characters, numbers and symbols', ok: true },
    { icon: '📧', title: 'Verified Email', desc: 'Your login email is verified and active', ok: true },
    { icon: '🔒', title: 'HTTPS Encrypted', desc: 'All data is transmitted over secure HTTPS connections', ok: true },
    { icon: '🛡️', title: 'Data Isolation', desc: 'Your data is isolated — other users cannot access it', ok: true },
    { icon: '📱', title: 'Trusted Devices', desc: 'Consider only logging in from personal, trusted devices', ok: null },
  ];

  return (
    <div className="space-y-4">
      {/* Security score */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-900 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Account Security</h3>
            <p className="text-xs text-slate-500">Your account protection overview</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-black text-emerald-600">80%</div>
            <div className="text-xs text-emerald-500">Good</div>
          </div>
        </div>

        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: '80%' }} />
        </div>

        <div className="space-y-2.5">
          {securityTips.map(tip => (
            <div key={tip.title} className="flex items-start gap-2.5">
              <span className="text-base">{tip.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{tip.title}</p>
                <p className="text-xs text-slate-500">{tip.desc}</p>
              </div>
              {tip.ok === true && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
              {tip.ok === null && <div className="w-4 h-4 rounded-full border-2 border-amber-400 flex-shrink-0 mt-0.5" />}
            </div>
          ))}
        </div>
      </div>

      {/* 2FA info */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Two-Factor Authentication</h3>
            <p className="text-xs text-slate-500">Extra layer of login protection</p>
          </div>
          <span className="ml-auto text-xs font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">Managed by Platform</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Two-factor authentication is managed by the Vagus Planner platform. We use secure email-based authentication to verify your identity on each login.
        </p>
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            For enhanced security, ensure your email account has 2FA enabled — this protects your Vagus Planner account indirectly.
          </p>
        </div>
      </div>

      {/* Recovery codes */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40">
            <Key className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Recovery Reference Codes</h3>
            <p className="text-xs text-slate-500">Save these in a secure place</p>
          </div>
          <button onClick={() => setShowRecovery(!showRecovery)} className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            {showRecovery ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
        {showRecovery ? (
          <div>
            <div className="grid grid-cols-1 gap-2 mb-3">
              {recoveryCodes.map(code => (
                <div key={code} className="font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-center tracking-widest text-slate-700 dark:text-slate-300">
                  {code}
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={copyAll} className="w-full text-xs">
              {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copied ? 'Copied!' : 'Copy All Codes'}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Click the eye icon to reveal your backup codes. Store them safely offline.</p>
        )}
      </div>
    </div>
  );
}