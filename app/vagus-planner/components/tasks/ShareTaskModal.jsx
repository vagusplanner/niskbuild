import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Mail, UserPlus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ShareTaskModal({ isOpen, onClose, task }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [delegate, setDelegate] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);

  const handleShare = async () => {
    if (!email.trim()) return;

    setIsSharing(true);
    try {
      const user = await base44.auth.me();
      
      // Share the task
      await base44.entities.TaskShare.create({
        task_id: task.id,
        shared_by: user.email,
        shared_with: email,
        permission: permission,
        status: 'pending'
      });

      // If delegating, update task assignment
      if (delegate) {
        await base44.entities.Task.update(task.id, {
          assigned_to: email,
          assigned_by: user.email
        });
      }

      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: delegate ? 
          `Task delegated to you: ${task.title}` :
          `${user.full_name || user.email} shared a task with you`,
        body: `${delegate ? 'You have been assigned a task' : 'A task has been shared with you'}:\n\n"${task.title}"\n\n${task.description || ''}\n\nDue: ${task.due_date || 'No deadline'}\nPriority: ${task.priority}\n\nLog in to MyAssistant to view details.`
      });

      setSharedWith(prev => [...prev, { email, permission, delegated: delegate }]);
      setEmail('');
      setDelegate(false);
      toast.success(delegate ? 'Task delegated successfully!' : 'Task shared successfully!');
    } catch (error) {
      toast.error('Failed to share task');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-6 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Share2 className="w-6 h-6" />
                  Share or Delegate Task
                </h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-emerald-100 text-sm mt-1">{task?.title}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Assign to</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Permission</Label>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="edit">Can Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
                <Checkbox
                  id="delegate"
                  checked={delegate}
                  onCheckedChange={setDelegate}
                />
                <label
                  htmlFor="delegate"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Delegate task ownership to this person
                </label>
              </div>

              <Button
                onClick={handleShare}
                disabled={isSharing || !email.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                {isSharing ? 'Sending...' : delegate ? 'Delegate Task' : 'Share Task'}
              </Button>

              {sharedWith.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Shared with
                  </p>
                  <div className="space-y-2">
                    {sharedWith.map((share, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">{share.email}</span>
                        <div className="flex gap-1">
                          <Badge variant="outline">{share.permission}</Badge>
                          {share.delegated && <Badge className="bg-emerald-100 text-emerald-700">Assigned</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}