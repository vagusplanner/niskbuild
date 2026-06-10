"use client";

import { useState } from 'react';

interface PhoneVerificationProps {
  onVerified: () => void;
}

export default function PhoneVerification({ onVerified }: PhoneVerificationProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const sendCode = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/verify/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.skipped) {
        onVerified();
        return;
      }
      setStep('code');
      setMessage('Code sent! Check your SMS.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/verify/phone/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onVerified();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-nisk-card border border-amber-500/30 rounded-xl p-5 mb-6">
      <h3 className="text-white font-semibold mb-1">Verify your phone</h3>
      <p className="text-sm text-nisk-muted mb-4">
        Enter your number to receive a 6-digit SMS code. Required for free Sandbox accounts.
      </p>
      {step === 'phone' ? (
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            className="flex-1 bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm"
          />
          <button
            type="button"
            onClick={sendCode}
            disabled={loading || phone.length < 8}
            className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Send code
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              className="flex-1 bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              type="button"
              onClick={confirmCode}
              disabled={loading || code.length < 4}
              className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              Verify
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="text-xs text-nisk-muted hover:text-white"
          >
            ← Change phone number
          </button>
        </div>
      )}
      {message && (
        <p
          className={`text-xs mt-2 ${
            message.includes('sent') || message.includes('verified')
              ? 'text-[var(--success)]'
              : 'text-[var(--error)]'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
