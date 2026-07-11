import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminOrganizationsClient from './AdminOrganizationsClient';

export default async function AdminOrganizationsPage() {
  await requirePlatformOwnerPage('/admin/organizations');

  return (
    <Layout>
      <AdminOrganizationsClient />
    </Layout>
  );
}
