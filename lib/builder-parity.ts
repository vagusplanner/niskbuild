/**
 * Shared builder capabilities — keep HTML builder (/builder) and VP builder
 * (/builder/[appId]) in sync when adding features.
 */
export const BUILDER_SHARED_FEATURES = [
  'prompt_bar_figma_upload',
  'prompt_bar_google_places',
  'prompt_bar_activity_log',
  'prompt_bar_local_ollama',
  'help_assistant',
  'resize_chat_panel',
  'resize_prompt_height',
  'social_publisher_panel',
  'builder_header_menu',
] as const;

export type BuilderSharedFeature = (typeof BUILDER_SHARED_FEATURES)[number];

/** Features intentionally unique to one builder surface */
export const BUILDER_HTML_ONLY = [
  'multi_page_html_nav',
  'cloud_generate_streaming',
  'visual_inspector',
  'version_history',
  'plan_mode_panel',
  'seo_schema',
  'pwa_native_export',
] as const;

export const BUILDER_VP_ONLY = [
  'multi_target_page_select',
  'live_react_preview_iframe',
  'capacitor_xcode_export',
  'one_click_deploy',
] as const;
