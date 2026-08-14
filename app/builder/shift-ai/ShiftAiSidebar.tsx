'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Camera,
  ChevronRight,
  Gamepad2,
  GraduationCap,
  Home,
  Layers,
  LogOut,
  Map,
  MessageCircle,
  Mic,
  PenLine,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { signOut } from '@/lib/auth';

const NAV_GROUPS = [
  {
    groupKey: 'home',
    items: [
      { href: '/builder/shift-ai/dashboard', icon: Home, itemKey: 'dashboard', emoji: '🏠' },
      { href: '/builder/shift-ai/planner', icon: CalendarDays, itemKey: 'planner', emoji: '📅' },
      { href: '/builder/shift-ai/settings', icon: Settings, itemKey: 'settings', emoji: '⚙️' },
    ],
  },
  {
    groupKey: 'study',
    items: [
      {
        href: '/builder/shift-ai/assistant',
        icon: MessageCircle,
        itemKey: 'tutor',
        emoji: '🤖',
      },
      {
        href: '/builder/shift-ai/flashcards',
        icon: Layers,
        itemKey: 'flashcards',
        emoji: '🃏',
      },
    ],
  },
  {
    groupKey: 'studyTools',
    items: [
      {
        href: '/builder/shift-ai/homework',
        icon: Camera,
        itemKey: 'homework',
        emoji: '📸',
      },
      {
        href: '/builder/shift-ai/curriculum-packs',
        icon: BookOpen,
        itemKey: 'curriculumPacks',
        emoji: '📚',
      },
      {
        href: '/builder/shift-ai/voice-buddy',
        icon: Mic,
        itemKey: 'voiceBuddy',
        emoji: '🐥',
      },
      {
        href: '/builder/shift-ai/voice-tutor',
        icon: Mic,
        itemKey: 'voiceTutor',
        emoji: '🎙️',
      },
    ],
  },
  {
    groupKey: 'writingTools',
    items: [
      {
        href: '/builder/shift-ai/essay-marker',
        icon: PenLine,
        itemKey: 'essayMarker',
        emoji: '✍️',
      },
      {
        href: '/builder/shift-ai/essay-workshop',
        icon: PenLine,
        itemKey: 'essayWorkshop',
        emoji: '📝',
      },
      {
        href: '/builder/shift-ai/content-generator',
        icon: Sparkles,
        itemKey: 'contentGenerator',
        emoji: '✨',
      },
    ],
  },
  {
    groupKey: 'track',
    items: [
      {
        href: '/builder/shift-ai/mastery',
        icon: Map,
        itemKey: 'mastery',
        emoji: '🗺️',
      },
      {
        href: '/builder/shift-ai/spec-tracker',
        icon: Target,
        itemKey: 'specTracker',
        emoji: '📋',
      },
    ],
  },
  {
    groupKey: 'insights',
    items: [
      {
        href: '/builder/shift-ai/analytics',
        icon: BarChart3,
        itemKey: 'analytics',
        emoji: '📊',
      },
      {
        href: '/builder/shift-ai/grade-predictor',
        icon: TrendingUp,
        itemKey: 'gradePredictor',
        emoji: '🎯',
      },
    ],
  },
  {
    groupKey: 'collaborate',
    items: [
      {
        href: '/builder/shift-ai/groups',
        icon: Users,
        itemKey: 'groups',
        emoji: '👥',
      },
    ],
  },
  {
    groupKey: 'practise',
    items: [
      {
        href: '/builder/shift-ai/arcade',
        icon: Gamepad2,
        itemKey: 'arcade',
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
  const t = useTranslations('sidebar');
  const tBrand = useTranslations('brand');

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
            <span className="block text-base font-extrabold leading-none tracking-tight rtl:tracking-normal">
              {tBrand('name')}
            </span>
            <span className="mt-0.5 block text-[10px] text-blue-200/70">{tBrand('tagline')}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.groupKey}>
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30 rtl:normal-case rtl:tracking-normal">
              {t(`groups.${group.groupKey}`)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`sa-sidebar-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm font-medium ${
                      active ? 'sa-sidebar-item-active shadow-sm' : ''
                    }`}
                  >
                    <span className="w-5 text-center text-base leading-none">{item.emoji}</span>
                    <span className="truncate">{t(`items.${item.itemKey}`)}</span>
                    {active ? (
                      <ChevronRight className="ms-auto h-3.5 w-3.5 flex-shrink-0 opacity-60 rtl:-scale-x-100" />
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
          className="sa-sidebar-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm font-medium"
        >
          <LogOut className="ms-0.5 h-4 w-4 flex-shrink-0 rtl:-scale-x-100" />
          <span>{t('signOut')}</span>
        </button>
      </div>
    </aside>
  );
}
