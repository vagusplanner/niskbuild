import React, { useState } from 'react';
import { Check, X, Sparkles, Moon, Calendar, Mail, Zap, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const STANDARD_PLANS = [
  {
    name: 'Free',
    id: 'free',
    price: 0,
    bestFor: 'Just exploring',
    description: 'Try it out, no commitment needed',
    cta: 'Current Plan',
    color: 'slate',
    emoji: '👋',
    features: {
      '100 events & tasks/month': { included: true },
      '5 AI requests/day': { included: true },
      '1 calendar integration': { included: true },
      'Read-only sharing links': { included: true },
      'Team collaboration': { included: false },
      'Smart reminders & AI scheduling': { included: false },
      'Advanced analytics': { included: false },
      'Priority support': { included: false }
    }
  },
  {
    name: 'Basic',
    id: 'basic',
    price: 7.99,
    annualPrice: 70,
    priceIds: { monthly: 'price_1T1BluJyFnU6pCi2dPp6i0GS', annual: 'price_1T1BluJyFnU6pCi2W4CQkEvy' },
    bestFor: 'Individuals & small households',
    description: 'Everything you need to stay organised',
    cta: 'Start Free Trial',
    badge: 'Great Value',
    color: 'blue',
    emoji: '⚡',
    features: {
      '500 events & tasks/month': { included: true },
      '1,000 AI requests/month': { included: true },
      '5 calendar integrations': { included: true },
      '2 GB storage': { included: true },
      '5 team members': { included: true },
      'Smart reminders': { included: true },
      'Basic analytics': { included: true },
      'Priority email support': { included: true }
    }
  },
  {
    name: 'Pro',
    id: 'pro',
    price: 14.99,
    annualPrice: 149,
    priceIds: { monthly: 'price_1T1BluJyFnU6pCi2imsJixKd', annual: 'price_1T1BluJyFnU6pCi2RtkCllVn' },
    bestFor: 'Power users & growing teams',
    description: 'Full access — no limits, no compromises',
    cta: 'Start Free Trial',
    popular: true,
    color: 'teal',
    emoji: '🚀',
    features: {
      'Unlimited events & tasks': { included: true },
      '5,000 AI requests/month': { included: true },
      'Unlimited calendar integrations': { included: true },
      '10 GB storage': { included: true },
      '10 team members': { included: true },
      'AI auto-scheduler & time blocking': { included: true },
      'Guest sharing links': { included: true },
      'Advanced analytics & weekly AI report': { included: true },
      'Travel automation': { included: true },
      'Priority chat + email support': { included: true }
    }
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    contactOnly: true,
    bestFor: 'Companies & large organisations',
    description: 'Custom setup with your brand & team',
    cta: 'Contact Sales',
    color: 'purple',
    emoji: '🏢',
    features: {
      'Everything in Pro': { included: true },
      'Unlimited team members': { included: true },
      'Unlimited AI requests & storage': { included: true },
      'Private company workspace chat': { included: true },
      'Workflow automations': { included: true },
      'SSO / SAML login': { included: true },
      'Custom branding & white-label': { included: true },
      'Dedicated onboarding & account manager': { included: true },
      'Full API access & audit logs': { included: true },
      'SLA guarantee + 24/7 support': { included: true }
    }
  }
];

const ISLAMIC_PLANS = [
  {
    name: 'Free',
    id: 'free',
    price: 0,
    bestFor: 'Just getting started',
    description: 'A taste of the Islamic Edition',
    cta: 'Current Plan',
    color: 'slate',
    emoji: '🌙',
    features: {
      '100 events/month': { included: true },
      'Prayer times (basic view)': { included: true },
      'Quran reader (first 3 surahs)': { included: true },
      'Qibla direction': { included: true },
      'Zakat calculator': { included: false },
      'Full Quran + memorization': { included: false },
      'Ramadan & Hajj planner': { included: false },
      'AI Islamic coach': { included: false }
    }
  },
  {
    name: 'Basic Islamic',
    id: 'basic_islamic',
    price: 9.99,
    annualPrice: 89,
    priceIds: { monthly: 'price_1T4qqXJyFnU6pCi2Zv7qLaWc', annual: 'price_1T4qqXJyFnU6pCi2xFOb6DTF' },
    bestFor: 'Practising Muslims & families',
    description: 'Your complete daily Islamic companion',
    cta: 'Start Free Trial',
    badge: 'Great Value',
    color: 'blue',
    emoji: '⭐',
    features: {
      '500 events/month': { included: true },
      '1,000 AI requests/month': { included: true },
      'Full prayer times + Adhan player': { included: true },
      'Full Quran + bookmarks': { included: true },
      'Zakat al-Māl calculator': { included: true },
      'Ramadan tracker & fasting log': { included: true },
      'Hajj/Umrah planner (basic)': { included: true },
      'Family prayer tracking (3 members)': { included: true },
      'Hadith of the Day': { included: true },
      'Priority email support': { included: true }
    }
  },
  {
    name: 'Pro Islamic',
    id: 'pro_islamic',
    price: 17.99,
    annualPrice: 179,
    priceIds: { monthly: 'price_1T4qqXJyFnU6pCi2SRgbaRTv', annual: 'price_1T4qqXJyFnU6pCi29jIt9WEI' },
    bestFor: 'Dedicated Muslims & groups',
    description: 'Full Islamic suite — everything unlocked',
    cta: 'Start Free Trial',
    popular: true,
    color: 'indigo',
    emoji: '🕋',
    features: {
      'Unlimited events': { included: true },
      '5,000 AI requests/month': { included: true },
      'Prayer times + AI insights': { included: true },
      'Full Quran + memorization tracker': { included: true },
      'Zakat multi-year tracking': { included: true },
      'Ramadan tracker + leaderboards': { included: true },
      'Full Hajj/Umrah + group tools': { included: true },
      'AI Islamic coach & Dua generator': { included: true },
      'Family prayer hub (10 members)': { included: true },
      'Group Dhikr sessions': { included: true },
      '99 Names, Sunnah habits & Life Score': { included: true },
      'Priority chat + email support': { included: true }
    }
  },
  {
    name: 'Enterprise Islamic',
    id: 'enterprise_islamic',
    contactOnly: true,
    bestFor: 'Mosques, Islamic schools & orgs',
    description: 'Community-scale Islamic platform',
    cta: 'Contact Sales',
    color: 'purple',
    emoji: '🕌',
    features: {
      'Everything in Pro Islamic': { included: true },
      'Unlimited members & AI requests': { included: true },
      'Private mosque community chat': { included: true },
      'Group Hajj coordination (100+ pilgrims)': { included: true },
      'Custom Islamic calendar & events': { included: true },
      'Community leaderboards & challenges': { included: true },
      'White-label & custom branding': { included: true },
      'Dedicated account manager': { included: true },
      'Full API access': { included: true },
      '24/7 priority support': { included: true }
    }
  }
];

const colorMap = {
  slate: { badge: 'bg-slate-100 text-slate-700', border: 'border-t-slate-400', btn: '', ring: '' },
  blue: { badge: 'bg-blue-100 text-blue-700', border: 'border-t-blue-500', btn: 'bg-blue-600 hover:bg-blue-700', ring: 'border-blue-200 dark:border-blue-800' },
  teal: { badge: 'bg-teal-100 text-teal-700', border: 'border-t-teal-500', btn: 'bg-teal-600 hover:bg-teal-700', ring: 'border-teal-400 shadow-xl shadow-teal-100 dark:shadow-teal-900/20' },
  indigo: { badge: 'bg-indigo-100 text-indigo-700', border: 'border-t-indigo-500', btn: 'bg-indigo-600 hover:bg-indigo-700', ring: 'border-indigo-400 shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20' },
  purple: { badge: 'bg-purple-100 text-purple-700', border: 'border-t-purple-500', btn: 'bg-purple-600 hover:bg-purple-700', ring: '' },
};

function PlanCard({ plan, currentPlan, billingCycle, onUpgrade, isProcessing, selectedPlan, islamicMode }) {
  const colors = colorMap[plan.color] || colorMap.slate;
  const isCurrentPlan = plan.id === currentPlan;

  return (
    <div className={cn('relative flex flex-col h-full transition-all duration-200', plan.popular && 'lg:scale-105 z-10')}>
      {plan.popular && (
        <div className="absolute -top-4 inset-x-0 flex justify-center z-20">
          <Badge className={cn('flex items-center gap-1 shadow-lg', islamicMode ? 'bg-indigo-600 hover:bg-indigo-600' : 'bg-teal-600 hover:bg-teal-600')}>
            <Sparkles className="w-3 h-3" /> Most Popular
          </Badge>
        </div>
      )}
      {plan.badge && !plan.popular && (
        <div className="absolute -top-4 inset-x-0 flex justify-center z-20">
          <Badge variant="outline" className="bg-white dark:bg-slate-800 text-blue-700 border-blue-200 shadow">{plan.badge}</Badge>
        </div>
      )}

      <Card className={cn(
        'flex-1 flex flex-col border-t-4',
        colors.border,
        plan.popular && colors.ring,
        'dark:bg-slate-800/60'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl mb-1">{plan.emoji}</div>
              <CardTitle className={cn('text-base font-bold',
                plan.color === 'slate' && 'text-slate-700 dark:text-slate-300',
                plan.color === 'blue' && 'text-blue-600',
                plan.color === 'teal' && 'text-teal-600',
                plan.color === 'indigo' && 'text-indigo-600',
                plan.color === 'purple' && 'text-purple-600'
              )}>
                {plan.name}
              </CardTitle>
            </div>
          </div>

          {/* Best for tag */}
          <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit mt-1', colors.badge)}>
            <Users className="w-3 h-3" />
            {plan.bestFor}
          </div>

          <CardDescription className="text-xs mt-1">{plan.description}</CardDescription>

          {/* Pricing */}
          <div className="mt-3">
            {plan.contactOnly ? (
              <div>
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">Custom</span>
                <p className="text-xs text-slate-500 mt-1">Tailored to your organisation</p>
              </div>
            ) : billingCycle === 'annual' && plan.annualPrice ? (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100">${plan.annualPrice}</span>
                  <span className="text-slate-400 text-sm">/year</span>
                </div>
                <p className="text-xs text-green-600 font-medium">${(plan.annualPrice / 12).toFixed(2)}/month — save {Math.round((1 - (plan.annualPrice / 12) / plan.price) * 100)}%</p>
              </div>
            ) : plan.price === 0 ? (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">Free</span>
                <span className="text-slate-400 text-sm">forever</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">${plan.price.toFixed(2)}</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col pt-0 gap-4">
          {/* CTA Button */}
          {plan.contactOnly ? (
            <a
              href="mailto:team@vagusplanner.com?subject=Enterprise%20Plan%20Enquiry"
              className="w-full flex items-center justify-center gap-2 h-9 px-4 rounded-md text-sm font-semibold transition-colors bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Mail className="w-4 h-4" /> Contact Sales
            </a>
          ) : (
            <Button
              onClick={() => {
                const priceId = plan.priceIds?.[billingCycle] || null;
                onUpgrade(plan.id, billingCycle, priceId);
              }}
              disabled={isCurrentPlan || plan.id === 'free' || (isProcessing && selectedPlan !== plan.id)}
              className={cn('w-full text-sm font-semibold', colors.btn)}
              variant={isCurrentPlan || plan.id === 'free' ? 'outline' : 'default'}
            >
              {isProcessing && selectedPlan === plan.id ? (
                <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />Processing...</>
              ) : isCurrentPlan ? 'Current Plan' : plan.id === 'free' ? 'Free Forever' : plan.cta}
            </Button>
          )}

          {!plan.contactOnly && plan.id !== 'free' && (
            <p className="text-center text-xs text-slate-400 -mt-2">14-day free trial · No card required · Cancel anytime</p>
          )}

          {/* Feature list */}
          <div className="space-y-2 flex-1">
            {Object.entries(plan.features).map(([feature, data]) => (
              <div key={feature} className="flex items-start gap-2 text-sm">
                {data.included ? (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-slate-200 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                )}
                <span className={cn('text-xs leading-relaxed', data.included ? 'text-slate-700 dark:text-slate-300' : 'text-slate-350 dark:text-slate-500')}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PlanComparison({ currentPlan, onUpgrade, isProcessing = false }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });
  const islamicMode = settings.length > 0 ? (settings[0].islamic_mode ?? false) : false;

  const plans = islamicMode ? ISLAMIC_PLANS : STANDARD_PLANS;

  const handleUpgrade = (planId, billingCycle, priceId) => {
    setSelectedPlan(planId);
    onUpgrade(planId, billingCycle, priceId);
  };

  return (
    <div className="space-y-6">
      {/* Edition badge */}
      <div className="flex items-center justify-center gap-2">
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border',
          islamicMode
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-300'
            : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800 dark:text-teal-300'
        )}>
          {islamicMode ? <Moon className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
          {islamicMode ? 'Islamic Edition Plans' : 'Standard Edition Plans'}
        </div>
        <p className="text-xs text-slate-400">Switch editions in Settings → Preferences</p>
      </div>

      {/* Billing toggle */}
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Simple, Transparent Pricing</h2>
          <p className="text-slate-500 text-sm mt-1">14-day free trial on all paid plans · No credit card required · Cancel anytime</p>
        </div>
        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn('px-5 py-2 rounded-lg font-semibold transition-all text-sm', billingCycle === 'monthly' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100' : 'text-slate-500')}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={cn('px-5 py-2 rounded-lg font-semibold transition-all text-sm flex items-center gap-2', billingCycle === 'annual' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100' : 'text-slate-500')}
          >
            Annual
            <Badge className="bg-green-500 hover:bg-green-500 text-white text-xs px-1.5">Save ~26%</Badge>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentPlan={currentPlan}
            billingCycle={billingCycle}
            onUpgrade={handleUpgrade}
            isProcessing={isProcessing}
            selectedPlan={selectedPlan}
            islamicMode={islamicMode}
          />
        ))}
      </div>

      {/* All plans include */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-teal-600" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Every plan includes:</h3>
        </div>
        <ul className="grid md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" />Secure data encryption</li>
          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" />Mobile & web access</li>
          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" />Offline mode</li>
          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" />Regular feature updates</li>
          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" />Multi-language support</li>
          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" />Import / export your data</li>
        </ul>
      </div>
    </div>
  );
}