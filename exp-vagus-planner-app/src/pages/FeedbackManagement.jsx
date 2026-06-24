import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, Bug, Lightbulb, CheckCircle2, Clock,
  XCircle, Search, Filter, ChevronDown, Send, Shield,
  TrendingUp, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_COLORS = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-purple-100 text-purple-700',
  planned: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-green-100 text-green-700',
  declined: 'bg-slate-100 text-slate-700'
};

const TYPE_ICONS = {
  feedback: MessageSquare,
  bug_report: Bug,
  feature_request: Lightbulb
};

export default function FeedbackManagement() {
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: allFeedback = [] } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => SDK.entities.Feedback.list('-created_date')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.Feedback.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      toast.success('Feedback updated');
      setSelectedFeedback(null);
    }
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Admin Access Required</h2>
            <p className="text-slate-600">
              You need administrator privileges to access feedback management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredFeedback = allFeedback.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: allFeedback.length,
    submitted: allFeedback.filter(f => f.status === 'submitted').length,
    in_progress: allFeedback.filter(f => f.status === 'in_progress').length,
    completed: allFeedback.filter(f => f.status === 'completed').length,
    bugs: allFeedback.filter(f => f.type === 'bug_report').length,
    features: allFeedback.filter(f => f.type === 'feature_request').length
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-teal-600" />
              Feedback Management
            </h1>
            <p className="text-slate-500 mt-1">Review and manage user feedback</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Total</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">New</p>
              <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-cyan-600">{stats.in_progress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Bugs</p>
              <p className="text-2xl font-bold text-red-600">{stats.bugs}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Features</p>
              <p className="text-2xl font-bold text-amber-600">{stats.features}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search feedback..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="bug_report">Bug Reports</SelectItem>
                  <SelectItem value="feature_request">Feature Requests</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Feedback List */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Items ({filteredFeedback.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredFeedback.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No feedback found</p>
                </div>
              ) : (
                filteredFeedback.map((item) => {
                  const Icon = TYPE_ICONS[item.type] || MessageSquare;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 border rounded-xl hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedFeedback(item)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Icon className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="font-semibold text-slate-800">{item.title}</h3>
                            <Badge className={STATUS_COLORS[item.status]}>
                              {item.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>By: {item.user_name}</span>
                            <span>•</span>
                            <span>{format(new Date(item.created_date), 'MMM d, yyyy')}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                            {item.upvotes > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  {item.upvotes} upvotes
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onUpdate={(data) => {
            updateMutation.mutate({ id: selectedFeedback.id, data });
          }}
        />
      )}
    </div>
  );
}

function FeedbackDetailModal({ feedback, onClose, onUpdate }) {
  const [status, setStatus] = useState(feedback.status);
  const [adminResponse, setAdminResponse] = useState(feedback.admin_response || '');
  const [adminNotes, setAdminNotes] = useState(feedback.admin_notes || '');

  const Icon = TYPE_ICONS[feedback.type] || MessageSquare;

  const handleSave = () => {
    onUpdate({
      status,
      admin_response: adminResponse,
      admin_notes: adminNotes
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            Feedback Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">{feedback.title}</h3>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span>{feedback.user_name}</span>
                <span>•</span>
                <span>{format(new Date(feedback.created_date), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
            <Badge className={STATUS_COLORS[feedback.status]}>
              {feedback.status.replace('_', ' ')}
            </Badge>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Description
            </label>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-800 whitespace-pre-wrap">{feedback.description}</p>
            </div>
          </div>

          {/* Status Update */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Update Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Admin Response */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Response to User
            </label>
            <Textarea
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              placeholder="Write a response that will be visible to the user..."
              rows={4}
            />
          </div>

          {/* Admin Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Internal Notes
            </label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Private notes for internal use..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} className="flex-1 bg-teal-600 hover:bg-teal-700">
              <Send className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}