/**
 * Legacy module — redirects to the canonical Zakat hub calculator.
 * Old 87.48g/612.36g thresholds are retired; see lib/zakat-engine.js.
 */
import ZakatHub from '@/components/zakat/ZakatHub';

export default function ZakatCalculatorModule() {
  return <ZakatHub defaultTab="calculate" showAdvancedByDefault />;
}
