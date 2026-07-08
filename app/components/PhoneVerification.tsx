"use client";

import { useRef, useState } from 'react';

interface PhoneVerificationProps {
  onVerified: () => void;
}

export default function PhoneVerification({ onVerified }: PhoneVerificationProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const verifiedRef = useRef(false);

  const sendCode = async () => {
    if (loading) return;
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
        verifiedRef.current = true;
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
    if (loading || verifiedRef.current) return;

    const normalizedCode = code.replace(/\D/g, '');
    if (normalizedCode.length < 4) {
      setMessage('Enter the full verification code.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/verify/phone/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: normalizedCode, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      verifiedRef.current = true;
      setMessage('Verified! Redirecting…');
      onVerified();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Verification failed');
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendCode();
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void confirmCode();
  };

  return (
    <div className="bg-nisk-card border border-amber-500/30 rounded-xl p-5 mb-6">
      <h3 className="text-white font-semibold mb-1">Verify your phone</h3>
      <p className="text-sm text-nisk-muted mb-4">
        Enter your number to receive a 6-digit SMS code. Required for free Sandbox accounts.
      </p>
      {step === 'phone' ? (
        <form onSubmit={handlePhoneSubmit} className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            className="flex-1 bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm"
          />
          <button
            type="submit"
            disabled={loading || phone.length < 8}
            className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Send code
          </button>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              maxLength={6}
              className="flex-1 bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              type="submit"
              disabled={loading || code.replace(/\D/g, '').length < 4}
              className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setCode('');
              setMessage('');
            }}
            className="text-xs text-nisk-muted hover:text-white"
          >
            ← Change phone number
          </button>
        </form>
      )}
      {message && (
        <p
          className={`text-xs mt-2 ${
            message.includes('sent') ||
            message.includes('verified') ||
            message.includes('Verified') ||
            message.includes('Redirecting')
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
