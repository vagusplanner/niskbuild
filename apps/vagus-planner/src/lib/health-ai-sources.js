/**
 * Fixed allowlist of reputable general-health sources for VP health AI.
 * Never invent citations — UI always links these; prompts may only name these IDs.
 */

export const HEALTH_AI_DISCLAIMER =
  'This is general wellness information, not medical advice. It is not a diagnosis, prescription, or substitute for care from a qualified clinician. If you have symptoms or concerns, contact a healthcare professional or emergency services.';

/** @typedef {{ id: string, name: string, shortName: string, url: string, topic: string }} HealthAiSource */

/** @type {HealthAiSource[]} */
export const HEALTH_AI_SOURCES = [
  {
    id: 'nhs',
    name: 'NHS (UK National Health Service)',
    shortName: 'NHS',
    url: 'https://www.nhs.uk/live-well/',
    topic: 'Live Well — sleep, exercise, mental wellbeing, nutrition',
  },
  {
    id: 'cdc',
    name: 'CDC (U.S. Centers for Disease Control and Prevention)',
    shortName: 'CDC',
    url: 'https://www.cdc.gov/',
    topic: 'Public health guidance and healthy living',
  },
  {
    id: 'mayo',
    name: 'Mayo Clinic',
    shortName: 'Mayo Clinic',
    url: 'https://www.mayoclinic.org/healthy-lifestyle',
    topic: 'Healthy lifestyle articles reviewed by clinicians',
  },
  {
    id: 'nih',
    name: 'NIH (U.S. National Institutes of Health)',
    shortName: 'NIH',
    url: 'https://www.nih.gov/health-information',
    topic: 'Evidence-based health information',
  },
];

export const HEALTH_AI_SOURCE_IDS = HEALTH_AI_SOURCES.map((s) => s.id);

/** Prompt block injected into health-adjacent LLM calls. */
export function buildHealthAiCitationPromptRules() {
  const list = HEALTH_AI_SOURCES.map(
    (s) => `- ${s.id}: ${s.name} — ${s.url} (${s.topic})`
  ).join('\n');

  return `CRITICAL SAFETY & CITATION RULES:
- You are a wellness coach, NOT a doctor. Never diagnose, prescribe, or claim certainty about medical conditions.
- Always remind the user that this is general wellness information, not medical advice.
- When giving health-adjacent tips (sleep, exercise, nutrition, stress, recovery), cite 1–3 sources ONLY from this fixed allowlist by id and full name. Do NOT invent journals, studies, clinics, or URLs.
Allowlist:
${list}
- Prefer phrasing like: "According to general guidance from the NHS / CDC / Mayo Clinic / NIH…"
- If the user asks for diagnosis, medication advice, or emergency help, refuse to diagnose/prescribe and urge them to seek professional or emergency care.`;
}

export function resolveHealthAiSources(sourceIds) {
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
    return HEALTH_AI_SOURCES;
  }
  const wanted = new Set(
    sourceIds.map((id) => String(id).toLowerCase().trim()).filter(Boolean)
  );
  const matched = HEALTH_AI_SOURCES.filter((s) => wanted.has(s.id));
  return matched.length > 0 ? matched : HEALTH_AI_SOURCES;
}
