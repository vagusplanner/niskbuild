'use client';

import { useParams } from 'next/navigation';
import AppBuilderWorkspace from '@/app/builder/AppBuilderWorkspace';

export default function AppBuilderPage() {
  const params = useParams();
  const appId = typeof params.id === 'string' ? params.id : '';

  return <AppBuilderWorkspace appId={appId} />;
}
