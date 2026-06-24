import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, FileText, CheckCircle, Calendar, Loader2, Edit2, Save, X, User, Clock, Mail, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function MeetingAIAssistant({ meeting, onCreateTask, onCreateMeeting }) {
  const [generatedAgenda, setGeneratedAgenda] = useState(null);
  const [followUpSuggestions, setFollowUpSuggestions] = useState(null);
  const [analyzedContent, setAnalyzedContent] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [showTasksPreview, setShowTasksPreview] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [draftedEmail, setDraftedEmail] = useState(null);
  const [tasksToCreate, setTasksToCreate] = useState([]);

  const generateAgendaMutation = useMutation({
    mutationFn: () => SDK.functions.invoke('generateMeetingAgenda', {
      meeting_title: meeting.title,
      attendees: meeting.attendees,
      context: { include_chats: true }
    }),
    onSuccess: (response) => {
      setGeneratedAgenda(response.data);
      toast.success('Agenda generated!');
    },
    onError: () => {
      toast.error('Failed to generate agenda');
    }
  });

  const suggestFollowUpsMutation = useMutation({
    mutationFn: () => SDK.functions.invoke('suggestMeetingFollowups', {
      meeting_id: meeting.id
    }),
    onSuccess: (response) => {
      setFollowUpSuggestions(response.data.suggestions);
      toast.success('Follow-up suggestions ready!');
    },
    onError: () => {
      toast.error('Failed to generate suggestions');
    }
  });

  const analyzeContentMutation = useMutation({
    mutationFn: () => SDK.functions.invoke('analyzeMeetingContent', {
      meeting_id: meeting.id,
      outcome_notes: meeting.outcome_notes,
      attendees: meeting.attendees
    }),
    onSuccess: (response) => {
      setAnalyzedContent(response.data);
      toast.success('Meeting content analyzed!');
    },
    onError: () => {
      toast.error('Failed to analyze content');
    }
  });

  const draftEmailMutation = useMutation({
    mutationFn: () => SDK.functions.invoke('draftFollowUpEmail', {
      meeting_title: meeting.title,
      attendees: meeting.attendees,
      key_decisions: analyzedContent?.key_decisions,
      action_items: analyzedContent?.action_items,
      follow_up_topics: analyzedContent?.follow_up_topics,
      overall_summary: analyzedContent?.overall_summary
    }),
    onSuccess: (response) => {
      setDraftedEmail(response.data.email);
      setShowEmailPreview(true);
      toast.success('Email drafted!');
    },
    onError: () => {
      toast.error('Failed to draft email');
    }
  });

  const startEditing = (type, item, index) => {
    setEditingItem({ type, index });
    setEditedData({ ...item });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditedData(null);
  };

  const saveEdits = () => {
    if (!editingItem || !editedData) return;

    const { type, index } = editingItem;

    if (type === 'decision') {
      const newDecisions = [...analyzedContent.key_decisions];
      newDecisions[index] = editedData;
      setAnalyzedContent({ ...analyzedContent, key_decisions: newDecisions });
    } else if (type === 'action') {
      const newActions = [...analyzedContent.action_items];
      newActions[index] = editedData;
      setAnalyzedContent({ ...analyzedContent, action_items: newActions });
    } else if (type === 'followup') {
      const newTopics = [...analyzedContent.follow_up_topics];
      newTopics[index] = editedData;
      setAnalyzedContent({ ...analyzedContent, follow_up_topics: newTopics });
    }

    setEditingItem(null);
    setEditedData(null);
    toast.success('Changes saved!');
  };

  const handleAutoCreateTasks = () => {
    if (!analyzedContent?.action_items || analyzedContent.action_items.length === 0) {
      toast.error('No action items to create tasks from');
      return;
    }

    const tasks = analyzedContent.action_items.map(action => {
      const dueDate = action.deadline ? new Date(action.deadline) : new Date();
      if (!action.deadline) {
        dueDate.setDate(dueDate.getDate() + 7);
      }
      
      return {
        title: action.task,
        description: `Owner: ${action.owner}\n\n${action.context || ''}`,
        due_date: dueDate.toISOString(),
        priority: action.priority || 'medium',
        assigned_to: action.owner,
        status: 'todo',
        category: 'work',
        original: action
      };
    });

    setTasksToCreate(tasks);
    setShowTasksPreview(true);
  };

  const confirmCreateTasks = async () => {
    try {
      for (const task of tasksToCreate) {
        await onCreateTask(task);
      }
      toast.success(`${tasksToCreate.length} tasks created!`);
      setShowTasksPreview(false);
      setTasksToCreate([]);
    } catch (error) {
      toast.error('Failed to create some tasks');
    }
  };

  const updateTaskInPreview = (index, updates) => {
    const updated = [...tasksToCreate];
    updated[index] = { ...updated[index], ...updates };
    setTasksToCreate(updated);
  };

  const removeTaskFromPreview = (index) => {
    const updated = tasksToCreate.filter((_, i) => i !== index);
    setTasksToCreate(updated);
  };

  const handleSendEmail = async () => {
    if (!draftedEmail) return;

    try {
      await SDK.integrations.Core.SendEmail({
        to: draftedEmail.to.join(', '),
        subject: draftedEmail.subject,
        body: draftedEmail.body
      });
      toast.success('Follow-up email sent!');
      setShowEmailPreview(false);
    } catch (error) {
      toast.error('Failed to send email');
    }
  };

  const handleCreateTask = async (action) => {
    const dueDate = action.deadline ? new Date(action.deadline) : new Date();
    if (!action.deadline) {
      dueDate.setDate(dueDate.getDate() + 7);
    }
    
    await onCreateTask({
      title: action.task,
      description: `Owner: ${action.owner}\n\n${action.context || ''}`,
      due_date: dueDate.toISOString(),
      priority: action.priority || 'medium',
      assigned_to: action.owner,
      status: 'todo'
    });
    toast.success('Task created!');
  };

  const handleCreateFollowUpMeeting = async (followUpMeeting) => {
    const meetingDate = new Date(followUpMeeting.suggested_date || Date.now());
    
    await onCreateMeeting({
      title: followUpMeeting.title,
      attendees: followUpMeeting.attendees || meeting.attendees,
      proposed_times: [{
        date: meetingDate.toISOString().split('T')[0],
        start_time: '14:00',
        end_time: '15:00'
      }],
      description: `Follow-up to: ${meeting.title}\n\nTopics:\n${followUpMeeting.agenda_topics?.join('\n- ') || ''}`
    });
    toast.success('Follow-up meeting created!');
  };

  return (
    <div className="space-y-4">
      {/* AI Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateAgendaMutation.mutate()}
          disabled={generateAgendaMutation.isPending}
          className="border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          {generateAgendaMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          Generate Agenda
        </Button>

        {meeting.status === 'completed' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => analyzeContentMutation.mutate()}
              disabled={analyzeContentMutation.isPending}
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              {analyzeContentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Analyze Content
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => suggestFollowUpsMutation.mutate()}
              disabled={suggestFollowUpsMutation.isPending}
              className="border-teal-200 text-teal-700 hover:bg-teal-50"
            >
              {suggestFollowUpsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Suggest Follow-ups
            </Button>
          </>
        )}
      </div>

      {/* Quick Actions */}
      {analyzedContent && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-purple-600" />
            Quick Actions
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleAutoCreateTasks}
              disabled={!analyzedContent?.action_items?.length}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Auto-Create All Tasks ({analyzedContent?.action_items?.length || 0})
            </Button>
            <Button
              size="sm"
              onClick={() => draftEmailMutation.mutate()}
              disabled={draftEmailMutation.isPending}
              variant="outline"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              {draftEmailMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Draft Follow-up Email
            </Button>
          </div>
        </Card>
      )}

      {/* Generated Agenda */}
      {generatedAgenda && (
        <Card className="p-4 bg-purple-50 border-purple-200">
          <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            AI-Generated Agenda
          </h4>
          <div className="space-y-3">
            {generatedAgenda.agenda?.map((item, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{item.title}</div>
                    <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.duration_minutes}m
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {generatedAgenda.key_outcomes && generatedAgenda.key_outcomes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs font-medium text-purple-900 mb-2">Key Outcomes:</p>
              <ul className="text-sm text-slate-700 space-y-1">
                {generatedAgenda.key_outcomes.map((outcome, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Analyzed Content */}
      {analyzedContent && (
        <div className="space-y-4">
          {/* Key Decisions */}
          {analyzedContent.key_decisions && analyzedContent.key_decisions.length > 0 && (
            <Card className="p-4 bg-indigo-50 border-indigo-200">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Key Decisions
              </h4>
              <div className="space-y-3">
                {analyzedContent.key_decisions.map((decision, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg">
                    {editingItem?.type === 'decision' && editingItem.index === idx ? (
                      <div className="space-y-3">
                        <Input
                          value={editedData.decision}
                          onChange={(e) => setEditedData({ ...editedData, decision: e.target.value })}
                          placeholder="Decision"
                        />
                        <Textarea
                          value={editedData.rationale || ''}
                          onChange={(e) => setEditedData({ ...editedData, rationale: e.target.value })}
                          placeholder="Rationale"
                          rows={2}
                        />
                        <Input
                          value={editedData.decided_by || ''}
                          onChange={(e) => setEditedData({ ...editedData, decided_by: e.target.value })}
                          placeholder="Decided by"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdits}>
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">{decision.decision}</div>
                            {decision.rationale && (
                              <p className="text-sm text-slate-600 mt-1">{decision.rationale}</p>
                            )}
                            {decision.decided_by && (
                              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {decision.decided_by}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing('decision', decision, idx)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Action Items */}
          {analyzedContent.action_items && analyzedContent.action_items.length > 0 && (
            <Card className="p-4 bg-amber-50 border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Action Items
              </h4>
              <div className="space-y-3">
                {analyzedContent.action_items.map((action, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg">
                    {editingItem?.type === 'action' && editingItem.index === idx ? (
                      <div className="space-y-3">
                        <Input
                          value={editedData.task}
                          onChange={(e) => setEditedData({ ...editedData, task: e.target.value })}
                          placeholder="Task"
                        />
                        <Input
                          value={editedData.owner || ''}
                          onChange={(e) => setEditedData({ ...editedData, owner: e.target.value })}
                          placeholder="Owner"
                        />
                        <Input
                          type="date"
                          value={editedData.deadline || ''}
                          onChange={(e) => setEditedData({ ...editedData, deadline: e.target.value })}
                        />
                        <Select
                          value={editedData.priority || 'medium'}
                          onValueChange={(val) => setEditedData({ ...editedData, priority: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea
                          value={editedData.context || ''}
                          onChange={(e) => setEditedData({ ...editedData, context: e.target.value })}
                          placeholder="Context"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdits}>
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">{action.task}</div>
                            {action.context && (
                              <p className="text-sm text-slate-600 mt-1">{action.context}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {action.owner && (
                                <span className="text-xs text-slate-600 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {action.owner}
                                </span>
                              )}
                              {action.deadline && (
                                <span className="text-xs text-slate-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(action.deadline).toLocaleDateString()}
                                </span>
                              )}
                              {action.priority && (
                                <Badge variant="outline" className="text-xs">
                                  {action.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing('action', action, idx)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleCreateTask(action)}
                            >
                              Create Task
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Follow-up Topics */}
          {analyzedContent.follow_up_topics && analyzedContent.follow_up_topics.length > 0 && (
            <Card className="p-4 bg-green-50 border-green-200">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Potential Follow-up Topics
              </h4>
              <div className="space-y-3">
                {analyzedContent.follow_up_topics.map((topic, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg">
                    {editingItem?.type === 'followup' && editingItem.index === idx ? (
                      <div className="space-y-3">
                        <Input
                          value={editedData.topic}
                          onChange={(e) => setEditedData({ ...editedData, topic: e.target.value })}
                          placeholder="Topic"
                        />
                        <Textarea
                          value={editedData.reason || ''}
                          onChange={(e) => setEditedData({ ...editedData, reason: e.target.value })}
                          placeholder="Reason for follow-up"
                          rows={2}
                        />
                        <Input
                          value={editedData.suggested_attendees?.join(', ') || ''}
                          onChange={(e) => setEditedData({ ...editedData, suggested_attendees: e.target.value.split(',').map(s => s.trim()) })}
                          placeholder="Suggested attendees (comma-separated)"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdits}>
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">{topic.topic}</div>
                            {topic.reason && (
                              <p className="text-sm text-slate-600 mt-1">{topic.reason}</p>
                            )}
                            {topic.suggested_attendees && topic.suggested_attendees.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {topic.suggested_attendees.map((att, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {att}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing('followup', topic, idx)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Follow-up Suggestions */}
      {followUpSuggestions && (
        <Card className="p-4 bg-teal-50 border-teal-200">
          <h4 className="font-semibold text-teal-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Follow-up Suggestions
          </h4>

          {/* Tasks */}
          {followUpSuggestions.tasks && followUpSuggestions.tasks.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-teal-900 mb-2">Suggested Tasks:</p>
              <div className="space-y-2">
                {followUpSuggestions.tasks.map((task, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 text-sm">{task.title}</div>
                      <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                        <span className="text-xs text-slate-500">Due in {task.due_days} days</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreateTask(task)}
                      className="ml-2"
                    >
                      Create
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Meetings */}
          {followUpSuggestions.follow_up_meetings && followUpSuggestions.follow_up_meetings.length > 0 && (
            <div>
              <p className="text-xs font-medium text-teal-900 mb-2">Follow-up Meetings:</p>
              <div className="space-y-2">
                {followUpSuggestions.follow_up_meetings.map((fm, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 text-sm">{fm.title}</div>
                      {fm.agenda_topics && (
                        <ul className="text-xs text-slate-600 mt-1 ml-4 list-disc">
                          {fm.agenda_topics.slice(0, 2).map((topic, i) => (
                            <li key={i}>{topic}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreateFollowUpMeeting(fm)}
                      className="ml-2"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Schedule
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tasks Preview Modal */}
      <Dialog open={showTasksPreview} onOpenChange={setShowTasksPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Tasks Before Creating</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {tasksToCreate.map((task, idx) => (
              <Card key={idx} className="p-4">
                <div className="space-y-3">
                  <Input
                    value={task.title}
                    onChange={(e) => updateTaskInPreview(idx, { title: e.target.value })}
                    placeholder="Task title"
                  />
                  <Textarea
                    value={task.description}
                    onChange={(e) => updateTaskInPreview(idx, { description: e.target.value })}
                    placeholder="Description"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={task.assigned_to || ''}
                      onChange={(e) => updateTaskInPreview(idx, { assigned_to: e.target.value })}
                      placeholder="Assigned to"
                    />
                    <Input
                      type="date"
                      value={task.due_date ? task.due_date.split('T')[0] : ''}
                      onChange={(e) => updateTaskInPreview(idx, { 
                        due_date: new Date(e.target.value).toISOString() 
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Select
                      value={task.priority}
                      onValueChange={(val) => updateTaskInPreview(idx, { priority: val })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeTaskFromPreview(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTasksPreview(false)}>
              Cancel
            </Button>
            <Button onClick={confirmCreateTasks} disabled={tasksToCreate.length === 0}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Create {tasksToCreate.length} Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Preview Modal */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Follow-up Email</DialogTitle>
          </DialogHeader>
          {draftedEmail && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">To:</label>
                <Input
                  value={draftedEmail.to.join(', ')}
                  onChange={(e) => setDraftedEmail({ 
                    ...draftedEmail, 
                    to: e.target.value.split(',').map(s => s.trim()) 
                  })}
                  placeholder="Recipient emails"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Subject:</label>
                <Input
                  value={draftedEmail.subject}
                  onChange={(e) => setDraftedEmail({ ...draftedEmail, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Body:</label>
                <Textarea
                  value={draftedEmail.body}
                  onChange={(e) => setDraftedEmail({ ...draftedEmail, body: e.target.value })}
                  placeholder="Email body"
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}