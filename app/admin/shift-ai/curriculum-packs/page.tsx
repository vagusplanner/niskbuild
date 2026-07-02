import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import AdminCurriculumPacksClient from './AdminCurriculumPacksClient';

export default async function AdminCurriculumPacksPage() {
  await requirePlatformOwnerPage('/admin/shift-ai/curriculum-packs');
  return <AdminCurriculumPacksClient />;
}

export async function generateMetadata() {
  return { title: 'Curriculum Packs · Shift AI Admin' };
}
