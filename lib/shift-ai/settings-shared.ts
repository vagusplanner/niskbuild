import type { ShiftAccountType, ShiftCurriculum } from '@/lib/shift-ai/constants';
import type { ShiftSubject } from '@/lib/shift-ai/subjects';

export const AI_PERSONA_OPTIONS = [
  { id: 'chill', label: '😎 Chill Older Sibling' },
  { id: 'strict', label: '🎓 Strict Professor' },
  { id: 'sassy', label: '😏 Sassy Tutor' },
  { id: 'excited', label: '🎉 Super Enthusiastic' },
  { id: 'mentor', label: '🧙 Wise Mentor' },
] as const;

export type AiPersonaId = (typeof AI_PERSONA_OPTIONS)[number]['id'];

export type SettingsProfile = {
  id: string;
  full_name: string;
  curriculum: ShiftCurriculum;
  year_group: string;
  key_stage: string;
  account_type: ShiftAccountType;
  favourite_subjects: string[];
  voice_enabled: boolean;
  preferred_voice: string | null;
  canEditCurriculum: boolean;
  subjects: ShiftSubject[];
};

export type InviteTokenInfo = {
  id: string;
  token: string;
  created_at: string;
  revoked_at: string | null;
  linkPath: string;
};
