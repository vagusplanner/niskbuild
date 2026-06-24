import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function ConversationSummarizer({ conversationId, groupChatId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('summarizeConversation', {
        conversation_id: conversationId,
        group_chat_id: groupChatId,
        summary_type: 'comprehensive'
      });

      setSummary(data);
      setShowSummary(true);
      toast.success('Summary generated');
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={generateSummary}
        disabled={loading}
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        title="Summarize conversation"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
        ) : (
          <FileText className="w-4 h-4 text-slate-600" />
        )}
      </Button>

      <AnimatePresence>
        {showSummary && summary && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowSummary(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-indigo-600" />
                    <h2 className="text-xl font-semibold text-slate-800">
                      Conversation Summary
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSummary(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="max-h-[70vh]">
                <div className="p-6 space-y-6">
                  {/* Main Summary */}
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Overview</h3>
                    <p className="text-slate-600 leading-relaxed">{summary.summary}</p>
                  </div>

                  {/* Main Topics */}
                  {summary.main_topics?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-2">Main Topics</h3>
                      <div className="flex flex-wrap gap-2">
                        {summary.main_topics.map((topic, index) => (
                          <Badge key={index} variant="outline" className="bg-indigo-50 text-indigo-700">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {summary.action_items?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-2">Action Items</h3>
                      <div className="space-y-2">
                        {summary.action_items.map((item, index) => (
                          <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm font-medium text-slate-800">{item.action}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                              {item.owner && <span>Owner: {item.owner}</span>}
                              {item.deadline && <span>Due: {item.deadline}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Decisions */}
                  {summary.key_decisions?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-2">Key Decisions</h3>
                      <ul className="space-y-2">
                        {summary.key_decisions.map((decision, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-green-600 mt-1">✓</span>
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sentiment */}
                  {summary.sentiment && (
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-2">Sentiment</h3>
                      <p className="text-sm text-slate-600">{summary.sentiment}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}