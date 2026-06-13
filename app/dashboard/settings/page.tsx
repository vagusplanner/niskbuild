"use client";

import { Suspense } from 'react';
import Layout from '@/app/components/Layout';
import SettingsWorkspace from '@/app/components/SettingsWorkspace';

export default function DashboardSettingsPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        </Layout>
      }
    >
      <Layout>
        <SettingsWorkspace />
      </Layout>
    </Suspense>
  );
}
