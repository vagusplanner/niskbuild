import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import Layout from '@/app/components/Layout';
import AdminDemandAnalyticsClient from '@/app/admin/demand-analytics/AdminDemandAnalyticsClient';

export default async function AdminDemandAnalyticsPage() {
  await requirePlatformOwnerPage('/admin/demand-analytics');

  return (
    <Layout>
      <AdminDemandAnalyticsClient />
    </Layout>
  );
}
