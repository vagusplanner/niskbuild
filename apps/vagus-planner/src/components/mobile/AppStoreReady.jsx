import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Smartphone, Globe, Shield, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Honest App Store readiness checklist — do NOT hardcode everything green.
 * Update statuses when ship blockers actually clear.
 */
export default function AppStoreReadyChecklist() {
  const checks = [
    {
      category: 'Mobile Optimization',
      icon: Smartphone,
      items: [
        { label: 'Responsive design (all screen sizes)', status: true },
        { label: 'Touch-optimized UI (44px tap targets)', status: true },
        { label: 'Pull-to-refresh on key pages', status: true },
        { label: 'Native-like page transitions', status: true },
        { label: 'Bottom tab navigation', status: true },
        { label: 'Safe area insets (notched devices)', status: true },
        { label: 'Keyboard optimization (no zoom)', status: true },
      ],
    },
    {
      category: 'Native / Capacitor packaging',
      icon: Globe,
      items: [
        { label: 'Capacitor iOS project present', status: true },
        { label: 'Push entitlements (aps-environment) set', status: true },
        { label: 'PrivacyInfo.xcprivacy present in app target', status: true },
        { label: 'Camera / speech / mic / location usage strings in Info.plist', status: true },
        {
          label: 'App Store screenshots + marketing assets prepared',
          status: false,
          note: 'Still required before submission',
        },
        {
          label: 'TestFlight / device QA signed off',
          status: false,
          note: 'Manual QA still required',
        },
      ],
    },
    {
      category: 'Security & Privacy',
      icon: Shield,
      items: [
        {
          label: 'Public Privacy Policy URL (https://niskbuild.com/vagus-planner/privacy)',
          status: true,
        },
        { label: 'In-app Privacy Policy + Terms routes', status: true },
        { label: 'Account deletion (deleteMe → full purge)', status: true },
        { label: 'Legal consent flow mounted in Layout', status: true },
        { label: 'Cookie consent banner', status: true },
        {
          label: 'Privacy Manifest data types / reasons legally reviewed',
          status: false,
          note: '[LEGAL REVIEW NEEDED]',
        },
      ],
    },
    {
      category: 'Performance',
      icon: Zap,
      items: [
        { label: 'Lazy loading for heavy components', status: true },
        { label: 'React Query for caching', status: true },
        { label: 'Optimistic UI updates (where implemented)', status: true },
        {
          label: 'Virtual scrolling for all long lists',
          status: false,
          note: 'Not uniformly applied',
        },
      ],
    },
  ];

  const totalItems = checks.reduce((sum, cat) => sum + cat.items.length, 0);
  const completedItems = checks.reduce(
    (sum, cat) => sum + cat.items.filter((item) => item.status).length,
    0
  );
  const completionRate = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">App Store Readiness</h1>
        <div className="flex items-center justify-center gap-2">
          <div className="text-6xl font-bold text-teal-600">{completionRate}%</div>
          <div className="text-left">
            <p className="text-sm text-slate-600">Complete</p>
            <p className="text-xs text-slate-500">
              {completedItems}/{totalItems} checks (honest status — not all green)
            </p>
          </div>
        </div>
      </div>

      {checks.map((category) => {
        const Icon = category.icon;
        const categoryComplete = category.items.every((item) => item.status);

        return (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${categoryComplete ? 'bg-emerald-100' : 'bg-amber-50'}`}
                >
                  <Icon
                    className={`w-5 h-5 ${categoryComplete ? 'text-emerald-600' : 'text-amber-600'}`}
                  />
                </div>
                {category.category}
                {categoryComplete ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                    ✓ Complete
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    Incomplete
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {category.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                    {item.status ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className={item.status ? 'text-slate-700' : 'text-slate-600'}>
                        {item.label}
                      </span>
                      {item.note ? (
                        <p className="text-xs text-slate-500 mt-0.5">{item.note}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardContent className="p-6">
          <h3 className="font-bold text-teal-900 mb-4 text-lg">Remaining before submit</h3>
          <ol className="space-y-3 text-sm text-teal-800">
            <li>1. Prepare App Store screenshots and listing copy</li>
            <li>
              2. Set App Store Connect Privacy Policy URL to{' '}
              <code className="text-xs bg-white/70 px-1 rounded">
                https://niskbuild.com/vagus-planner/privacy
              </code>
            </li>
            <li>3. Confirm Push capability + APNs key in Apple Developer (entitlement alone is not enough)</li>
            <li>4. Legal review of PrivacyInfo.xcprivacy collected-data declarations</li>
            <li>5. TestFlight on real devices, then submit</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
