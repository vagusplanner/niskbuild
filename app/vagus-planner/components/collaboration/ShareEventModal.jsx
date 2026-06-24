import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Mail, Check, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ShareEventModal({ isOpen, onClose, event }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [isSharing, setIsSharing] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);

  const handleShare = async () => {
    if (!email.trim()) return;

    setIsSharing(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.EventShare.create({
        event_id: event.id,
        shared_by: user.email,
        shared_with: email,
        permission: permission,
        status: 'pending'
      });

      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `${user.full_name || user.email} shared an event with you`,
        body: `You've been invited to view the event: "${event.title}"\n\nDate: ${event.date}\nTime: ${event.start_time || 'All day'}\n\nLog in to MyAssistant to view details.`
      });

      setSharedWith(prev => [...prev, { email, permission }]);
      setEmail('');
      toast.success('Event shared successfully!');
    } catch (error) {
      toast.error('Failed to share event');
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
            <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Share2 className="w-6 h-6" />
                  Share Event
                </h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-1">{event?.title}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Share with</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="flex-1"
                  />
                  <Select value={permission} onValueChange={setPermission}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleShare}
                disabled={isSharing || !email.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                {isSharing ? 'Sharing...' : 'Send Invite'}
              </Button>

              {sharedWith.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Shared with
                  </p>
                  <div className="space-y-2">
                    {sharedWith.map((share, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">{share.email}</span>
                        <Badge variant="outline">{share.permission}</Badge>
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