import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MoreVertical, CheckSquare, Send, Calendar, 
  MessageSquare, Copy 
} from 'lucide-react';
import { toast } from 'sonner';

export default function MessageActions({ message, chatId }) {
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showSlackDialog, setShowSlackDialog] = useState(false);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateTask = async () => {
    setCreating(true);
    try {
      const response = await SDK.functions.invoke('createTaskFromMessage', {
        messageId: message.id,
        messageContent: message.message,
        dueDate: taskDueDate || null,
        priority: 'normal'
      });

      if (response.data.success) {
        toast.success('Task created from message');
        setShowTaskDialog(false);
      }
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleSendToSlack = async () => {
    if (!slackChannel) {
      toast.error('Please enter a channel');
      return;
    }

    setCreating(true);
    try {
      const response = await SDK.functions.invoke('sendToSlack', {
        channel: slackChannel,
        message: `${message.sender_name}: ${message.message}`,
        attachments: []
      });

      if (response.data.success) {
        toast.success('Sent to Slack');
        setShowSlackDialog(false);
      }
    } catch (error) {
      toast.error('Failed to send to Slack');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.message);
    toast.success('Message copied');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowTaskDialog(true)}>
            <CheckSquare className="w-4 h-4 mr-2" />
            Create Task
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowSlackDialog(true)}>
            <Send className="w-4 h-4 mr-2" />
            Send to Slack
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyMessage}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Message
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task from Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">{message.message}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Due Date (Optional)</label>
              <Input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask} disabled={creating}>
                {creating ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send to Slack Dialog */}
      <Dialog open={showSlackDialog} onOpenChange={setShowSlackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Slack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">{message.message}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Slack Channel</label>
              <Input
                placeholder="#general"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">Enter channel name with #</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSlackDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendToSlack} disabled={creating}>
                {creating ? 'Sending...' : 'Send to Slack'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}