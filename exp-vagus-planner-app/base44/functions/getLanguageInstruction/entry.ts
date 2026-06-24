import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get user's preferred language and return instruction for LLM prompts
 * Defaults to English if not set
 */
export async function getLanguageInstruction(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.email) return '';
    
    const settings = await base44.entities.UserSettings.filter({ created_by: user.email });
    const userLang = settings?.[0]?.language || 'en';
    
    const langMap = {
      'ar': 'Arabic',
      'fr': 'French',
      'tr': 'Turkish',
      'ur': 'Urdu',
      'en': 'English'
    };
    
    const langName = langMap[userLang];
    if (langName === 'English') return ''; // No instruction needed for default language
    
    return `\n\nPlease respond entirely in ${langName}.`;
  } catch (error) {
    console.error('Error getting language instruction:', error);
    return '';
  }
}