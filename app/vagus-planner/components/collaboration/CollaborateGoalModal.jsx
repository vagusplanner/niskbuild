import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Mail, CheckCircle, Target } from 'lucide-react';
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

export default function CollaborateGoalModal({ isOpen, onClose, goal }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('collaborator');
  const [selectedSteps, setSelectedSteps] = useState([]);
  const [isInviting, setIsInviting] = useState(false);
  const [collaborators, setCollaborators] = useState([]);

  const handleInvite = async () => {
    if (!email.trim()) return;

    setIsInviting(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.GoalCollaborator.create({
        goal_id: goal.id,
        user_email: email,
        role: role,
        assigned_steps: selectedSteps,
        status: 'pending'
      });

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Join me in achieving: ${goal.title}`,
        body: `${user.full_name || user.email} has invited you to collaborate on a goal!\n\nGoal: ${goal.title}\nDescription: ${goal.description || 'No description'}\nRole: ${role}\n\nLog in to MyAssistant to accept.`
      });

      setCollaborators(prev => [...prev, { email, role }]);
      setEmail('');
      setSelectedSteps([]);
      toast.success('Invitation sent!');
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const toggleStep = (index) => {
    setSelectedSteps(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[80vh] flex flex-col"
          >
            <div className="p-6 border-b bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <UserPlus className="w-6 h-6" />
                  Add Collaborators
                </h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-purple-100 text-sm mt-1">{goal?.title}</p>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Invite by email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collaborator">Collaborator - Can edit & track</SelectItem>
                    <SelectItem value="viewer">Viewer - Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {role === 'collaborator' && goal?.action_steps && goal.action_steps.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign action steps (optional)</Label>
                  <div className="space-y-2 max-h-40 overflow-auto border rounded-lg p-3">
                    {goal.action_steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Checkbox
                          id={`step-${idx}`}
                          checked={selectedSteps.includes(idx)}
                          onCheckedChange={() => toggleStep(idx)}
                        />
                        <label htmlFor={`step-${idx}`} className="text-sm text-slate-700 cursor-pointer">
                          {step.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleInvite}
                disabled={isInviting || !email.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </Button>

              {collaborators.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-slate-700 mb-2">Invited</p>
                  <div className="space-y-2">
                    {collaborators.map((collab, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">{collab.email}</span>
                        <Badge variant="outline">{collab.role}</Badge>
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