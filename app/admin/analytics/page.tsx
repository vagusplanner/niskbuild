import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import Layout from '@/app/components/Layout';
import AdminAnalyticsClient from '@/app/admin/analytics/AdminAnalyticsClient';

export default async function AdminAnalyticsPage() {
  await requirePlatformOwnerPage('/admin/analytics');

  return (
    <Layout>
      <AdminAnalyticsClient />
    </Layout>
  );
}
