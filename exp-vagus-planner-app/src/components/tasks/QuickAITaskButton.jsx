import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';
import AITaskGenerator from './AITaskGenerator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';

export default function QuickAITaskButton({ className }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const createTasksMutation = useMutation({
    mutationFn: async (tasks) => {
      return await SDK.entities.Task.bulkCreate(tasks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsOpen(false);
    },
    onError: () => toast.error('Failed to create tasks')
  });

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={className}
        variant="outline"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        AI Task Generator
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              Generate Tasks with AI
            </DialogTitle>
            <DialogDescription>
              Describe your goal and AI will create detailed, actionable tasks
            </DialogDescription>
          </DialogHeader>
          <AITaskGenerator
            onTasksGenerated={(tasks) => createTasksMutation.mutate(tasks)}
            onClose={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}