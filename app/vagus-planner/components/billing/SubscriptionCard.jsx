import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, CreditCard, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PLAN_COLORS = {
  free: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700' },
  basic: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  pro: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700' },
  premium: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' }
};

export default function SubscriptionCard({ subscription, onManage, onUpgrade, onCancel }) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const colors = PLAN_COLORS[subscription.plan];

  return (
    <Card className={cn(colors.bg, colors.border, 'border-2')}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="capitalize flex items-center gap-2">
              {subscription.plan === 'free' ? 'Free Plan' : (
                <>
                  <Zap className="w-5 h-5" />
                  {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan
                </>
              )}
            </CardTitle>
            <CardDescription>
              {subscription.plan === 'free' 
                ? 'Upgrade anytime to unlock premium features'
                : `$${subscription.price_per_month || 0}/month`}
            </CardDescription>
          </div>
          <Badge className={colors.badge}>
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trial Info */}
        {subscription.trial_end && subscription.status === 'trialing' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900">Trial ends {format(new Date(subscription.trial_end), 'MMM d, yyyy')}</p>
              <p className="text-amber-700">Your plan will automatically renew after trial.</p>
            </div>
          </div>
        )}

        {/* Past Due */}
        {subscription.status === 'past_due' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-red-900">Payment overdue</p>
              <p className="text-red-700">Please update your payment method to continue.</p>
            </div>
          </div>
        )}

        {/* Billing Period */}
        {subscription.current_period_start && subscription.current_period_end && (
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Calendar className="w-4 h-4" />
              <span>Billing Period</span>
            </div>
            <p className="text-sm">
              {format(new Date(subscription.current_period_start), 'MMM d')} – {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
            </p>
          </div>
        )}

        {/* Payment Method */}
        {subscription.plan !== 'free' && (
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <CreditCard className="w-4 h-4" />
              <span>Payment Method</span>
            </div>
            <p className="text-sm">•••• {subscription.payment_method_id?.slice(-4) || 'Not set'}</p>
          </div>
        )}

        {/* Auto-Renew */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Auto-renewal</span>
          <Badge variant={subscription.auto_renew ? 'default' : 'outline'}>
            {subscription.auto_renew ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          {subscription.plan !== 'free' && (
            <>
              <Button variant="outline" className="flex-1" onClick={onManage}>
                Manage Billing
              </Button>
              {!showCancelConfirm ? (
                <Button 
                  variant="outline" 
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel
                </Button>
              ) : (
                <>
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => onCancel()}
                  >
                    Confirm Cancel
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Keep
                  </Button>
                </>
              )}
            </>
          )}
          {subscription.plan === 'free' && (
            <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => onUpgrade('basic')}>
              Upgrade Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}