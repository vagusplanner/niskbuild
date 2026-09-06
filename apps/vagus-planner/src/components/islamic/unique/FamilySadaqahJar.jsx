/**
 * Legacy Family Sadaqah Jar — now the merged Giving Plan (pot + recurring).
 * Persistence bug fixed in GivingPlan (local-first + correct RQ v5 invalidate).
 */
import GivingPlan from '@/components/zakat/GivingPlan';

export default function FamilySadaqahJar() {
  return <GivingPlan />;
}
