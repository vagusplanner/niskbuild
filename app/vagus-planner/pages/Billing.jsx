import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { toast } from 'sonner';
import { ChevronRight, ArrowRight, Zap, Star, Clock } from 'lucide-react';
import PlanComparison from '@/components/billing/PlanComparison';
import SubscriptionCard from '@/components/billing/SubscriptionCard';
import EnhancedSubscriptionCard from '@/components/billing/EnhancedSubscriptionCard';
import BillingHistory from '@/components/billing/BillingHistory';
import UsageTracker from '@/components/billing/UsageTracker';
import PaymentMethodManager from '@/components/billing/PaymentMethodManager';
import EmailNotificationSettings from '@/components/billing/EmailNotificationSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AIBusinessInsights from '@/components/analytics/AIBusinessInsights';
import AIPlanRecommendation from '@/components/billing/AIPlanRecommendation';

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [showPlanComparison, setShowPlanComparison] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Handle Stripe redirect back
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('Payment successful! Your subscription is being activated.');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      toast.info('Checkout cancelled. No charges were made.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch subscription
  const { data: subscriptions = [], isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => base44.entities.Subscription.list()
  });
  const subscription = subscriptions[0];

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list()
  });

  // Fetch usage for current user
  const { data: usageData = [] } = useQuery({
    queryKey: ['usage', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Usage.filter({ user_email: user.email });
    },
    enabled: !!user?.email
  });

  // Upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: async ({ planId, planName, billingCycle, overridePriceId }) => {
      if (window.self !== window.top) {
        toast.error('Checkout is only available in the published app, not in the preview.');
        return;
      }

      setIsProcessingCheckout(true);
      const priceId = overridePriceId || getPriceId(planId, billingCycle);
      
      // Show loading toast
      const loadingToast = toast.loading('Preparing checkout session...');
      
      try {
        const { data } = await base44.functions.invoke('createStripeCheckout', {
          priceId,
          planName,
          billingCycle
        });

        console.log('Checkout response:', data);

        if (data?.error) {
          toast.dismiss(loadingToast);
          throw new Error(data.error);
        }

        if (data?.isPreview) {
          toast.dismiss(loadingToast);
          toast.error('Checkout only available in published apps. Please publish your app first.');
          setIsProcessingCheckout(false);
          return;
        }

        if (data?.sessionUrl) {
          console.log('Redirecting to:', data.sessionUrl);
          toast.dismiss(loadingToast);
          toast.success('Redirecting to checkout...');
          
          // Small delay to ensure toast is shown
          setTimeout(() => {
            window.location.href = data.sessionUrl;
          }, 500);
        } else {
          toast.dismiss(loadingToast);
          throw new Error('No checkout URL received');
        }
      } catch (error) {
        console.error('Checkout error:', error);
        toast.dismiss(loadingToast);
        setIsProcessingCheckout(false);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Failed to start checkout. Please try again.');
      setIsProcessingCheckout(false);
    }
  });

  // Cancel subscription
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (subscription?.stripe_subscription_id) {
        await base44.functions.invoke('cancelStripeSubscription', {
          subscriptionId: subscription.stripe_subscription_id,
          reason: 'User requested cancellation'
        });
        await queryClient.invalidateQueries({ queryKey: ['subscription'] });
        toast.success('Subscription cancelled');
      }
    },
    onError: () => toast.error('Failed to cancel subscription')
  });

  // Customer Portal
  const handleManageSubscription = async () => {
    try {
      setIsProcessingCheckout(true);
      const loadingToast = toast.loading('Opening Stripe Customer Portal...');
      
      const { data } = await base44.functions.invoke('createCustomerPortalSession');

      if (data?.isPreview) {
        toast.dismiss(loadingToast);
        toast.error('Customer Portal only available in published apps');
        setIsProcessingCheckout(false);
        return;
      }

      if (data?.portalUrl) {
        toast.dismiss(loadingToast);
        toast.success('Redirecting to Customer Portal...');
        setTimeout(() => {
          window.location.href = data.portalUrl;
        }, 500);
      } else if (data?.error) {
        toast.dismiss(loadingToast);
        toast.error(data.error);
        setIsProcessingCheckout(false);
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open Customer Portal');
      setIsProcessingCheckout(false);
    }
  };

  const getPriceId = (planId, billingCycle = 'monthly') => {
    const priceIds = {
      basic: {
        monthly: 'price_1T1BluJyFnU6pCi2dPp6i0GS',
        annual: 'price_1T1BluJyFnU6pCi2W4CQkEvy'
      },
      pro: {
        monthly: 'price_1T1BluJyFnU6pCi2imsJixKd',
        annual: 'price_1T1BluJyFnU6pCi2RtkCllVn'
      },
      enterprise: {
        monthly: 'price_1T1BluJyFnU6pCi2hxmAwN6t',
        annual: 'price_1T1BluJyFnU6pCi2ncPv3r6R'
      }
    };
    return priceIds[planId]?.[billingCycle] || priceIds.basic.monthly;
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleDownloadInvoice = (invoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    }
  };

  if (subLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  // If no subscription, show free tier
  const currentSubscription = subscription || {
    plan: 'free',
    status: 'active',
    user_email: user?.email
  };

  return (
    <RoleGuard requiredFeature="billing">
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-safe">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Billing & Subscription</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage your plan, invoices, and usage</p>
      </div>

      {/* Free Trial CTA — shown prominently for free users */}
      {currentSubscription.plan === 'free' && (
        <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 p-5 sm:p-6 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-semibold text-teal-100 uppercase tracking-wide">14-Day Free Trial</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1">Try Pro — completely free</h2>
              <p className="text-teal-100 text-sm">No credit card required. Cancel anytime. Full access to all features.</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm text-teal-100">
                  <Star className="w-4 h-4 text-yellow-300" />
                  <span>AI Scheduling</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-teal-100">
                  <Clock className="w-4 h-4 text-yellow-300" />
                  <span>Prayer Alerts</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-teal-100">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span>Unlimited Events</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowPlanComparison(true)}
              className="bg-white text-teal-700 hover:bg-teal-50 font-bold px-6 py-3 text-base rounded-xl shadow-lg whitespace-nowrap flex-shrink-0 min-h-[48px]"
            >
              Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Current Subscription & Payment */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4">Current Subscription</h2>
          <EnhancedSubscriptionCard
            subscription={currentSubscription}
            usageData={usageData}
            onManage={handleManageSubscription}
            onUpgrade={(planId, planName) => {
              if (planId !== currentSubscription.plan) {
                setShowPlanComparison(true);
              }
            }}
            onCancel={() => cancelMutation.mutate()}
          />
        </div>
        {currentSubscription.plan !== 'free' && (
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4">Payment</h2>
            <PaymentMethodManager
              paymentMethodId={currentSubscription.payment_method_id}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['subscription'] })}
            />
          </div>
        )}
      </section>

      {/* AI Insights */}
      <section>
        <AIBusinessInsights section="billing" />
      </section>

      {/* Usage Tracker */}
      <section>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4">Usage & Limits</h2>
        <UsageTracker usageData={usageData} plan={currentSubscription.plan} />
      </section>

      {/* AI Plan Recommendation */}
      {currentSubscription.plan !== 'enterprise' && (
        <section>
          <AIPlanRecommendation
            currentPlan={currentSubscription.plan}
            usageData={usageData}
            onUpgrade={(planId) => setShowPlanComparison(true)}
          />
        </section>
      )}

      {/* Upgrade Section */}
      {currentSubscription.plan === 'free' && (
        <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40 border-teal-200 dark:border-teal-800">
          <CardHeader>
            <CardTitle className="text-teal-900 dark:text-teal-100">Ready to unlock more features?</CardTitle>
            <CardDescription className="text-teal-700 dark:text-teal-300">
              Upgrade to access advanced features, more AI requests, and priority support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowPlanComparison(true)}
              className="bg-teal-600 hover:bg-teal-700 gap-2"
            >
              View Plans <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison Modal */}
      <Dialog open={showPlanComparison} onOpenChange={(open) => {
        if (!isProcessingCheckout) setShowPlanComparison(open);
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 z-[200]">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              {isProcessingCheckout ? 'Processing your checkout...' : 'Choose the plan that best fits your needs'}
            </DialogDescription>
          </DialogHeader>
          {isProcessingCheckout ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Preparing your checkout session...</p>
            </div>
          ) : (
            <PlanComparison
              currentPlan={currentSubscription.plan}
              isProcessing={isProcessingCheckout || upgradeMutation.isPending}
              onUpgrade={(planId, billingCycle, priceId) => {
                if (planId !== currentSubscription.plan && planId !== 'free') {
                  const planNames = {
                    basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise',
                    basic_islamic: 'Basic Islamic', pro_islamic: 'Pro Islamic', enterprise_islamic: 'Enterprise Islamic'
                  };
                  upgradeMutation.mutate({ planId, planName: planNames[planId] || planId, billingCycle, overridePriceId: priceId });
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Email Notification Settings */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Email Preferences</h2>
        <EmailNotificationSettings />
      </section>

      {/* Billing History */}
      <section>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4">Billing History</h2>
        <BillingHistory
          invoices={invoices}
          onViewInvoice={handleViewInvoice}
          onDownloadInvoice={handleDownloadInvoice}
        />
      </section>

      {/* Invoice Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="bg-white dark:bg-slate-900 z-[200]">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Amount</p>
                  <p className="font-semibold">${selectedInvoice.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-600">Date</p>
                  <p className="font-semibold">{new Date(selectedInvoice.issued_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-slate-600">Plan</p>
                  <p className="font-semibold capitalize">{selectedInvoice.plan}</p>
                </div>
                <div>
                  <p className="text-slate-600">Status</p>
                  <p className="font-semibold capitalize">{selectedInvoice.status}</p>
                </div>
              </div>
              
              {selectedInvoice.pdf_url && (
                <Button 
                  onClick={() => window.open(selectedInvoice.pdf_url, '_blank')}
                  className="w-full gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  Download PDF
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </RoleGuard>
  );
}