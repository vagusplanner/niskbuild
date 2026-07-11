import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import Layout from '@/app/components/Layout';
import AdminCustomDomainsClient from '@/app/admin/custom-domains/AdminCustomDomainsClient';

export default async function AdminCustomDomainsPage() {
  await requirePlatformOwnerPage('/admin/custom-domains');

  return (
    <Layout>
      <AdminCustomDomainsClient />
    </Layout>
  );
}
