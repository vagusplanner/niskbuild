import AppBuilderWorkspace from '@/app/builder/AppBuilderWorkspace';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';

/** Vagus Planner studio — platform owner only */
export default async function VagusPlannerBuilderPage() {
  await requirePlatformOwnerPage('/builder/vagus-planner');

  return (
    <AppBuilderWorkspace
      appId="vagus-planner"
      loginNextPath="/builder/vagus-planner"
    />
  );
}
