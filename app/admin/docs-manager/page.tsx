import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import Layout from '@/app/components/Layout';
import AdminDocsManagerClient from '@/app/admin/docs-manager/AdminDocsManagerClient';

export default async function AdminDocsManagerPage() {
  await requirePlatformOwnerPage('/admin/docs-manager');

  return (
    <Layout>
      <AdminDocsManagerClient />
    </Layout>
  );
}
