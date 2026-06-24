import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminAppsClient from './AdminAppsClient';

export default async function AdminAppsPage() {
  await requirePlatformOwnerPage('/admin/apps');

  return (
    <Layout>
      <AdminAppsClient />
    </Layout>
  );
}
