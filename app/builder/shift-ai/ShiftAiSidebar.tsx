'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, GraduationCap, Gamepad2, Home, Layers, LogOut, MessageCircle, CalendarDays } from 'lucide-react';
import { signOut } from '@/lib/auth';

const NAV_GROUPS = [
  {
    label: 'Home',
    items: [
      { href: '/builder/shift-ai/dashboard', icon: Home, label: 'Dashboard', emoji: '🏠' },
      { href: '/builder/shift-ai/planner', icon: CalendarDays, label: 'Planner', emoji: '📅' },
    ],
  },
  {
    label: 'Study',
    items: [
      {
        href: '/builder/shift-ai/assistant',
        icon: MessageCircle,
        label: 'AI Tutor Chat',
        emoji: '🤖',
      },
      {
        href: '/builder/shift-ai/flashcards',
        icon: Layers,
        label: 'Smart Flashcards',
        emoji: '🃏',
      },
    ],
  },
  {
    label: 'Practise',
    items: [
      {
        href: '/builder/shift-ai/arcade',
        icon: Gamepad2,
        label: 'Quiz Arcade ⚡',
        emoji: '🎮',
      },
    ],
  },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href.endsWith('/dashboard')) {
    return pathname === '/builder/shift-ai' || pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ShiftAiSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login?next=/builder/shift-ai/dashboard';
  };

  return (
    <aside className="sa-sidebar flex h-full w-60 flex-shrink-0 flex-col text-white">
      <div className="flex-shrink-0 border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="block text-base font-extrabold leading-none tracking-tight">
              Shift Learning
            </span>
            <span className="mt-0.5 block text-[10px] text-blue-200/70">Power Your Study</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`sa-sidebar-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${
                      active ? 'sa-sidebar-item-active shadow-sm' : ''
                    }`}
                  >
                    <span className="w-5 text-center text-base leading-none">{item.emoji}</span>
                    <span className="truncate">{item.label}</span>
                    {active ? (
                      <ChevronRight className="ml-auto h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 space-y-0.5 border-t border-white/10 px-2 py-3">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="sa-sidebar-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium"
        >
          <LogOut className="ml-0.5 h-4 w-4 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
