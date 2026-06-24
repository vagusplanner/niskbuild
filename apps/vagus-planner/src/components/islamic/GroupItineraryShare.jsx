import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2, MapPin, Calendar, Users, DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupItineraryShare({ group, itinerary }) {
  const [showShare, setShowShare] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  const handleShareItinerary = async () => {
    if (!memberEmail) {
      toast.error('Please enter member email');
      return;
    }

    setSharing(true);
    try {
      // Add member to group
      const members = [...(group.members || [])];
      if (!members.find(m => m.email === memberEmail)) {
        members.push({
          email: memberEmail,
          status: 'pending'
        });
      }

      // Update group with shared itinerary
      await base44.entities.PilgrimageGroup.update(group.id, {
        members,
        shared_itinerary: itinerary,
        shared_budget: group.shared_budget
      });

      toast.success('Itinerary shared! Invitation sent to member.');
      setMemberEmail('');
      setShowShare(false);
    } catch (error) {
      toast.error('Failed to share itinerary');
    } finally {
      setSharing(false);
    }
  };

  if (!itinerary) return null;

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">Shared Group Itinerary</h3>
          <Button onClick={() => setShowShare(true)} size="sm" variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share with Members
          </Button>
        </div>

        {/* Itinerary Preview */}
        <div className="grid gap-3">
          {itinerary.daily_schedule?.slice(0, 3).map((day, idx) => (
            <Card key={idx} className="bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">Day {day.day}: {day.title}</h4>
                    <div className="mt-2 space-y-1">
                      {day.activities?.slice(0, 2).map((activity, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                          <Badge className="text-xs">{activity.type}</Badge>
                          <span>{activity.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {day.activities?.length > 2 && (
                    <span className="text-xs text-slate-500">+{day.activities.length - 2} more</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {itinerary.daily_schedule?.length > 3 && (
          <p className="text-sm text-slate-500 text-center">
            ...and {itinerary.daily_schedule.length - 3} more days
          </p>
        )}

        {/* Budget Summary */}
        {itinerary.budget_breakdown && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Budget Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(itinerary.budget_breakdown).slice(0, 3).map(([category, amount]) => (
                <div key={category} className="flex justify-between text-sm">
                  <span className="text-slate-600 capitalize">{category.replace('_', ' ')}</span>
                  <span className="font-medium">${amount}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={showShare} onOpenChange={setShowShare}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Itinerary with Group Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Member Email</Label>
              <Input
                placeholder="member@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                They'll receive an invitation and can view the shared itinerary and participate in group planning.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowShare(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleShareItinerary}
                disabled={sharing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {sharing ? 'Sharing...' : 'Share Itinerary'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}