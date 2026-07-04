import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminVpDeployClient from './AdminVpDeployClient';

export default async function AdminVpDeployPage() {
  await requirePlatformOwnerPage('/admin/vp-deploy');

  return (
    <Layout>
      <AdminVpDeployClient />
    </Layout>
  );
}
