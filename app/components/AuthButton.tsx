"use client";

import { useState } from 'react';
import { signInWithGoogle, signOut } from '@/lib/auth';
import AuthModal from './AuthModal';
import GoogleSignInButton from './GoogleSignInButton';

interface AuthButtonProps {
  user: { email?: string } | null;
  variant?: 'pill' | 'menu';
  nextPath?: string;
}

export default function AuthButton({ user, variant = 'pill', nextPath = '/pricing' }: AuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(nextPath);
    } catch {
      setLoading(false);
    }
  };

  if (user) {
    if (variant === 'menu') {
      return (
        <div className="px-3 py-2 border-t border-[var(--border)]">
          <p className="text-xs text-nisk-muted truncate mb-2">{user.email}</p>
          <button
            onClick={() => signOut()}
            className="w-full text-left text-sm text-gray-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
          >
            Sign Out
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-nisk-muted hidden sm:inline truncate max-w-[120px]">
          {user.email?.split('@')[0]}
        </span>
        <button
          onClick={() => signOut()}
          className="text-xs bg-[var(--card-bg)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] px-3 py-1.5 rounded-full transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <>
        <div className="px-3 py-2 border-t border-[var(--border)]">
          <GoogleSignInButton
            onClick={handleSignIn}
            loading={loading}
            label="Sign In with Google"
            className="text-sm py-2.5 rounded-lg"
          />
          <button
            onClick={() => setModalOpen(true)}
            className="w-full mt-2 text-center text-xs text-[var(--primary)] hover:underline"
          >
            More sign-in options
          </button>
        </div>
        <AuthModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          nextPath={nextPath}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="text-xs bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-3 py-1.5 rounded-full transition-colors"
      >
        Sign In / Sign Up
      </button>
      <AuthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        nextPath={nextPath}
      />
    </>
  );
}
