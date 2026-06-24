/**
 * featureGating.js
 * Centralised plan feature limits & access checks.
 *
 * Standard plans:  free → basic → pro → enterprise
 * Islamic plans:   free → basic_islamic → pro_islamic → enterprise_islamic
 */

const PLAN_FEATURES = {
  free: {
    events_created:   { limit: 100,     name: 'Events & Tasks' },
    ai_requests:      { limit: 150,     name: 'AI Requests' },   // 5/day × 30
    storage_gb:       { limit: 0.01,    name: 'Storage (GB)' },  // 10 MB
    team_members:     { limit: 1,       name: 'Team Members' },
    integrations:     { limit: 1,       name: 'Calendar Integrations' },
    api_calls:        { limit: 0,       name: 'API Calls' },
    // Feature flags
    guest_links:      { limit: 0,       name: 'Guest Sharing Links' },
    ai_scheduler:     { limit: 0,       name: 'AI Auto-Scheduler' },
    advanced_analytics:{ limit: 0,     name: 'Advanced Analytics' },
    travel_automation:{ limit: 0,       name: 'Travel Automation' },
    workspace_chat:   { limit: 0,       name: 'Workspace Chat' },
    workflow_automations:{ limit: 0,    name: 'Workflow Automations' },
    // Islamic flags
    full_prayer:      { limit: 0,       name: 'Full Prayer Times' },
    full_quran:       { limit: 0,       name: 'Full Quran' },
    zakat:            { limit: 0,       name: 'Zakat Calculator' },
    ramadan:          { limit: 0,       name: 'Ramadan Tracker' },
    hajj:             { limit: 0,       name: 'Hajj/Umrah Planner' },
    ai_islamic_coach: { limit: 0,       name: 'AI Islamic Coach' },
    family_prayer:    { limit: 0,       name: 'Family Prayer Hub' },
    group_dhikr:      { limit: 0,       name: 'Group Dhikr' },
    mosque_chat:      { limit: 0,       name: 'Mosque Community Chat' },
  },

  basic: {
    events_created:   { limit: 500,     name: 'Events & Tasks' },
    ai_requests:      { limit: 1000,    name: 'AI Requests' },
    storage_gb:       { limit: 2,       name: 'Storage (GB)' },
    team_members:     { limit: 5,       name: 'Team Members' },
    integrations:     { limit: 5,       name: 'Calendar Integrations' },
    api_calls:        { limit: 0,       name: 'API Calls' },
    guest_links:      { limit: 0,       name: 'Guest Sharing Links' },
    ai_scheduler:     { limit: 0,       name: 'AI Auto-Scheduler' },
    advanced_analytics:{ limit: 0,     name: 'Advanced Analytics' },
    travel_automation:{ limit: 0,       name: 'Travel Automation' },
    workspace_chat:   { limit: 0,       name: 'Workspace Chat' },
    workflow_automations:{ limit: 0,    name: 'Workflow Automations' },
    // Islamic (not available on standard basic)
    full_prayer:      { limit: 0,       name: 'Full Prayer Times' },
    full_quran:       { limit: 0,       name: 'Full Quran' },
    zakat:            { limit: 0,       name: 'Zakat Calculator' },
    ramadan:          { limit: 0,       name: 'Ramadan Tracker' },
    hajj:             { limit: 0,       name: 'Hajj/Umrah Planner' },
    ai_islamic_coach: { limit: 0,       name: 'AI Islamic Coach' },
    family_prayer:    { limit: 0,       name: 'Family Prayer Hub' },
    group_dhikr:      { limit: 0,       name: 'Group Dhikr' },
    mosque_chat:      { limit: 0,       name: 'Mosque Community Chat' },
  },

  pro: {
    events_created:   { limit: 999999,  name: 'Events & Tasks' },
    ai_requests:      { limit: 5000,    name: 'AI Requests' },
    storage_gb:       { limit: 10,      name: 'Storage (GB)' },
    team_members:     { limit: 10,      name: 'Team Members' },
    integrations:     { limit: 999999,  name: 'Calendar Integrations' },
    api_calls:        { limit: 10000,   name: 'API Calls' },
    guest_links:      { limit: 999999,  name: 'Guest Sharing Links' },
    ai_scheduler:     { limit: 1,       name: 'AI Auto-Scheduler' },
    advanced_analytics:{ limit: 1,     name: 'Advanced Analytics' },
    travel_automation:{ limit: 1,       name: 'Travel Automation' },
    workspace_chat:   { limit: 0,       name: 'Workspace Chat' },      // Enterprise only
    workflow_automations:{ limit: 0,    name: 'Workflow Automations' }, // Enterprise only
    full_prayer:      { limit: 0,       name: 'Full Prayer Times' },
    full_quran:       { limit: 0,       name: 'Full Quran' },
    zakat:            { limit: 0,       name: 'Zakat Calculator' },
    ramadan:          { limit: 0,       name: 'Ramadan Tracker' },
    hajj:             { limit: 0,       name: 'Hajj/Umrah Planner' },
    ai_islamic_coach: { limit: 0,       name: 'AI Islamic Coach' },
    family_prayer:    { limit: 0,       name: 'Family Prayer Hub' },
    group_dhikr:      { limit: 0,       name: 'Group Dhikr' },
    mosque_chat:      { limit: 0,       name: 'Mosque Community Chat' },
  },

  enterprise: {
    events_created:   { limit: 999999,  name: 'Events & Tasks' },
    ai_requests:      { limit: 999999,  name: 'AI Requests' },
    storage_gb:       { limit: 999999,  name: 'Storage (GB)' },
    team_members:     { limit: 999999,  name: 'Team Members' },
    integrations:     { limit: 999999,  name: 'Calendar Integrations' },
    api_calls:        { limit: 999999,  name: 'API Calls' },
    guest_links:      { limit: 999999,  name: 'Guest Sharing Links' },
    ai_scheduler:     { limit: 1,       name: 'AI Auto-Scheduler' },
    advanced_analytics:{ limit: 1,     name: 'Advanced Analytics' },
    travel_automation:{ limit: 1,       name: 'Travel Automation' },
    workspace_chat:   { limit: 1,       name: 'Workspace Chat' },
    workflow_automations:{ limit: 1,    name: 'Workflow Automations' },
    full_prayer:      { limit: 0,       name: 'Full Prayer Times' },
    full_quran:       { limit: 0,       name: 'Full Quran' },
    zakat:            { limit: 0,       name: 'Zakat Calculator' },
    ramadan:          { limit: 0,       name: 'Ramadan Tracker' },
    hajj:             { limit: 0,       name: 'Hajj/Umrah Planner' },
    ai_islamic_coach: { limit: 0,       name: 'AI Islamic Coach' },
    family_prayer:    { limit: 0,       name: 'Family Prayer Hub' },
    group_dhikr:      { limit: 0,       name: 'Group Dhikr' },
    mosque_chat:      { limit: 0,       name: 'Mosque Community Chat' },
  },

  // ── Islamic Edition plans ────────────────────────────────────────────
  basic_islamic: {
    events_created:   { limit: 500,     name: 'Events' },
    ai_requests:      { limit: 1000,    name: 'AI Requests' },
    storage_gb:       { limit: 2,       name: 'Storage (GB)' },
    team_members:     { limit: 5,       name: 'Team Members' },
    integrations:     { limit: 5,       name: 'Calendar Integrations' },
    api_calls:        { limit: 0,       name: 'API Calls' },
    guest_links:      { limit: 0,       name: 'Guest Sharing Links' },
    ai_scheduler:     { limit: 0,       name: 'AI Auto-Scheduler' },
    advanced_analytics:{ limit: 0,     name: 'Advanced Analytics' },
    travel_automation:{ limit: 0,       name: 'Travel Automation' },
    workspace_chat:   { limit: 0,       name: 'Workspace Chat' },
    workflow_automations:{ limit: 0,    name: 'Workflow Automations' },
    full_prayer:      { limit: 1,       name: 'Full Prayer Times' },
    full_quran:       { limit: 1,       name: 'Full Quran' },
    zakat:            { limit: 1,       name: 'Zakat Calculator' },
    ramadan:          { limit: 1,       name: 'Ramadan Tracker' },
    hajj:             { limit: 1,       name: 'Hajj/Umrah Planner' },   // basic level
    ai_islamic_coach: { limit: 0,       name: 'AI Islamic Coach' },
    family_prayer:    { limit: 3,       name: 'Family Prayer Hub' },    // up to 3
    group_dhikr:      { limit: 0,       name: 'Group Dhikr' },
    mosque_chat:      { limit: 0,       name: 'Mosque Community Chat' },
  },

  pro_islamic: {
    events_created:   { limit: 999999,  name: 'Events' },
    ai_requests:      { limit: 5000,    name: 'AI Requests' },
    storage_gb:       { limit: 10,      name: 'Storage (GB)' },
    team_members:     { limit: 10,      name: 'Team Members' },
    integrations:     { limit: 999999,  name: 'Calendar Integrations' },
    api_calls:        { limit: 10000,   name: 'API Calls' },
    guest_links:      { limit: 999999,  name: 'Guest Sharing Links' },
    ai_scheduler:     { limit: 1,       name: 'AI Auto-Scheduler' },
    advanced_analytics:{ limit: 1,     name: 'Advanced Analytics' },
    travel_automation:{ limit: 1,       name: 'Travel Automation' },
    workspace_chat:   { limit: 0,       name: 'Workspace Chat' },
    workflow_automations:{ limit: 0,    name: 'Workflow Automations' },
    full_prayer:      { limit: 1,       name: 'Full Prayer Times' },
    full_quran:       { limit: 1,       name: 'Full Quran' },
    zakat:            { limit: 1,       name: 'Zakat Calculator' },
    ramadan:          { limit: 1,       name: 'Ramadan Tracker' },
    hajj:             { limit: 1,       name: 'Hajj/Umrah Planner' },
    ai_islamic_coach: { limit: 1,       name: 'AI Islamic Coach' },
    family_prayer:    { limit: 10,      name: 'Family Prayer Hub' },
    group_dhikr:      { limit: 1,       name: 'Group Dhikr' },
    mosque_chat:      { limit: 0,       name: 'Mosque Community Chat' }, // Enterprise only
  },

  enterprise_islamic: {
    events_created:   { limit: 999999,  name: 'Events' },
    ai_requests:      { limit: 999999,  name: 'AI Requests' },
    storage_gb:       { limit: 999999,  name: 'Storage (GB)' },
    team_members:     { limit: 999999,  name: 'Team Members' },
    integrations:     { limit: 999999,  name: 'Calendar Integrations' },
    api_calls:        { limit: 999999,  name: 'API Calls' },
    guest_links:      { limit: 999999,  name: 'Guest Sharing Links' },
    ai_scheduler:     { limit: 1,       name: 'AI Auto-Scheduler' },
    advanced_analytics:{ limit: 1,     name: 'Advanced Analytics' },
    travel_automation:{ limit: 1,       name: 'Travel Automation' },
    workspace_chat:   { limit: 0,       name: 'Workspace Chat' },
    workflow_automations:{ limit: 1,    name: 'Workflow Automations' },
    full_prayer:      { limit: 1,       name: 'Full Prayer Times' },
    full_quran:       { limit: 1,       name: 'Full Quran' },
    zakat:            { limit: 1,       name: 'Zakat Calculator' },
    ramadan:          { limit: 1,       name: 'Ramadan Tracker' },
    hajj:             { limit: 1,       name: 'Hajj/Umrah Planner' },
    ai_islamic_coach: { limit: 1,       name: 'AI Islamic Coach' },
    family_prayer:    { limit: 999999,  name: 'Family Prayer Hub' },
    group_dhikr:      { limit: 1,       name: 'Group Dhikr' },
    mosque_chat:      { limit: 1,       name: 'Mosque Community Chat' },
  },

  // Legacy alias
  premium: {
    events_created:   { limit: 999999,  name: 'Events & Tasks' },
    ai_requests:      { limit: 999999,  name: 'AI Requests' },
    storage_gb:       { limit: 999999,  name: 'Storage (GB)' },
    team_members:     { limit: 999999,  name: 'Team Members' },
    integrations:     { limit: 999999,  name: 'Calendar Integrations' },
    api_calls:        { limit: 999999,  name: 'API Calls' },
    guest_links:      { limit: 999999,  name: 'Guest Sharing Links' },
    ai_scheduler:     { limit: 1,       name: 'AI Auto-Scheduler' },
    advanced_analytics:{ limit: 1,     name: 'Advanced Analytics' },
    travel_automation:{ limit: 1,       name: 'Travel Automation' },
    workspace_chat:   { limit: 1,       name: 'Workspace Chat' },
    workflow_automations:{ limit: 1,    name: 'Workflow Automations' },
    full_prayer:      { limit: 1,       name: 'Full Prayer Times' },
    full_quran:       { limit: 1,       name: 'Full Quran' },
    zakat:            { limit: 1,       name: 'Zakat Calculator' },
    ramadan:          { limit: 1,       name: 'Ramadan Tracker' },
    hajj:             { limit: 1,       name: 'Hajj/Umrah Planner' },
    ai_islamic_coach: { limit: 1,       name: 'AI Islamic Coach' },
    family_prayer:    { limit: 999999,  name: 'Family Prayer Hub' },
    group_dhikr:      { limit: 1,       name: 'Group Dhikr' },
    mosque_chat:      { limit: 1,       name: 'Mosque Community Chat' },
  }
};

