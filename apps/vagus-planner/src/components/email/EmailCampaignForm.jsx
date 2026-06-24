import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Wand2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailCampaignForm({ campaign, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    goal: campaign?.goal || '',
    target_audience: campaign?.target_audience || '',
    tone: campaign?.tone || 'professional',
    key_points: '',
    subject_line: campaign?.subject_line || '',
    email_body: campaign?.email_body || '',
    alternative_subjects: campaign?.alternative_subjects || [],
    tags: campaign?.tags || []
  });
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [copied, setCopied] = useState('');

  const handleGenerateContent = async () => {
    if (!formData.goal || !formData.target_audience) {
      toast.error('Please fill in goal and target audience');
      return;
    }

    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('draftEmailCampaign', {
        goal: formData.goal,
        target_audience: formData.target_audience,
        tone: formData.tone,
        key_points: formData.key_points
      });

      setGeneratedContent(data);
      setFormData(prev => ({
        ...prev,
        email_body: data.email_body,
        subject_line: data.recommended_subject,
        alternative_subjects: data.subject_lines
      }));
      toast.success('Content generated!');
    } catch (error) {
      toast.error('Failed to generate content');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.goal || !formData.target_audience || !formData.email_body) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (campaign) {
        await base44.entities.EmailCampaign.update(campaign.id, formData);
        toast.success('Campaign updated');
      } else {
        await base44.entities.EmailCampaign.create(formData);
        toast.success('Campaign created');
      }
      onSave();
    } catch (error) {
      toast.error('Failed to save campaign');
      console.error(error);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto safe-area-padding">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            {campaign ? 'Edit Campaign' : 'New Email Campaign'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Campaign Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Sale 2026"
              />
            </div>
            <div>
              <Label>Tone</Label>
              <Select value={formData.tone} onValueChange={(tone) => setFormData({ ...formData, tone })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Campaign Goal *</Label>
            <Textarea
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              placeholder="e.g., Promote our new summer collection and drive sales with a 20% off offer"
              rows={2}
            />
          </div>

          <div>
            <Label>Target Audience *</Label>
            <Textarea
              value={formData.target_audience}
              onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
              placeholder="e.g., Young professionals aged 25-40, interested in sustainable fashion"
              rows={2}
            />
          </div>

          <div>
            <Label>Key Points to Include (Optional)</Label>
            <Textarea
              value={formData.key_points}
              onChange={(e) => setFormData({ ...formData, key_points: e.target.value })}
              placeholder="e.g., Free shipping, Limited time offer, New arrivals"
              rows={2}
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateContent}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Email & Subject Lines
              </>
            )}
          </Button>

          {/* Generated Subject Lines */}
          {formData.alternative_subjects.length > 0 && (
            <div>
              <Label className="mb-2 block">AI-Generated Subject Lines (Select One)</Label>
              <div className="space-y-2">
                {formData.alternative_subjects.map((subject, idx) => (
                  <Card
                    key={idx}
                    className={`p-3 cursor-pointer transition-all ${
                      formData.subject_line === subject
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                    onClick={() => setFormData({ ...formData, subject_line: subject })}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm flex-1">{subject}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(subject, `subject-${idx}`);
                        }}
                      >
                        {copied === `subject-${idx}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Email Body */}
          <div>
            <Label>Email Content *</Label>
            <Textarea
              value={formData.email_body}
              onChange={(e) => setFormData({ ...formData, email_body: e.target.value })}
              placeholder="Email content will be generated here..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t dark:border-slate-800">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              {campaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}