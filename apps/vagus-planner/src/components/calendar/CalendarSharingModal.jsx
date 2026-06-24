import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Share2, UserPlus, Eye, Edit, UserCheck, Trash2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const PERMISSION_OPTIONS = [
  { value: 'view', label: 'View Only', icon: Eye, description: 'Can view events' },
  { value: 'edit', label: 'Edit', icon: Edit, description: 'Can view and edit events' },
  { value: 'invite', label: 'Full Access', icon: UserCheck, description: 'Can view, edit, and invite others' }
];

export default function CalendarSharingModal({ isOpen, onClose, groupCalendarId = null }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [notifyOnChanges, setNotifyOnChanges] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: sharedWith = [] } = useQuery({
    queryKey: ['shared-calendars', user?.email],
    queryFn: () => base44.entities.SharedCalendar.filter({ 
      owner_email: user.email,
      ...(groupCalendarId && { group_calendar_id: groupCalendarId })
    }),
    enabled: !!user
  });

  const shareMutation = useMutation({
    mutationFn: async (data) => {
      // Check if already shared
      const existing = sharedWith.find(s => s.shared_with_email === data.shared_with_email);
      if (existing) {
        toast.error('Calendar already shared with this user');
        return;
      }

      await base44.entities.SharedCalendar.create(data);
      
      // Send notification
      await base44.entities.Notification.create({
        user_email: data.shared_with_email,
        type: 'calendar_shared',
        title: 'Calendar Shared',
        message: `${user.full_name || user.email} shared a calendar with you`,
        priority: 'medium',
        action_url: '/Calendar'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-calendars'] });
      setEmail('');
      toast.success('Calendar shared successfully!');
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ id, permission }) => 
      base44.entities.SharedCalendar.update(id, { permission }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-calendars'] });
      toast.success('Permission updated');
    }
  });

  const removeSharingMutation = useMutation({
    mutationFn: (id) => base44.entities.SharedCalendar.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-calendars'] });
      toast.success('Sharing removed');
    }
  });

  const handleShare = () => {
    if (!email || !user) return;
    
    shareMutation.mutate({
      owner_email: user.email,
      shared_with_email: email.toLowerCase().trim(),
      permission,
      notify_on_changes: notifyOnChanges,
      calendar_type: groupCalendarId ? 'group' : 'personal',
      group_calendar_id: groupCalendarId
    });
  };

  const generateShareLink = () => {
    const link = `${window.location.origin}/calendar/shared/${user?.email}`;
    setShareLink(link);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-teal-600" />
            Share Calendar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share with Email */}
          <div className="space-y-3">
            <Label>Share with People</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleShare()}
                className="flex-1"
              />
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="w-3 h-3" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleShare}
                disabled={!email || shareMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={notifyOnChanges}
                onCheckedChange={setNotifyOnChanges}
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Notify on calendar changes
              </span>
            </div>
          </div>

          {/* Permission Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PERMISSION_OPTIONS.map(opt => (
              <div
                key={opt.value}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <opt.icon className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-sm">{opt.label}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {opt.description}
                </p>
              </div>
            ))}
          </div>

          {/* Shared With List */}
          {sharedWith.length > 0 && (
            <div className="space-y-3">
              <Label>Shared With ({sharedWith.length})</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {sharedWith.map((share) => (
                    <motion.div
                      key={share.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                            {share.shared_with_email.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{share.shared_with_email}</p>
                          <Badge variant="secondary" className="text-xs">
                            {PERMISSION_OPTIONS.find(p => p.value === share.permission)?.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={share.permission}
                          onValueChange={(val) => updatePermissionMutation.mutate({
                            id: share.id,
                            permission: val
                          })}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERMISSION_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Remove calendar sharing?')) {
                              removeSharingMutation.mutate(share.id);
                            }
                          }}
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Share Link */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Label>Or Share via Link</Label>
            {!shareLink ? (
              <Button
                variant="outline"
                onClick={generateShareLink}
                className="w-full"
              >
                Generate Shareable Link
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={copyLink}
                  className="gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}