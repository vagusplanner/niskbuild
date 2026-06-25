"use client";

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

const DEVICES: { id: PreviewDevice; label: string; icon: string }[] = [
  { id: 'desktop', label: 'Desktop', icon: '🖥' },
  { id: 'tablet', label: 'Tablet', icon: '📱' },
  { id: 'mobile', label: 'Mobile', icon: '📲' },
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
      {DEVICES.map((d) => (
        <button
          key={d.id}
          type="button"
          title={d.label}
          aria-label={d.label}
          aria-pressed={device === d.id}
          onClick={() => onChange(d.id)}
          className={`px-2 py-1 text-sm rounded-md transition-colors ${
            device === d.id
              ? 'bg-[var(--surface-elevated)] text-[var(--copper-melt)] shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          {d.icon}
        </button>
      ))}
    </div>
  );
}
