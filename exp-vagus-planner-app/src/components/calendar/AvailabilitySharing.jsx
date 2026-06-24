import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Share2, Copy, Check, Clock, Calendar } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';

export default function AvailabilitySharing() {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    duration_minutes: 30,
    date_range_days: 7,
    buffer_minutes: 15
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await SDK.functions.invoke('generateAvailabilityLink', settings);
      setShareUrl(response.data.share_url);
      toast.success('Availability link generated!');
    } catch (error) {
      toast.error('Failed to generate link');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share Availability
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Your Availability</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Generate a shareable link that shows your free time slots to others.
          </p>

          <div className="space-y-3">
            <div>
              <Label>Meeting Duration</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <Input
                  type="number"
                  value={settings.duration_minutes}
                  onChange={(e) => setSettings({ ...settings, duration_minutes: parseInt(e.target.value) })}
                  min={15}
                  step={15}
                  className="flex-1"
                />
                <span className="text-sm text-slate-500">minutes</span>
              </div>
            </div>

            <div>
              <Label>Show Availability For</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <Input
                  type="number"
                  value={settings.date_range_days}
                  onChange={(e) => setSettings({ ...settings, date_range_days: parseInt(e.target.value) })}
                  min={1}
                  max={30}
                  className="flex-1"
                />
                <span className="text-sm text-slate-500">days ahead</span>
              </div>
            </div>

            <div>
              <Label>Buffer Between Meetings</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <Input
                  type="number"
                  value={settings.buffer_minutes}
                  onChange={(e) => setSettings({ ...settings, buffer_minutes: parseInt(e.target.value) })}
                  min={0}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm text-slate-500">minutes</span>
              </div>
            </div>
          </div>

          {!shareUrl ? (
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {generating ? 'Generating...' : 'Generate Link'}
            </Button>
          ) : (
            <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <div className="space-y-3">
                <div>
                  <Label className="text-green-900 dark:text-green-100">Your Shareable Link</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="flex-1 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleCopy}
                      className="flex-shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Share this link with anyone. They'll see your available time slots and can book meetings with you.
                </p>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}