export type PreferredProvider = 'auto' | 'ollama' | 'groq';

export interface AgentSettings {
  preferredProvider: PreferredProvider;
  voiceEnabled: boolean;
}

export const AGENT_SETTINGS_KEY = 'niskbuild_agent_settings';

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  preferredProvider: 'auto',
  voiceEnabled: true,
};

export function loadAgentSettings(): AgentSettings {
  if (typeof window === 'undefined') return DEFAULT_AGENT_SETTINGS;
  try {
    const raw = localStorage.getItem(AGENT_SETTINGS_KEY);
    if (!raw) return DEFAULT_AGENT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AgentSettings>;
    return {
      preferredProvider:
        parsed.preferredProvider === 'ollama' ||
        parsed.preferredProvider === 'groq' ||
        parsed.preferredProvider === 'auto'
          ? parsed.preferredProvider
          : 'auto',
      voiceEnabled: parsed.voiceEnabled !== false,
    };
  } catch {
    return DEFAULT_AGENT_SETTINGS;
  }
}

export function saveAgentSettings(settings: AgentSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AGENT_SETTINGS_KEY, JSON.stringify(settings));
}

export function providerBadge(provider?: string): string {
  if (provider === 'ollama') return 'Local';
  if (provider === 'groq') return 'Cloud';
  return 'Auto';
}
