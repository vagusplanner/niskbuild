import AppBuilderWorkspace from '@/app/builder/AppBuilderWorkspace';

/** Vagus Planner studio — /builder/vagus-planner */
export default function VagusPlannerBuilderPage() {
  return (
    <AppBuilderWorkspace
      appId="vagus-planner"
      loginNextPath="/builder/vagus-planner"
    />
  );
}
