import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminRevenueClient from './AdminRevenueClient';

export default async function AdminRevenuePage() {
  await requirePlatformOwnerPage('/admin/revenue');

  return (
    <Layout>
      <AdminRevenueClient />
    </Layout>
  );
}
