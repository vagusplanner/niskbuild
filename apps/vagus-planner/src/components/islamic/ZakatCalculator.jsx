/**
 * Legacy ZakatCalculator — now the canonical Islam Zakat hub.
 * Calendar scheduling lives under Give → Schedule Zakat on calendar.
 */
import ZakatHub from '@/components/zakat/ZakatHub';

export default function ZakatCalculator() {
  return <ZakatHub defaultTab="calculate" />;
}
