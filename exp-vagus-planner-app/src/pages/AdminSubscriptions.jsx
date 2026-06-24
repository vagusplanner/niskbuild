import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  AlertCircle,
  Download,
  Search,
  Filter,
  Calendar,
  CreditCard,
  XCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Mail,
  Edit3,
  Trash2,
  Tag,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedSub, setSelectedSub] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(''); // upgrade, downgrade, refund, cancel, discount
  const [refundAmount, setRefundAmount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [newPlan, setNewPlan] = useState('');

  // Fetch all subscriptions
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => SDK.entities.Subscription.list()
  });

  // Fetch all invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => SDK.entities.Invoice.list()
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (period) => {
      const { data } = await SDK.functions.invoke('generateSubscriptionReports', {
        reportType: 'automated',
        period
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.report.period} report generated and emailed`);
    },
    onError: () => toast.error('Failed to generate report')
  });

  // Retry payment mutation
  const retryPaymentMutation = useMutation({
    mutationFn: async (subscriptionId) => {
      await SDK.functions.invoke('automatedBillingHandler', {
        action: 'retry_payment',
        subscriptionId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Payment retry initiated');
    },
    onError: () => toast.error('Failed to retry payment')
  });

  // Apply grace period mutation
  const applyGracePeriodMutation = useMutation({
    mutationFn: async (subscriptionId) => {
      await SDK.functions.invoke('automatedBillingHandler', {
        action: 'apply_grace_period',
        subscriptionId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Grace period applied');
    },
    onError: () => toast.error('Failed to apply grace period')
  });

  // Upgrade/Downgrade mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ subId, userEmail, fromPlan, toPlan }) => {
      await SDK.entities.Subscription.update(subId, { plan: toPlan });
      await SDK.functions.invoke('sendBillingEmail', {
        emailType: 'upgrade_success',
        userEmail,
        data: {
          planName: toPlan.charAt(0).toUpperCase() + toPlan.slice(1),
          amount: planPricing[toPlan],
          nextBillingDate: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Plan updated and email sent');
      setShowActionModal(false);
    },
    onError: () => toast.error('Failed to update plan')
  });

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: async ({ subId, userEmail, amount }) => {
      await SDK.entities.Invoice.create({
        user_email: userEmail,
        amount: -Math.abs(amount),
        status: 'refunded',
        description: `Manual refund: $${amount}`
      });
      await SDK.functions.invoke('sendBillingEmail', {
        emailType: 'payment_success',
        userEmail,
        data: {
          planName: 'Refund',
          amount: amount,
          billingDate: new Date().toLocaleDateString(),
          nextBillingDate: 'N/A'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions', 'admin-invoices'] });
      toast.success('Refund processed and email sent');
      setShowActionModal(false);
    },
    onError: () => toast.error('Failed to process refund')
  });

  // Cancel subscription mutation
  const cancelSubMutation = useMutation({
    mutationFn: async ({ subId, userEmail, plan }) => {
      await SDK.entities.Subscription.update(subId, { 
        status: 'canceled',
        canceled_at: new Date().toISOString()
      });
      await SDK.functions.invoke('sendBillingEmail', {
        emailType: 'cancellation_confirmed',
        userEmail,
        data: {
          planName: plan.charAt(0).toUpperCase() + plan.slice(1),
          accessUntil: new Date().toLocaleDateString()
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Subscription canceled and email sent');
      setShowActionModal(false);
    },
    onError: () => toast.error('Failed to cancel subscription')
  });

  // Apply discount mutation
  const applyDiscountMutation = useMutation({
    mutationFn: async ({ subId, userEmail, percent }) => {
      await SDK.entities.Subscription.update(subId, { 
        discount_percent: percent,
        discount_applied_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success(`${discountPercent}% discount applied`);
      setShowActionModal(false);
    },
    onError: () => toast.error('Failed to apply discount')
  });

  // Calculate metrics
  const planPricing = {
    basic: 7.99,
    pro: 14.99,
    premium: 49.99
  };

  const handleAction = async () => {
    if (!selectedSub) return;
    
    switch (actionType) {
      case 'upgrade':
      case 'downgrade':
        await updatePlanMutation.mutateAsync({
          subId: selectedSub.id,
          userEmail: selectedSub.user_email,
          fromPlan: selectedSub.plan,
          toPlan: newPlan
        });
        break;
      case 'refund':
        await refundMutation.mutateAsync({
          subId: selectedSub.id,
          userEmail: selectedSub.user_email,
          amount: parseFloat(refundAmount)
        });
        break;
      case 'cancel':
        await cancelSubMutation.mutateAsync({
          subId: selectedSub.id,
          userEmail: selectedSub.user_email,
          plan: selectedSub.plan
        });
        break;
      case 'discount':
        await applyDiscountMutation.mutateAsync({
          subId: selectedSub.id,
          userEmail: selectedSub.user_email,
          percent: parseFloat(discountPercent)
        });
        break;
    }
  };

  const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'grace_period');
  const mrr = activeSubs.reduce((sum, sub) => sum + (planPricing[sub.plan] || 0), 0);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentCancellations = subscriptions.filter(s => 
    s.canceled_at && new Date(s.canceled_at) >= thirtyDaysAgo
  ).length;
  
  const churnRate = activeSubs.length > 0 
    ? (recentCancellations / (activeSubs.length + recentCancellations)) * 100 
    : 0;

  const failedPayments = subscriptions.filter(s => s.status === 'past_due').length;
  
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.plan?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'all' || sub.plan === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const statusBadges = {
    active: { variant: 'default', icon: CheckCircle, className: 'bg-green-100 text-green-700' },
    past_due: { variant: 'destructive', icon: AlertCircle, className: 'bg-red-100 text-red-700' },
    canceled: { variant: 'secondary', icon: XCircle, className: 'bg-slate-100 text-slate-700' },
    grace_period: { variant: 'outline', icon: Clock, className: 'bg-amber-100 text-amber-700' }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <RoleGuard requiredRoles={['admin']}>
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Subscription Management</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Monitor and manage all subscriptions</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => generateReportMutation.mutate(selectedPeriod)}
              disabled={generateReportMutation.isPending}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">MRR</CardTitle>
              <DollarSign className="w-4 h-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                ${mrr.toFixed(0)}
              </div>
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                Monthly Recurring
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
              <Users className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {activeSubs.length}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {subscriptions.length} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Churn Rate</CardTitle>
              <TrendingDown className="w-4 h-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {churnRate.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Failed Payments</CardTitle>
              <AlertCircle className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {failedPayments}
              </div>
              <p className="text-xs text-red-600 mt-1">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
            <CardDescription>Search and filter customer subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by email or plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="grace_period">Grace Period</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        No subscriptions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubscriptions.map(sub => {
                      const statusBadge = statusBadges[sub.status] || statusBadges.active;
                      const StatusIcon = statusBadge.icon;
                      
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.user_email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {sub.plan}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1", statusBadge.className)}>
                              <StatusIcon className="w-3 h-3" />
                              {sub.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sub.current_period_end 
                              ? format(new Date(sub.current_period_end), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>${(planPricing[sub.plan] * (100 - (sub.discount_percent || 0)) / 100).toFixed(2) || '0.00'} {sub.discount_percent > 0 && <span className="text-xs text-green-600">(-{sub.discount_percent}%)</span>}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedSub(sub); setActionType(''); setShowActionModal(true); }}
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              {sub.status === 'past_due' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => retryPaymentMutation.mutate(sub.stripe_subscription_id)}
                                  disabled={retryPaymentMutation.isPending}
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Management Modal */}
        <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Subscription</DialogTitle>
              {selectedSub && <DialogDescription>{selectedSub.user_email}</DialogDescription>}
            </DialogHeader>
           {selectedSub && (
             <div className="space-y-4">
               {!actionType ? (
                 <div className="grid grid-cols-2 gap-2">
                   <Button onClick={() => setActionType('upgrade')} variant="outline" className="h-auto py-3">Upgrade Plan</Button>
                   <Button onClick={() => setActionType('downgrade')} variant="outline" className="h-auto py-3">Downgrade Plan</Button>
                   <Button onClick={() => setActionType('discount')} variant="outline" className="h-auto py-3">Apply Discount</Button>
                   <Button onClick={() => setActionType('refund')} variant="outline" className="h-auto py-3">Refund</Button>
                   <Button onClick={() => setActionType('cancel')} variant="destructive" className="col-span-2 h-auto py-3">Cancel Sub</Button>
                 </div>
               ) : actionType === 'upgrade' || actionType === 'downgrade' ? (
                 <div className="space-y-3">
                   <Select value={newPlan} onValueChange={setNewPlan}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select new plan" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="basic">Basic - $7.99/mo</SelectItem>
                       <SelectItem value="pro">Pro - $14.99/mo</SelectItem>
                       <SelectItem value="premium">Premium - $49.99/mo</SelectItem>
                     </SelectContent>
                   </Select>
                   <div className="text-sm text-slate-600">Current: <strong>{selectedSub.plan}</strong> → New: <strong>{newPlan || '?'}</strong></div>
                   <Button onClick={handleAction} className="w-full" disabled={!newPlan || updatePlanMutation.isPending}>
                     {updatePlanMutation.isPending ? 'Processing...' : 'Update & Send Email'}
                   </Button>
                 </div>
               ) : actionType === 'discount' ? (
                 <div className="space-y-3">
                   <Input
                     type="number"
                     placeholder="Discount %"
                     min="0"
                     max="100"
                     value={discountPercent}
                     onChange={(e) => setDiscountPercent(e.target.value)}
                   />
                   <div className="text-sm text-slate-600">New Price: ${((planPricing[selectedSub.plan] || 0) * (100 - parseFloat(discountPercent || 0)) / 100).toFixed(2)}/mo</div>
                   <Button onClick={handleAction} className="w-full" disabled={!discountPercent || applyDiscountMutation.isPending}>
                     {applyDiscountMutation.isPending ? 'Applying...' : 'Apply Discount'}
                   </Button>
                 </div>
               ) : actionType === 'refund' ? (
                 <div className="space-y-3">
                   <Input
                     type="number"
                     placeholder="Refund amount"
                     value={refundAmount}
                     onChange={(e) => setRefundAmount(e.target.value)}
                   />
                   <Button onClick={handleAction} className="w-full" disabled={!refundAmount || refundMutation.isPending}>
                     {refundMutation.isPending ? 'Processing...' : 'Process & Send Email'}
                   </Button>
                 </div>
               ) : actionType === 'cancel' ? (
                 <div className="space-y-3">
                   <p className="text-sm text-red-600">This will immediately cancel the subscription and send a confirmation email.</p>
                   <Button onClick={handleAction} className="w-full bg-red-600 hover:bg-red-700" disabled={cancelSubMutation.isPending}>
                     {cancelSubMutation.isPending ? 'Canceling...' : 'Confirm Cancel'}
                   </Button>
                 </div>
               ) : null}
               {actionType && (
                 <Button onClick={() => setActionType('')} variant="outline" className="w-full">Back</Button>
               )}
             </div>
           )}
         </DialogContent>
        </Dialog>
        </div>
        </RoleGuard>
        );
        }