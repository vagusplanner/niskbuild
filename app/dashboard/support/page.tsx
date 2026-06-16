'use client';

import Layout from '@/app/components/Layout';
import SupportWorkspace from '@/app/components/SupportWorkspace';

export default function DashboardSupportPage() {
  return (
    <Layout showFooter={false}>
      <SupportWorkspace />
    </Layout>
  );
}
