import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NiskBuild — Own your code forever',
  description:
    "Describe your app. Get real code. Keep it forever. NiskBuild's AI writes working apps from a plain-English prompt — then hands you the actual source code.",
};

export default function LandingV2Layout({ children }: { children: React.ReactNode }) {
  return children;
}