/** Returns true if the plan has access to the feature */
export const canAccessFeature = (plan, feature) => {
  return (PLAN_FEATURES[plan]?.[feature]?.limit || 0) > 0;
};

/** Returns the numeric limit for a feature on a plan (0 = no access) */
export const getFeatureLimit = (plan, feature) => {
  return PLAN_FEATURES[plan]?.[feature]?.limit || 0;
};

/** Returns the human-readable feature name */
export const getFeatureName = (feature) => {
  for (const p of Object.values(PLAN_FEATURES)) {
    if (p[feature]) return p[feature].name;
  }
  return feature;
};

/** Returns true if usage is within the plan limit */
export const checkUsageAllowed = (usage, plan, feature) => {
  const limit = getFeatureLimit(plan, feature);
  if (limit >= 999999) return true;
  return (usage || 0) < limit;
};

/** Returns the next plan that unlocks a feature (for upgrade prompts) */
export const getPlanUpgradeSuggestion = (plan, feature) => {
  const islamicOrder = ['free', 'basic_islamic', 'pro_islamic', 'enterprise_islamic'];
  const standardOrder = ['free', 'basic', 'pro', 'enterprise'];
  const isIslamic = plan.includes('islamic') || plan === 'free';
  const planOrder = isIslamic ? islamicOrder : standardOrder;

  const currentIndex = planOrder.indexOf(plan);
  if (currentIndex === -1 || currentIndex === planOrder.length - 1) return null;

  for (let i = currentIndex + 1; i < planOrder.length; i++) {
    const candidate = planOrder[i];
    if ((PLAN_FEATURES[candidate]?.[feature]?.limit || 0) > 0) {
      return {
        plan: candidate,
        featureName: getFeatureName(feature),
        newLimit: PLAN_FEATURES[candidate][feature].limit
      };
    }
  }
  return null;
};