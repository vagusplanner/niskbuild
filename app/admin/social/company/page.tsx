import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminCompanySocialClient from './AdminCompanySocialClient';

export default async function AdminCompanySocialPage() {
  await requirePlatformOwnerPage('/admin/social/company');

  return (
    <Layout>
      <AdminCompanySocialClient />
    </Layout>
  );
}
