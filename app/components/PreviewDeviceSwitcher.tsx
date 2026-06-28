"use client";

import { Monitor, Smartphone, Tablet, type LucideIcon } from 'lucide-react';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

export const PREVIEW_DEVICE_OPTIONS: {
  id: PreviewDevice;
  label: string;
  Icon: LucideIcon;
}[] = [
  { id: 'desktop', label: 'Desktop', Icon: Monitor },
  { id: 'tablet', label: 'Tablet', Icon: Tablet },
  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
];

type PreviewDeviceSwitcherProps = {
  device: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
};

export function previewFrameClassForDevice(device: PreviewDevice): string {
  if (device === 'mobile') {
    return 'absolute top-0 left-1/2 -translate-x-1/2 w-[375px] max-w-full h-full border-x border-nisk shadow-xl';
  }
  if (device === 'tablet') {
    return 'absolute top-0 left-1/2 -translate-x-1/2 w-[768px] max-w-full h-full border-x border-nisk shadow-lg';
  }
  return 'absolute inset-0 w-full h-full';
}

export default function PreviewDeviceSwitcher({ device, onChange }: PreviewDeviceSwitcherProps) {
  return (
    <div
      className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--code-bg)] border border-[var(--border)]"
      role="group"
      aria-label="Preview device size"
    >
      {PREVIEW_DEVICE_OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={device === id}
          onClick={() => onChange(id)}
          className={`p-1.5 rounded-md transition-colors ${
            device === id
              ? 'bg-[var(--surface-elevated)] text-[var(--copper-melt)] shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden />
        </button>
      ))}
    </div>
  );
}
