import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminAppImportClient from './AdminAppImportClient';

export default async function AdminAppImportPage() {
  await requirePlatformOwnerPage('/admin/apps/import');

  return (
    <Layout>
      <AdminAppImportClient />
    </Layout>
  );
}
