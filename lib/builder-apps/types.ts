export type BuilderAppTarget = {
  id: string;
  label: string;
  file: string;
  route: string;
};

export type BuilderAppDefinition = {
  id: string;
  name: string;
  studioLabel: string;
  srcRoot: string;
  previewUrl: string;
  defaultTargetId: string;
  targets: BuilderAppTarget[];
  openAppHref: string;
  systemPrompt: string;
  supportsDeploy: boolean;
  supportsXcodeExport: boolean;
  deployTitle: string;
  getTargetById: (id: string) => BuilderAppTarget | undefined;
  readSource: (relativePath: string) => Promise<string>;
  writeSource: (relativePath: string, content: string) => Promise<void>;
  buildEditPrompt: (params: {
    userPrompt: string;
    relativePath: string;
    currentSource: string;
  }) => string;
  cleanSource: (raw: string) => string;
};
