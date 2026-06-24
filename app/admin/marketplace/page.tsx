import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminMarketplaceClient from './AdminMarketplaceClient';

export default async function AdminMarketplacePage() {
  await requirePlatformOwnerPage('/admin/marketplace');

  return (
    <Layout>
      <AdminMarketplaceClient />
    </Layout>
  );
}
