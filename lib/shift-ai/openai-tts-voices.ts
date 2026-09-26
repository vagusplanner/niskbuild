/**
 * OpenAI TTS voices for SuperEduc8 Voice Tutor / Voice Buddy.
 * tts-1-hd voice IDs (OpenAI). Gender labels are approximate for UI choice.
 */

export const OPENAI_TTS_MODEL = 'tts-1-hd';

export const OPENAI_TTS_VOICE_IDS = [
  'alloy',
  'ash',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
] as const;

export type OpenAiTtsVoiceId = (typeof OPENAI_TTS_VOICE_IDS)[number];

export type OpenAiTtsVoiceOption = {
  id: OpenAiTtsVoiceId;
  label: string;
  /** Approximate presentation for Settings gender-aware choice */
  gender: 'feminine' | 'masculine' | 'neutral';
};

export const OPENAI_TTS_VOICE_OPTIONS: OpenAiTtsVoiceOption[] = [
  { id: 'nova', label: 'Nova — warm, clear (feminine)', gender: 'feminine' },
  { id: 'shimmer', label: 'Shimmer — bright (feminine)', gender: 'feminine' },
  { id: 'coral', label: 'Coral — friendly (feminine)', gender: 'feminine' },
  { id: 'sage', label: 'Sage — calm (neutral)', gender: 'neutral' },
  { id: 'alloy', label: 'Alloy — balanced (neutral)', gender: 'neutral' },
  { id: 'fable', label: 'Fable — expressive (neutral)', gender: 'neutral' },
  { id: 'echo', label: 'Echo — steady (masculine)', gender: 'masculine' },
  { id: 'onyx', label: 'Onyx — deep (masculine)', gender: 'masculine' },
  { id: 'ash', label: 'Ash — soft (masculine)', gender: 'masculine' },
];

export function isOpenAiTtsVoiceId(value: string | null | undefined): value is OpenAiTtsVoiceId {
  return typeof value === 'string' && (OPENAI_TTS_VOICE_IDS as readonly string[]).includes(value);
}

/** Default neural voice when the student has not picked one. */
export function defaultOpenAiTtsVoiceForLanguage(
  lang: string | null | undefined
): OpenAiTtsVoiceId {
  switch (lang) {
    case 'fr':
      return 'coral';
    case 'es':
      return 'nova';
    case 'ar':
      return 'shimmer';
    case 'en':
    default:
      return 'nova';
  }
}

/**
 * Resolve the voice actually used for TTS.
 * Prefers Settings `preferred_voice` when it is a valid OpenAI voice id.
 */
export function resolveOpenAiTtsVoice(input: {
  preferredVoice?: string | null;
  studyLanguage?: string | null;
  /** Voice Buddy uses a warmer default when no preference is set */
  warmer?: boolean;
}): OpenAiTtsVoiceId {
  if (isOpenAiTtsVoiceId(input.preferredVoice)) {
    return input.preferredVoice;
  }
  if (input.warmer) return 'shimmer';
  return defaultOpenAiTtsVoiceForLanguage(input.studyLanguage);
}

/** BCP-47 tags for Web Speech recognition (mic), keyed by study language. */
export function speechRecognitionLangForStudyLanguage(lang: string | null | undefined): string {
  switch (lang) {
    case 'fr':
      return 'fr-FR';
    case 'es':
      return 'es-ES';
    case 'ar':
      return 'ar-SA';
    case 'en':
    default:
      return 'en-GB';
  }
}
