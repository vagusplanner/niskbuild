/**
 * Legacy wrapper — wealth math now uses the canonical zakat-engine.
 * Prefer ZakatHub Give tab in the Islam hub; this remains for any leftover imports.
 */
import React from 'react';
import ZakatHub from '@/components/zakat/ZakatHub';

export default function ZakatSadaqaDashboard() {
  return <ZakatHub defaultTab="give" />;
}
