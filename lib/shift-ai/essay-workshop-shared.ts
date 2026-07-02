export type WorkshopOutline = {
  thesis: string;
  introduction: {
    hook: string;
    context: string;
    thesis_sentence: string;
  };
  body_paragraphs: Array<{
    topic_sentence: string;
    arguments: string[];
    evidence: string[];
    transition: string;
  }>;
  conclusion: {
    restate_thesis: string;
    synthesis: string;
    final_thought: string;
  };
  key_vocabulary: string[];
  marking_tips: string[];
};

export type WorkshopLiveFeedback = {
  encouragement: string;
  progress_summary: string;
  suggestions: string[];
  outline_alignment: string;
  strengths: string[];
  next_steps: string[];
  word_count_note?: string;
};

export function buildOutlineScaffold(outline: WorkshopOutline | null): string {
  if (!outline) return '';
  let text = `[INTRODUCTION]\n${outline.introduction?.hook || ''} ${outline.introduction?.context || ''} ${outline.introduction?.thesis_sentence || ''}\n\n`;
  (outline.body_paragraphs || []).forEach((p, i) => {
    text += `[PARAGRAPH ${i + 1}]\n${p.topic_sentence || ''}\n\n`;
  });
  text += `[CONCLUSION]\n${outline.conclusion?.restate_thesis || ''} ${outline.conclusion?.synthesis || ''} ${outline.conclusion?.final_thought || ''}`;
  return text.trim();
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
