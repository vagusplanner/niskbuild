import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminChurnClient from '@/app/admin/churn/AdminChurnClient';
import Layout from '@/app/components/Layout';

export default async function AdminChurnPage() {
  await requirePlatformOwnerPage('/admin/churn');

  return (
    <Layout showFooter={false}>
      <AdminChurnClient />
    </Layout>
  );
}
