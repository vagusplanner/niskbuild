'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { SA } from '@/lib/shift-ai/theme';

/** Password input with show/hide eye toggle (matches shared /login pattern). */
export default function ShiftAiPasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className={`${className ?? SA.input} pe-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-neutral-500 hover:text-neutral-800"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
