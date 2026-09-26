'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { updatePassword } from '@/lib/auth';
import type { ShiftPlanAccess } from '@/lib/shift-ai/plan-access';
import { SA } from '@/lib/shift-ai/theme';
import { shiftAiAppPath } from '@/lib/supereduc8-host';
import ShiftAiPasswordField from '@/app/components/shift-ai/ShiftAiPasswordField';

type Props = {
  email: string;
  fullName: string;
  studentId: string;
  initialAccess: ShiftPlanAccess;
};

/**
 * Account section for SuperEduc8 Settings.
 * Built now: name, email, password, plan status, billing portal/link, export JSON, delete.
 * Deferred: avatar upload, notification prefs, OAuth connected-accounts UI.
 */
export default function ShiftAiAccountSection({
  email,
  fullName: initialName,
  studentId,
  initialAccess,
}: Props) {
  const [fullName, setFullName] = useState(initialName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const saveName = async () => {
    setNameSaving(true);
    setNameMsg(null);
    try {
      const res = await fetch('/api/shift-ai/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullName: fullName.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not save name');
      setNameMsg('Name saved');
    } catch (err) {
      setNameMsg(err instanceof Error ? err.message : 'Could not save name');
    } finally {
      setNameSaving(false);
    }
  };

  const changePassword = async () => {
    setPwError(null);
    setPwMsg(null);
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPwMsg('Password updated');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setPwSaving(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          returnUrl: `${window.location.origin}${shiftAiAppPath('/settings')}`,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open portal');
      window.location.href = data.url;
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Could not open portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const [planRes, settingsRes] = await Promise.all([
        fetch('/api/shift-ai/plan-access', { credentials: 'include' }),
        fetch('/api/shift-ai/me', { credentials: 'include' }),
      ]);
      const plan = await planRes.json().catch(() => ({}));
      const me = await settingsRes.json().catch(() => ({}));
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              studentId,
              email,
              fullName,
              plan,
              profile: me,
            },
            null,
            2
          ),
        ],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supereduc8-export-${studentId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleteError(null);
    if (deleteEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
      setDeleteError('Type your account email exactly to confirm deletion');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: deleteEmail.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not delete account');
      window.location.href = '/';
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete account');
    } finally {
      setDeleting(false);
    }
  };

  const planLabel = initialAccess.platformOwnerBypass
    ? 'Platform owner'
    : initialAccess.isPaid
      ? initialAccess.plan
      : initialAccess.plan === 'trial'
        ? 'Trial'
        : 'Free';

  return (
    <div className={`${SA.cardPadded} mt-4 space-y-6`}>
      <h2 className={`font-semibold ${SA.text}`}>Account</h2>

      <div className="space-y-2">
        <label className={`block text-xs font-medium ${SA.muted}`}>Display name</label>
        <input
          className={SA.input}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <button
          type="button"
          onClick={() => void saveName()}
          disabled={nameSaving}
          className={SA.btnSecondary}
        >
          {nameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save name
        </button>
        {nameMsg ? <p className={`text-xs ${SA.muted}`}>{nameMsg}</p> : null}
      </div>

      <div className="space-y-1">
        <p className={`text-xs font-medium ${SA.muted}`}>Email</p>
        <p className={`text-sm font-semibold ${SA.text}`}>{email || '—'}</p>
        <p className={`text-xs ${SA.muted}`}>Email changes are not available in-app yet.</p>
      </div>

      <div className="space-y-2">
        <p className={`text-xs font-medium ${SA.muted}`}>Change password</p>
        <ShiftAiPasswordField
          value={newPassword}
          onChange={setNewPassword}
          placeholder="New password"
          autoComplete="new-password"
          minLength={8}
        />
        <ShiftAiPasswordField
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirm new password"
          autoComplete="new-password"
          minLength={8}
        />
        {pwError ? <div className={SA.error}>{pwError}</div> : null}
        {pwMsg ? <div className={SA.success}>{pwMsg}</div> : null}
        <button
          type="button"
          onClick={() => void changePassword()}
          disabled={pwSaving}
          className={SA.btnSecondary}
        >
          {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Update password
        </button>
      </div>

      <div className="space-y-2 border-t border-[var(--sa-navy-100)] pt-4">
        <p className={`text-xs font-medium ${SA.muted}`}>Subscription</p>
        <p className={`text-sm font-semibold capitalize ${SA.text}`}>{planLabel}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={shiftAiAppPath('/billing')} className={SA.btnPrimary}>
            Billing & subscribe
          </Link>
          {initialAccess.isPaid ? (
            <button
              type="button"
              onClick={() => void openPortal()}
              disabled={portalLoading}
              className={SA.btnSecondary}
            >
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Manage in Stripe
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 border-t border-[var(--sa-navy-100)] pt-4">
        <p className={`text-xs font-medium ${SA.muted}`}>Your data</p>
        <button
          type="button"
          onClick={() => void exportData()}
          disabled={exporting}
          className={SA.btnSecondary}
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Download data export (JSON)
        </button>
      </div>

      <div className="space-y-2 border-t border-red-100 pt-4">
        <p className="text-xs font-semibold text-red-700">Delete account</p>
        <p className={`text-xs ${SA.muted}`}>
          Permanently deletes your SuperEduc8 / platform account. Type your email to confirm.
        </p>
        <input
          className={SA.input}
          value={deleteEmail}
          onChange={(e) => setDeleteEmail(e.target.value)}
          placeholder={email}
        />
        {deleteError ? <div className={SA.error}>{deleteError}</div> : null}
        <button
          type="button"
          onClick={() => void deleteAccount()}
          disabled={deleting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Delete my account
        </button>
      </div>
    </div>
  );
}
