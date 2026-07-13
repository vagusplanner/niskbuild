/**
 * Vagus Planner — legal / Article 9 consent dialog.
 * Copy marked [LEGAL REVIEW NEEDED] is placeholder infrastructure only.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText, Cookie, Heart, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LegalConsentFlow({ isOpen, onAccept, onDecline }) {
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    cookies: false,
    age: false,
    art9Religious: false,
    art9Health: false,
  });
  const [dateOfBirth, setDateOfBirth] = useState('');

  const requiredOk =
    consents.terms && consents.privacy && consents.cookies && consents.age && Boolean(dateOfBirth);

  const underMinimumAge = (() => {
    if (!dateOfBirth) return false;
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
    // [LEGAL REVIEW NEEDED] Threshold currently coded as 13 — confirm for each market.
    return age < 13;
  })();

  const handleAccept = () => {
    if (!requiredOk || underMinimumAge) return;
    onAccept({
      terms_accepted: consents.terms,
      privacy_accepted: consents.privacy,
      cookies_essential_accepted: consents.cookies,
      age_confirmed: consents.age,
      date_of_birth: dateOfBirth || null,
      art9_religious_accepted: consents.art9Religious,
      art9_health_accepted: consents.art9Health,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDecline?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] z-[120]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-teal-600" />
            Welcome to Vagus Planner
          </DialogTitle>
          <DialogDescription>
            [LEGAL REVIEW NEEDED] Please review and accept the following before continuing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Age + DOB */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Checkbox
                id="age"
                checked={consents.age}
                onCheckedChange={(checked) => setConsents({ ...consents, age: Boolean(checked) })}
                className="mt-1"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <Label htmlFor="age" className="cursor-pointer font-semibold text-slate-800">
                    Age confirmation *
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    [LEGAL REVIEW NEEDED] I confirm that I meet the minimum age required to use this
                    service (currently drafted as 13+) or have verified parental/guardian consent
                    where required.
                  </p>
                </div>
                <div>
                  <Label htmlFor="dob" className="text-sm font-medium text-slate-700">
                    Date of birth * (self-attested — not identity-verified)
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="mt-1 max-w-xs"
                    max={new Date().toISOString().slice(0, 10)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    [LEGAL REVIEW NEEDED] Collecting DOB for age gating only. Confirm retention,
                    lawful basis, and whether under-age users must be blocked in product logic.
                  </p>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Checkbox
                id="terms"
                checked={consents.terms}
                onCheckedChange={(checked) => setConsents({ ...consents, terms: Boolean(checked) })}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="terms" className="cursor-pointer font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Terms of Service *
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  [LEGAL REVIEW NEEDED] I have read and agree to the{' '}
                  <Link to={createPageUrl('TermsOfService')} target="_blank" className="text-purple-600 hover:underline font-medium">
                    Terms of Service
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* Privacy */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Checkbox
                id="privacy"
                checked={consents.privacy}
                onCheckedChange={(checked) => setConsents({ ...consents, privacy: Boolean(checked) })}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="privacy" className="cursor-pointer font-semibold text-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Privacy Policy *
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  [LEGAL REVIEW NEEDED] I understand how personal data is collected and used as
                  described in the{' '}
                  <Link to={createPageUrl('PrivacyPolicy')} target="_blank" className="text-blue-600 hover:underline font-medium">
                    Privacy Policy
                  </Link>
                  , and I consent to processing necessary to provide the service.
                </p>
              </div>
            </div>

            {/* Cookies */}
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <Checkbox
                id="cookies"
                checked={consents.cookies}
                onCheckedChange={(checked) => setConsents({ ...consents, cookies: Boolean(checked) })}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="cookies" className="cursor-pointer font-semibold text-slate-800 flex items-center gap-2">
                  <Cookie className="w-4 h-4 text-emerald-600" />
                  Essential cookies *
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  [LEGAL REVIEW NEEDED] I accept essential cookies required for authentication and
                  core app functionality. Non-essential analytics cookies (if enabled later) will
                  require a separate choice.
                </p>
              </div>
            </div>

            {/* Art. 9 — Religious (SEPARATE, optional) */}
            <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-300">
              <Checkbox
                id="art9-religious"
                checked={consents.art9Religious}
                onCheckedChange={(checked) =>
                  setConsents({ ...consents, art9Religious: Boolean(checked) })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="art9-religious" className="cursor-pointer font-semibold text-slate-800 flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  Special category data — religious practice (optional, separate)
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  [LEGAL REVIEW NEEDED] Explicit consent for processing special-category data
                  related to religious practice (for example prayer logs, Islamic edition
                  preferences, and AI features that use that data). This is separate from general
                  Terms/Privacy acceptance. You can withdraw this later in Account → Privacy &amp;
                  Consent. Declining may limit Islamic AI insights while core prayer-time tools that
                  do not require AI may still work.
                </p>
              </div>
            </div>

            {/* Art. 9 — Health (SEPARATE, optional) */}
            <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-lg border-2 border-rose-300">
              <Checkbox
                id="art9-health"
                checked={consents.art9Health}
                onCheckedChange={(checked) =>
                  setConsents({ ...consents, art9Health: Boolean(checked) })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="art9-health" className="cursor-pointer font-semibold text-slate-800 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-600" />
                  Special category data — health / wellness (optional, separate)
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  [LEGAL REVIEW NEEDED] Explicit consent for processing special-category health data
                  you choose to enter (for example period/hayd, mood, sleep, or wellness logs) and
                  for AI features that analyse that data. Separate from Terms/Privacy. Withdraw
                  anytime in Account → Privacy &amp; Consent. Declining blocks health AI features
                  that would send this data to our AI processor.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-2">Your data rights</h4>
              <p className="text-sm text-slate-600 mb-2">
                [LEGAL REVIEW NEEDED] You may have rights to access, export, correct, delete, and
                withdraw consent. Use{' '}
                <Link to={createPageUrl('DataProtection')} className="text-teal-600 hover:underline">
                  Data Protection
                </Link>{' '}
                or Account → Privacy &amp; Consent.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onDecline} className="flex-1">
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!requiredOk || underMinimumAge}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            Accept &amp; Continue
          </Button>
        </div>

        {underMinimumAge && (
          <p className="text-xs text-center text-red-600">
            [LEGAL REVIEW NEEDED] Based on the date of birth entered, you appear under the minimum
            age (draft: 13). Account creation cannot continue until legal review defines the correct
            flow.
          </p>
        )}

        {!requiredOk && !underMinimumAge && (
          <p className="text-xs text-center text-red-600">
            Please complete required consents and date of birth to continue
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
