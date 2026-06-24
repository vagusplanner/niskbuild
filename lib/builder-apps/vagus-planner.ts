import type { BuilderAppDefinition } from '@/lib/builder-apps/types';
import {
  VP_BUILDER_TARGETS,
  VP_REACT_SYSTEM_PROMPT,
  VAGUS_PLANNER_PREVIEW_URL,
  buildVpEditPrompt,
  cleanReactSource,
  getVpTargetById,
  readVpSource,
  writeVpSource,
} from '@/lib/vagus-planner-builder';

export const vagusPlannerApp: BuilderAppDefinition = {
  id: 'vagus-planner',
  name: 'Vagus Planner',
  studioLabel: 'First-party builder',
  srcRoot: 'apps/vagus-planner/src',
  previewUrl: VAGUS_PLANNER_PREVIEW_URL,
  defaultTargetId: 'Dashboard',
  targets: VP_BUILDER_TARGETS,
  openAppHref: '/vagus-planner',
  systemPrompt: VP_REACT_SYSTEM_PROMPT,
  supportsDeploy: true,
  supportsXcodeExport: true,
  deployTitle: 'Vagus Planner',
  getTargetById: getVpTargetById,
  readSource: readVpSource,
  writeSource: writeVpSource,
  buildEditPrompt: buildVpEditPrompt,
  cleanSource: cleanReactSource,
};
