import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminStatusClient from './AdminStatusClient';

export default async function AdminStatusPage() {
  await requirePlatformOwnerPage('/admin/status');

  return (
    <Layout>
      <AdminStatusClient />
    </Layout>
  );
}
