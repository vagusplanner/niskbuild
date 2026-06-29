'use client';

import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/app/components/Layout';

const LINKEDIN_POST = `I've been building client apps faster with NiskBuild — describe what you want in plain language and get a working preview in minutes. Great for freelancers and agencies shipping web apps, PWAs, and more.

https://niskbuild.com`;

export default function NpsPromoterPage() {
  const [copied, setCopied] = useState(false);

  const copyPost = async () => {
    try {
      await navigator.clipboard.writeText(LINKEDIN_POST);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const linkedInShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://niskbuild.com')}`;

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Thank you!</h1>
        <p className="text-nisk-muted mb-6">
          Would you share NiskBuild on LinkedIn? Here is a pre-written post you can paste:
        </p>
        <textarea
          readOnly
          value={LINKEDIN_POST}
          rows={6}
          className="w-full mb-4 rounded-xl border border-nisk bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void copyPost()}
            className="btn-secondary px-4 py-2 rounded-xl text-sm font-semibold"
          >
            {copied ? 'Copied!' : 'Copy post'}
          </button>
          <a
            href={linkedInShare}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold"
          >
            Share on LinkedIn
          </a>
        </div>
        <p className="mt-8 text-xs text-nisk-muted">
          <Link href="/dashboard" className="text-[var(--copper-melt)] hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </Layout>
  );
}
