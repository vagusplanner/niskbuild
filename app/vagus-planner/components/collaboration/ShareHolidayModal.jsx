import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, Mail, Eye, Edit3, Shield, Check, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ShareHolidayModal({ isOpen, onClose, holiday }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const queryClient = useQueryClient();

  const { data: shares = [] } = useQuery({
    queryKey: ['holiday-shares', holiday?.id],
    queryFn: () => base44.entities.HolidayShare.filter({ holiday_id: holiday.id }),
    enabled: !!holiday?.id && isOpen
  });

  const shareMutation = useMutation({
    mutationFn: (data) => base44.entities.HolidayShare.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holiday-shares'] });
      setEmail('');
      setPermission('view');
      toast.success('Invitation sent!');
    }
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.HolidayShare.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holiday-shares'] });
      toast.success('Collaborator removed');
    }
  });

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email || !holiday) return;

    const user = await base44.auth.me();
    
    if (email === user.email) {
      toast.error('Cannot share with yourself');
      return;
    }

    shareMutation.mutate({
      holiday_id: holiday.id,
      shared_by: user.email,
      shared_with: email,
      permission
    });
  };

  const getPermissionIcon = (perm) => {
    switch (perm) {
      case 'view': return Eye;
      case 'edit': return Edit3;
      case 'manage': return Shield;
      default: return Eye;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted': return Check;
      case 'pending': return Clock;
      case 'declined': return XCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'declined': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (!holiday) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Holiday: {holiday.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleShare} className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Permission Level</Label>
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <div>
                      <div className="font-medium">View Only</div>
                      <div className="text-xs text-slate-500">Can see trip details</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Edit</div>
                      <div className="text-xs text-slate-500">Can suggest changes and add notes</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="manage">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Manage</div>
                      <div className="text-xs text-slate-500">Full control over trip planning</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={shareMutation.isPending}>
            <UserPlus className="w-4 h-4 mr-2" />
            Send Invitation
          </Button>
        </form>

        {shares.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-slate-800 mb-3">Collaborators ({shares.length})</h3>
            <div className="space-y-2">
              {shares.map((share) => {
                const PermIcon = getPermissionIcon(share.permission);
                const StatusIcon = getStatusIcon(share.status);
                
                return (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-full">
                        <Mail className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{share.shared_with}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <PermIcon className="w-3 h-3 mr-1" />
                            {share.permission}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(share.status)}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {share.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMutation.mutate(share.id)}
                      disabled={removeMutation.isPending}
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}