import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminSocialClient from './AdminSocialClient';

export default async function AdminSocialPage() {
  await requirePlatformOwnerPage('/admin/social');

  return (
    <Layout>
      <AdminSocialClient />
    </Layout>
  );
}
