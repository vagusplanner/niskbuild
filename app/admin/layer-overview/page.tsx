import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminLayerOverview from './AdminLayerOverview';

export default async function LayerOverviewPage() {
  await requirePlatformOwnerPage('/admin/layer-overview');

  return (
    <Layout>
      <AdminLayerOverview />
    </Layout>
  );
}
