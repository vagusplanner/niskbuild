// Component Blueprint Type Definitions

export interface ComponentBlueprint {
  applicationId: string;
  meta: {
    title: string;
    type: 'webapp' | 'mobile' | 'game';
    description: string;
    theme: 'dark' | 'light';
  };
  canvasTree: {
    root: BlueprintNode;
  };
  dataSchema: {
    tables: Record<string, TableDefinition>;
  };
  integrations: string[];
  targetPlatform: 'web' | 'ios' | 'android' | 'pwa' | 'game' | 'mobile';
}

export interface BlueprintNode {
  id: string;
  component: ComponentType;
  properties: Record<string, unknown>;
  children?: BlueprintNode[];
}

export interface TableDefinition {
  fields: Record<string, FieldType>;
  permissions: 'public' | 'authenticated' | 'admin';
}

export type ComponentType =
  | 'WorkspaceContainer'
  | 'DataMetricCard'
  | 'AuthForm'
  | 'NavigationSidebar'
  | 'DataTable'
  | 'FormBuilder'
  | 'ChartContainer'
  | 'GameCanvas'
  | 'MapView'
  | 'MediaUploader'
  | 'PaymentButton'
  | 'AIAgentWidget';

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'timestamp'
  | 'json'
  | 'relation';

export function createEmptyBlueprint(userId: string): ComponentBlueprint {
  return {
    applicationId: userId,
    meta: {
      title: 'Untitled Application',
      type: 'webapp',
      description: '',
      theme: 'dark',
    },
    canvasTree: {
      root: {
        id: 'root',
        component: 'WorkspaceContainer',
        properties: {},
        children: [],
      },
    },
    dataSchema: {
      tables: {},
    },
    integrations: [],
    targetPlatform: 'web',
  };
}
