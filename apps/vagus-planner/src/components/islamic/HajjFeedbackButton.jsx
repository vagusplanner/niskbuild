import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ThumbsUp, ThumbsDown, AlertTriangle, Star, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function HajjFeedbackButton({ 
  feedbackType, 
  context, 
  pilgrimageType,
  compact = false,
  showInaccuracyReport = true 
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [isHelpful, setIsHelpful] = useState(null);
  const [reportInaccuracy, setReportInaccuracy] = useState(false);
  const [comment, setComment] = useState('');
  const [inaccuracyDetails, setInaccuracyDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleQuickFeedback = async (helpful) => {
    setSubmitting(true);
    try {
      await base44.entities.HajjFeedback.create({
        feedback_type: feedbackType,
        is_helpful: helpful,
        context: context || {},
        pilgrimage_type: pilgrimageType
      });
      toast.success('Thank you for your feedback!');
      setIsHelpful(helpful);
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDetailedFeedback = async () => {
    if (!rating && !reportInaccuracy && !comment) {
      toast.error('Please provide a rating or feedback');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.HajjFeedback.create({
        feedback_type: feedbackType,
        rating: rating || undefined,
        inaccuracy_report: reportInaccuracy,
        inaccuracy_details: reportInaccuracy ? inaccuracyDetails : undefined,
        comment: comment || undefined,
        context: context || {},
        pilgrimage_type: pilgrimageType
      });

      toast.success(
        reportInaccuracy 
          ? 'Thank you for reporting. We\'ll review this information.'
          : 'Thank you for your feedback!'
      );

      setShowDialog(false);
      setRating(0);
      setComment('');
      setReportInaccuracy(false);
      setInaccuracyDetails('');
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleQuickFeedback(true)}
          disabled={submitting || isHelpful === true}
          className={`h-7 px-2 ${isHelpful === true ? 'bg-green-50 text-green-600' : ''}`}
        >
          <ThumbsUp className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleQuickFeedback(false)}
          disabled={submitting || isHelpful === false}
          className={`h-7 px-2 ${isHelpful === false ? 'bg-red-50 text-red-600' : ''}`}
        >
          <ThumbsDown className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowDialog(true)}
          className="h-7 px-2"
        >
          <MessageSquare className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-600">Was this helpful?</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickFeedback(true)}
          disabled={submitting || isHelpful === true}
          className={isHelpful === true ? 'bg-green-50 border-green-300' : ''}
        >
          <ThumbsUp className="w-4 h-4 mr-1" />
          Yes
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickFeedback(false)}
          disabled={submitting || isHelpful === false}
          className={isHelpful === false ? 'bg-red-50 border-red-300' : ''}
        >
          <ThumbsDown className="w-4 h-4 mr-1" />
          No
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowDialog(true)}
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          More Feedback
        </Button>
        {showInaccuracyReport && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setReportInaccuracy(true);
              setShowDialog(true);
            }}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            Report Issue
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reportInaccuracy ? 'Report Inaccuracy' : 'Share Your Feedback'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!reportInaccuracy && (
              <div>
                <Label>Rate this information (optional)</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {reportInaccuracy && (
              <div>
                <Label>What information is inaccurate? *</Label>
                <Textarea
                  value={inaccuracyDetails}
                  onChange={(e) => setInaccuracyDetails(e.target.value)}
                  placeholder="Please describe what's incorrect and provide the correct information if you know it..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            )}

            <div>
              <Label>Additional comments {reportInaccuracy ? '(optional)' : ''}</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts, suggestions, or experience..."
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setReportInaccuracy(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDetailedFeedback}
                disabled={submitting || (reportInaccuracy && !inaccuracyDetails)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}