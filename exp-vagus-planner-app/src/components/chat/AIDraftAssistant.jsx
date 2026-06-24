import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AIDraftAssistant({ conversationId, groupChatId, onSelectDraft }) {
  const [drafts, setDrafts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generateDrafts = async () => {
    setLoading(true);
    try {
      const { data } = await SDK.functions.invoke('draftMessageResponse', {
        conversation_id: conversationId,
        group_chat_id: groupChatId,
        tone: 'professional',
        length: 'medium'
      });

      setDrafts(data);
      setExpanded(true);
      toast.success('AI drafts generated');
    } catch (error) {
      toast.error('Failed to generate drafts');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDraft = (draft) => {
    onSelectDraft(draft.message);
    setExpanded(false);
    toast.success('Draft inserted');
  };

  return (
    <div className="border-t border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
      <div className="p-3">
        <Button
          onClick={generateDrafts}
          disabled={loading}
          size="sm"
          variant="outline"
          className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating AI drafts...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate AI Response
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {drafts && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-purple-700">AI-Generated Responses</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setExpanded(false)}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>

              {drafts.responses?.map((draft, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSelectDraft(draft)}
                  className="w-full p-3 bg-white border border-purple-200 rounded-lg hover:border-purple-400 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-medium text-purple-600">
                      {draft.approach}
                    </span>
                    <span className="text-xs text-slate-400">
                      {Math.round(draft.confidence * 100)}% match
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{draft.message}</p>
                </motion.button>
              ))}

              {drafts.context_summary && (
                <p className="text-xs text-slate-500 italic mt-2">
                  Context: {drafts.context_summary}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}