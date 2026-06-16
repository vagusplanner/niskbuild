"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BUILDER_EXPORT_EVENT,
  BUILDER_NEW_PROJECT_EVENT,
} from '@/lib/command-palette-events';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(BUILDER_NEW_PROJECT_EVENT));
        if (pathname !== '/builder') router.push('/builder');
      }
      if (mod && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(BUILDER_EXPORT_EVENT));
      }
      if (mod && e.key === ',') {
        e.preventDefault();
        router.push('/dashboard/settings');
      }
      if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        router.push('/dashboard/settings?tab=billing');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  return null;
}
