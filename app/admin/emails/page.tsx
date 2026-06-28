import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminEmailsClient from './AdminEmailsClient';

export default async function AdminEmailsPage() {
  await requirePlatformOwnerPage('/admin/emails');

  return (
    <Layout>
      <AdminEmailsClient />
    </Layout>
  );
}
