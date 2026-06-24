import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import FeedbackSubmissionForm from './FeedbackSubmissionForm';

export default function FeedbackButton({ type = 'feedback', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Send Feedback
      </Button>
      
      <FeedbackSubmissionForm
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialType={type}
      />
    </>
  );
}