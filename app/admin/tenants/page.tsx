import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminTenantsClient from './AdminTenantsClient';

export default async function AdminTenantsPage() {
  await requirePlatformOwnerPage('/admin/tenants');

  return (
    <Layout>
      <AdminTenantsClient />
    </Layout>
  );
}
