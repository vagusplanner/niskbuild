import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FolderPlus, Loader2, FileText, Calendar, CheckSquare, Sparkles } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AIProjectInitiator({ conversationId, groupChatId, messages = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [projectPlan, setProjectPlan] = useState(null);
  const queryClient = useQueryClient();

  const createProjectMutation = useMutation({
    mutationFn: async (plan) => {
      // Create a goal for the project
      const goal = await SDK.entities.Goal.create({
        title: plan.title,
        description: plan.description,
        category: 'professional',
        status: 'in_progress',
        action_steps: plan.tasks.map(task => ({
          title: task,
          completed: false
        }))
      });

      // Create initial tasks
      const taskPromises = plan.tasks.slice(0, 3).map(task =>
        SDK.entities.Task.create({
          title: task,
          category: 'work',
          priority: 'medium',
          status: 'todo'
        })
      );
      await Promise.all(taskPromises);

      // Create calendar event for kickoff
      if (plan.kickoffDate) {
        await SDK.entities.Event.create({
          title: `🚀 ${plan.title} - Kickoff`,
          description: plan.description,
          start_date: plan.kickoffDate,
          end_date: plan.kickoffDate,
          category: 'work'
        });
      }

      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Project created successfully!');
      setIsOpen(false);
      setProjectPlan(null);
    }
  });

  const analyzeConversation = async () => {
    setIsAnalyzing(true);
    try {
      const conversationText = messages
        .slice(-10)
        .map(m => `${m.sender_name}: ${m.message}`)
        .join('\n');

      const response = await SDK.integrations.Core.InvokeLLM({
        prompt: `Analyze this conversation and suggest a collaborative project or document:

${conversationText}

Based on the discussion, create a project plan with:
- title: Clear project name
- description: 2-3 sentence description
- tasks: Array of 5-7 specific action items
- milestones: Array of 3 key milestones
- kickoffDate: Suggested date to start (ISO format, within next week)
- estimatedDuration: Time estimate in weeks

Return ONLY valid JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            tasks: { type: 'array', items: { type: 'string' } },
            milestones: { type: 'array', items: { type: 'string' } },
            kickoffDate: { type: 'string' },
            estimatedDuration: { type: 'number' }
          }
        }
      });

      setProjectPlan(response);
      toast.success('Project plan generated!');
    } catch (error) {
      console.error('Failed to analyze conversation:', error);
      toast.error('Failed to generate project plan');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setIsOpen(true);
          if (!projectPlan && messages.length > 0) {
            analyzeConversation();
          }
        }}
        className="h-9 w-9"
        title="Create project from conversation"
      >
        <Sparkles className="w-4 h-4 text-slate-600" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-purple-600" />
              AI Project Initiator
            </DialogTitle>
          </DialogHeader>

          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
              <p className="text-sm text-slate-600">Analyzing conversation and creating project plan...</p>
            </div>
          ) : projectPlan ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{projectPlan.title}</h3>
                <p className="text-sm text-slate-600">{projectPlan.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-medium text-blue-900">Kickoff Date</p>
                    </div>
                    <p className="text-sm text-blue-700">
                      {new Date(projectPlan.kickoffDate).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-medium text-green-900">Duration</p>
                    </div>
                    <p className="text-sm text-green-700">
                      {projectPlan.estimatedDuration} weeks
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                  Action Items
                </h4>
                <div className="space-y-2">
                  {projectPlan.tasks.map((task, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-700 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-slate-700 flex-1">{task}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Milestones
                </h4>
                <div className="space-y-2">
                  {projectPlan.milestones.map((milestone, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg"
                    >
                      <div className="w-2 h-2 rounded-full bg-purple-600" />
                      <p className="text-sm text-purple-900">{milestone}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProjectPlan(null);
                    setIsOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createProjectMutation.mutate(projectPlan)}
                  disabled={createProjectMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-600 mb-4">
                No conversation history available to analyze
              </p>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}