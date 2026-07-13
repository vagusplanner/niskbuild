import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * Deletes via deleteUserAccount → /api/account/delete, which now purges all
 * firstparty.vp_* tables + uploads before removing auth.
 */
export default function AccountDeletionDialog({ isOpen, onClose, userEmail }) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const CONFIRM_PHRASE = 'DELETE';

  const handleDelete = async () => {
    if (confirmText !== CONFIRM_PHRASE) return;
    if (!userEmail || emailConfirm.trim().toLowerCase() !== userEmail.trim().toLowerCase()) {
      toast.error('Type your account email to confirm deletion');
      return;
    }
    setIsDeleting(true);
    try {
      const result = await base44.functions.invoke('deleteUserAccount', {});
      const payload = result?.data ?? result;
      if (payload && payload.success === false) {
        throw new Error(payload.error || payload.message || 'Delete failed');
      }

      toast.success(t('common.success') || 'Account deleted');
      setTimeout(async () => {
        try {
          await base44.auth.signOut();
        } catch {
          // ignore
        }
        window.location.href = '/';
      }, 1200);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || t('errors.generic') || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-[201] pointer-events-none"
          >
            <div
              className="pointer-events-auto bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:max-w-md mx-auto p-6 pb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5 md:hidden" />

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-950 rounded-xl">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {t('profile.deleteAccount')}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-5">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                    This permanently deletes your Vagus Planner data
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    Calendar, tasks, goals, expenses, journals, chats, prayer logs, location
                    history, push tokens, uploads, and account access for{' '}
                    <strong>{userEmail}</strong>. Deletion runs immediately (satisfies the privacy
                    policy “within 30 days” outer bound).
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Type your email
                  </Label>
                  <Input
                    value={emailConfirm}
                    onChange={(e) => setEmailConfirm(e.target.value)}
                    placeholder={userEmail || 'you@example.com'}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('common.confirm')}:{' '}
                    <span className="font-mono font-bold text-red-600">{CONFIRM_PHRASE}</span>
                  </Label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    autoCapitalize="characters"
                    className="font-mono border-red-300 focus:ring-red-400"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1 min-h-[48px]">
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={
                    confirmText !== CONFIRM_PHRASE ||
                    isDeleting ||
                    !userEmail ||
                    emailConfirm.trim().toLowerCase() !== userEmail.trim().toLowerCase()
                  }
                  className="flex-1 min-h-[48px] bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
                >
                  {isDeleting ? t('common.loading') : t('profile.deleteAccount')}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
