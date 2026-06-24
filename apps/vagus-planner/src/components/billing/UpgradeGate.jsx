import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Zap, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * UpgradeGate — wraps any feature with a blur overlay + upgrade CTA.
 *
 * Usage:
 *   <UpgradeGate locked={plan === 'free'} feature="AI Scheduling" requiredPlan="Pro">
 *     <MyFeatureComponent />
 *   </UpgradeGate>
 *
 * Props:
 *   locked       — boolean: whether to show the gate
 *   feature      — string: human-readable feature name shown in the prompt
 *   requiredPlan — string: e.g. "Pro", "Basic" (display only)
 *   description  — optional string: extra context shown in the prompt
 *   children     — the feature UI (blurred when locked)
 *   className    — optional extra classes on the wrapper
 *   minimal      — boolean: show a smaller inline banner instead of full blur overlay
 */
export default function UpgradeGate({
  locked,
  feature = 'this feature',
  requiredPlan = 'Pro',
  description,
  children,
  className,
  minimal = false,
}) {
  if (!locked) return children;

  if (minimal) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {feature} requires {requiredPlan}
            </p>
            {description && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{description}</p>
            )}
          </div>
          <Link to={createPageUrl('Billing')}>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 h-8 flex-shrink-0">
              Upgrade
            </Button>
          </Link>
        </div>
        <div className="opacity-40 pointer-events-none select-none">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Blurred content behind the overlay */}
      <div className="blur-sm pointer-events-none select-none opacity-60" aria-hidden>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 max-w-xs w-full mx-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1">
            {feature}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {description || `Unlock ${feature} by upgrading to the ${requiredPlan} plan.`}
          </p>
          <Link to={createPageUrl('Billing')}>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2">
              <Zap className="w-4 h-4" />
              Upgrade to {requiredPlan}
            </Button>
          </Link>
          <p className="text-xs text-slate-400 mt-2">14-day free trial • No credit card needed</p>
        </div>
      </div>
    </div>
  );
}