/**
 * UserAvatar — displays user photo or gradient initials.
 * Used in sidebar, header, and profile sections.
 */
import React from 'react';
import { cn } from '@/lib/utils';

const GRADIENTS = [
  'from-teal-500 to-emerald-600',
  'from-violet-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-blue-500 to-cyan-600',
];

function getGradient(email = '') {
  const code = email.charCodeAt(0) || 0;
  return GRADIENTS[code % GRADIENTS.length];
}

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const sizes = {
    xs:  'w-6 h-6 text-[9px]',
    sm:  'w-8 h-8 text-xs',
    md:  'w-10 h-10 text-sm',
    lg:  'w-14 h-14 text-xl',
    xl:  'w-20 h-20 text-3xl',
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const gradient = getGradient(user?.email);

  if (user?.photo_url) {
    return (
      <img
        src={user.photo_url}
        alt={user.full_name || 'User'}
        className={cn('rounded-xl object-cover flex-shrink-0 ring-2 ring-[#E8B84B]/40', sizes[size], className)}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  return (
    <div className={cn(
      `rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 font-black text-white ring-2 ring-[#E8B84B]/40`,
      sizes[size], className
    )}>
      {initials}
    </div>
  );
}