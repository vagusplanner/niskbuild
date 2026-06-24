import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Copy, Check } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function MeetingLinkGenerator({ onLinkGenerated, eventTitle }) {
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (type) => {
    setGenerating(true);
    try {
      const response = await SDK.functions.invoke('generateMeetingLink', {
        type,
        event_title: eventTitle
      });

      setGeneratedLink(response.data);
      onLinkGenerated?.(response.data.link);
      toast.success(`${type === 'meet' ? 'Google Meet' : type === 'zoom' ? 'Zoom' : 'Teams'} link generated`);
    } catch (error) {
      toast.error('Failed to generate meeting link');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink.link);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Video className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Add Video Meeting</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={() => handleGenerate('meet')}
          disabled={generating}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          Google Meet
        </Button>
        <Button
          onClick={() => handleGenerate('zoom')}
          disabled={generating}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          Zoom
        </Button>
        <Button
          onClick={() => handleGenerate('teams')}
          disabled={generating}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          Teams
        </Button>
      </div>

      <AnimatePresence>
        {generatedLink && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">
                  {generatedLink.type === 'meet' ? 'Google Meet' : 
                   generatedLink.type === 'zoom' ? 'Zoom' : 'Teams'} Link
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 truncate">
                  {generatedLink.link}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}