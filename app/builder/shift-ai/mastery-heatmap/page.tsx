import { redirect } from 'next/navigation';

export default function ShiftAiMasteryHeatmapPage() {
  redirect('/builder/shift-ai/analytics#study-streak');
}

export async function generateMetadata() {
  return { title: 'Study Streak · Shift AI', robots: 'noindex' };
}
