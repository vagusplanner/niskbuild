import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Universal back button — navigates to `to` if provided, else browser back.
 * Usage: <BackButton /> or <BackButton to="/Dashboard" label="Home" />
 */
export default function BackButton({ to, label = 'Back', className = '' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all min-h-[44px]',
        'hover:bg-[#D4E0EC] dark:hover:bg-[#1B2A4A]',
        className
      )}
      style={{ color: '#1D6FB8' }}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}