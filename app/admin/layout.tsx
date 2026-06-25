import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';

/** All /admin/* routes require platform owner (3-layer admin). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformOwnerPage('/admin/layer-overview');
  return children;
}
