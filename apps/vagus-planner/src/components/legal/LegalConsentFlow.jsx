import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LegalConsentFlow({ isOpen, onAccept, onDecline }) {
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    cookies: false,
    age: false
  });

  const allConsentsGiven = Object.values(consents).every(v => v);

  const handleAccept = () => {
    if (allConsentsGiven) {
      onAccept(consents);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="max-w-2xl max-h-[90vh] z-[120]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-teal-600" />
            Welcome to MyAssistant
          </DialogTitle>
          <DialogDescription>
            Please review and accept our terms to continue
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Age Verification */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Checkbox
                id="age"
                checked={consents.age}
                onCheckedChange={(checked) => setConsents({ ...consents, age: checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="age" className="cursor-pointer font-semibold text-slate-800">
                  Age Confirmation *
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  I confirm that I am at least 13 years of age or have parental consent to use this service.
                </p>
              </div>
            </div>

            {/* Terms of Service */}
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Checkbox
                id="terms"
                checked={consents.terms}
                onCheckedChange={(checked) => setConsents({ ...consents, terms: checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="terms" className="cursor-pointer font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Terms of Service *
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  I have read and agree to the{' '}
                  <Link to={createPageUrl('TermsOfService')} target="_blank" className="text-purple-600 hover:underline font-medium">
                    Terms of Service
                  </Link>
                  , including user responsibilities, prohibited conduct, and service limitations.
                </p>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Checkbox
                id="privacy"
                checked={consents.privacy}
                onCheckedChange={(checked) => setConsents({ ...consents, privacy: checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="privacy" className="cursor-pointer font-semibold text-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Privacy Policy *
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  I understand how my data is collected, used, and protected as described in the{' '}
                  <Link to={createPageUrl('PrivacyPolicy')} target="_blank" className="text-blue-600 hover:underline font-medium">
                    Privacy Policy
                  </Link>
                  . I consent to data processing for service functionality.
                </p>
              </div>
            </div>

            {/* Cookies */}
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <Checkbox
                id="cookies"
                checked={consents.cookies}
                onCheckedChange={(checked) => setConsents({ ...consents, cookies: checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="cookies" className="cursor-pointer font-semibold text-slate-800 flex items-center gap-2">
                  <Cookie className="w-4 h-4 text-emerald-600" />
                  Cookie Consent *
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  I accept the use of essential cookies for authentication and app functionality. You can manage preferences in Settings.
                </p>
              </div>
            </div>

            {/* Data Rights Information */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-2">Your Data Rights (GDPR)</h4>
              <p className="text-sm text-slate-600 mb-2">You have the right to:</p>
              <ul className="text-sm text-slate-600 space-y-1 ml-4">
                <li>• Access and export your data</li>
                <li>• Correct inaccurate information</li>
                <li>• Delete your account and data</li>
                <li>• Withdraw consent at any time</li>
              </ul>
              <p className="text-xs text-slate-500 mt-2">
                Visit{' '}
                <Link to={createPageUrl('DataProtection')} className="text-teal-600 hover:underline">
                  Data Protection
                </Link>
                {' '}page to manage your data.
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onDecline}
            className="flex-1"
          >
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!allConsentsGiven}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            Accept & Continue
          </Button>
        </div>

        {!allConsentsGiven && (
          <p className="text-xs text-center text-red-600">
            Please accept all required consents to continue
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}