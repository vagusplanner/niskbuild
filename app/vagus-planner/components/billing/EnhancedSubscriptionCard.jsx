import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

const planFeatures = {
  free: {
    name: 'Free',
    color: 'slate',
    features: ['100 AI requests/month', '50 events', '50 tasks', 'Basic support'],
    limits: { ai_requests: 100, events: 50, tasks: 50 }
  },
  basic: {
    name: 'Basic',
    price: 9.99,
    color: 'blue',
    features: ['1,000 AI requests/month', '500 events', '500 tasks', 'Email support'],
    limits: { ai_requests: 1000, events: 500, tasks: 500 }
  },
  pro: {
    name: 'Pro',
    price: 19.99,
    color: 'purple',
    features: ['5,000 AI requests/month', 'Unlimited events & tasks', 'Priority support', 'Advanced analytics'],
    limits: { ai_requests: 5000, events: -1, tasks: -1 }
  },
  enterprise: {
    name: 'Enterprise',
    price: 49.99,
    color: 'amber',
    features: ['Unlimited AI requests', 'Unlimited events & tasks', 'Priority support', 'Advanced analytics', 'Custom integrations'],
    limits: { ai_requests: -1, events: -1, tasks: -1 }
  }
};

const statusConfig = {
  active: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    label: 'Active'
  },
  past_due: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    label: 'Payment Failed'
  },
  canceled: {
    icon: XCircle,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    label: 'Canceled'
  },
  grace_period: {
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    label: 'Grace Period'
  }
};

export default function EnhancedSubscriptionCard({ subscription, usageData = [], onManage, onUpgrade, onCancel }) {
  // Convert array to object keyed by feature_type
  const usage = usageData.reduce((acc, item) => {
    acc[item.feature_type] = item.count || 0;
    return acc;
  }, {});
  const plan = planFeatures[subscription.plan] || planFeatures.free;
  const status = statusConfig[subscription.status] || statusConfig.active;
  const StatusIcon = status.icon;

  const daysUntilRenewal = subscription.current_period_end 
    ? differenceInDays(new Date(subscription.current_period_end), new Date())
    : 0;

  const isNearRenewal = daysUntilRenewal <= 3 && daysUntilRenewal >= 0;

  const calculateUsagePercent = (feature) => {
    const limit = plan.limits[feature];
    if (limit === -1) return 0; // Unlimited
    const used = usage[feature] || 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percent) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 80) return 'bg-amber-500';
    return 'bg-teal-500';
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Status Banner */}
      {subscription.status !== 'active' && (
        <div className={cn("px-4 py-2 text-sm font-medium flex items-center gap-2", status.bg)}>
          <StatusIcon className={cn("w-4 h-4", status.color)} />
          <span className={status.color}>{status.label}</span>
          {subscription.status === 'past_due' && (
            <span className="ml-auto text-xs">
              {subscription.payment_retry_count || 0}/3 retries
            </span>
          )}
        </div>
      )}

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              {plan.name}
              {subscription.plan !== 'free' && (
                <Badge variant="outline" className="text-lg">
                  ${plan.price}/mo
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {subscription.plan === 'free' ? 'Get started with essential features' : 'Your current subscription plan'}
            </CardDescription>
          </div>
          {subscription.plan !== 'enterprise' && onUpgrade && (
            <Button 
              onClick={() => {
                const targetPlan = subscription.plan === 'free' ? 'basic' : subscription.plan === 'basic' ? 'pro' : 'enterprise';
                onUpgrade(targetPlan, plan.name);
              }}
              className="gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Upgrade
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Billing Info */}
        {subscription.plan !== 'free' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>Next billing date</span>
              </div>
              <div className="font-semibold">
                {subscription.current_period_end 
                  ? format(new Date(subscription.current_period_end), 'MMM d, yyyy')
                  : '-'}
              </div>
            </div>

            {isNearRenewal && (
              <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg text-sm text-teal-700">
                <AlertCircle className="w-4 h-4" />
                <span>Renewal in {daysUntilRenewal} {daysUntilRenewal === 1 ? 'day' : 'days'}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <CreditCard className="w-4 h-4" />
                <span>Payment method</span>
              </div>
              <Button variant="link" size="sm" onClick={onManage}>
                Manage
              </Button>
            </div>
          </div>
        )}

        {/* Usage Limits */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Usage this month</h4>
            {subscription.plan !== 'enterprise' && (
              <Button variant="link" size="sm" onClick={() => onUpgrade('enterprise', 'Enterprise')}>
                <Zap className="w-3 h-3 mr-1" />
                Get unlimited
              </Button>
            )}
          </div>

          {Object.entries(plan.limits).map(([feature, limit]) => {
            const used = usage[feature] || 0;
            const percent = calculateUsagePercent(feature);
            const isUnlimited = limit === -1;

            return (
              <div key={feature} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-600">
                    {feature.replace('_', ' ')}
                  </span>
                  <span className="font-medium">
                    {isUnlimited 
                      ? 'Unlimited' 
                      : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
                  </span>
                </div>
                {!isUnlimited && (
                  <Progress 
                    value={percent} 
                    className="h-2"
                    indicatorClassName={getUsageColor(percent)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Features */}
        <div className="pt-4 border-t">
          <h4 className="font-semibold text-sm mb-3">Included features</h4>
          <ul className="space-y-2">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        {subscription.plan !== 'free' && subscription.status === 'active' && (
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full text-red-600 hover:text-red-700"
              onClick={onCancel}
            >
              Cancel Subscription
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}