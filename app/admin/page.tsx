import Layout from '@/app/components/Layout';
import { fetchLegacyAdminDashboard } from '@/lib/admin/legacy-dashboard';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboardPage() {
  await requirePlatformOwnerPage('/admin');
  const data = await fetchLegacyAdminDashboard();

  return (
    <Layout>
      <AdminDashboardClient data={data} />
    </Layout>
  );
}
