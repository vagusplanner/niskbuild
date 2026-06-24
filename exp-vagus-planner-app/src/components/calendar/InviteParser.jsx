import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Sparkles, Loader2, X, Check, Calendar, Clock, MapPin, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';

export default function InviteParser({ onParsed, onClose }) {
  const [inviteText, setInviteText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedEvent, setParsedEvent] = useState(null);

  const parseInvite = async () => {
    if (!inviteText.trim()) {
      toast.error('Please paste an invite or email');
      return;
    }

    setParsing(true);
    try {
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Parse this email/invite text and extract calendar event details:

"${inviteText}"

Extract:
- Event title
- Date (format: YYYY-MM-DD)
- Start time (format: HH:MM, 24-hour)
- End time if available (format: HH:MM, 24-hour)
- Location if mentioned
- Description/summary
- Category (work, personal, health, prayer, holiday, family, social, other)
- Whether it's recurring

If a field is not mentioned, return null for it.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            start_time: { type: "string" },
            end_time: { type: "string" },
            location: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            is_recurring: { type: "boolean" },
            confidence: { type: "number" }
          }
        }
      });

      setParsedEvent(result);
      toast.success('Invite parsed successfully!');
    } catch (error) {
      toast.error('Could not parse invite');
    } finally {
      setParsing(false);
    }
  };

  const applyParsed = () => {
    if (parsedEvent) {
      onParsed(parsedEvent);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border border-indigo-200 rounded-xl overflow-hidden bg-gradient-to-r from-indigo-50 to-purple-50"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">Parse Email/Invite</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-indigo-100 rounded-full">
            <X className="w-4 h-4 text-indigo-600" />
          </button>
        </div>

        {!parsedEvent ? (
          <>
            <Textarea
              value={inviteText}
              onChange={(e) => setInviteText(e.target.value)}
              placeholder="Paste your email invite, meeting request, or any text with event details here..."
              rows={4}
              className="mb-3 text-sm"
            />
            <Button
              type="button"
              onClick={parseInvite}
              disabled={parsing}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {parsing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Parse with AI
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-3 space-y-2">
              {parsedEvent.title && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Title</p>
                    <p className="text-sm font-medium">{parsedEvent.title}</p>
                  </div>
                </div>
              )}
              {parsedEvent.date && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Date</p>
                    <p className="text-sm font-medium">{parsedEvent.date}</p>
                  </div>
                </div>
              )}
              {parsedEvent.start_time && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Time</p>
                    <p className="text-sm font-medium">
                      {parsedEvent.start_time}
                      {parsedEvent.end_time && ` - ${parsedEvent.end_time}`}
                    </p>
                  </div>
                </div>
              )}
              {parsedEvent.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Location</p>
                    <p className="text-sm font-medium">{parsedEvent.location}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setParsedEvent(null)}
                className="flex-1"
              >
                Try Again
              </Button>
              <Button
                type="button"
                onClick={applyParsed}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Use This
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}