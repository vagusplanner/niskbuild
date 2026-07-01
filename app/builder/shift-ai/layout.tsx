import type { Metadata } from 'next';
import ShiftAiLayoutGate from '@/app/builder/shift-ai/ShiftAiLayoutGate';
import './shift-ai.css';

export const metadata: Metadata = {
  title: {
    default: 'Shift Learning',
    template: '%s · Shift Learning',
  },
  robots: 'noindex',
};

export default function ShiftAiLayout({ children }: { children: React.ReactNode }) {
  return <ShiftAiLayoutGate>{children}</ShiftAiLayoutGate>;
}
