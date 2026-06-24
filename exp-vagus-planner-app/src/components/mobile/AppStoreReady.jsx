import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Smartphone, Globe, Shield, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AppStoreReadyChecklist() {
  const checks = [
    {
      category: 'Mobile Optimization',
      icon: Smartphone,
      items: [
        { label: 'Responsive design (all screen sizes)', status: true },
        { label: 'Touch-optimized UI (44px tap targets)', status: true },
        { label: 'Pull-to-refresh on all pages', status: true },
        { label: 'Native-like page transitions', status: true },
        { label: 'Bottom tab navigation', status: true },
        { label: 'Safe area insets (notched devices)', status: true },
        { label: 'Keyboard optimization (no zoom)', status: true }
      ]
    },
    {
      category: 'PWA Features',
      icon: Globe,
      items: [
        { label: 'Web App Manifest configured', status: true },
        { label: 'Service Worker for offline support', status: true },
        { label: 'App shortcuts defined', status: true },
        { label: 'Install prompt implemented', status: true },
        { label: 'Offline indicator', status: true },
        { label: 'Background sync ready', status: true }
      ]
    },
    {
      category: 'Security & Privacy',
      icon: Shield,
      items: [
        { label: 'Privacy Policy page', status: true },
        { label: 'Terms of Service page', status: true },
        { label: 'Data Protection (GDPR)', status: true },
        { label: 'Cookie consent banner', status: true },
        { label: 'Legal consent flow', status: true },
        { label: 'Secure authentication (Base44)', status: true }
      ]
    },
    {
      category: 'Performance',
      icon: Zap,
      items: [
        { label: 'Lazy loading for heavy components', status: true },
        { label: 'React Query for caching', status: true },
        { label: 'Optimistic UI updates', status: true },
        { label: 'Image lazy loading', status: true },
        { label: 'Virtual scrolling for lists', status: true }
      ]
    }
  ];

  const totalItems = checks.reduce((sum, cat) => sum + cat.items.length, 0);
  const completedItems = checks.reduce((sum, cat) => 
    sum + cat.items.filter(item => item.status).length, 0
  );
  const completionRate = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          App Store Readiness
        </h1>
        <div className="flex items-center justify-center gap-2">
          <div className="text-6xl font-bold text-teal-600">{completionRate}%</div>
          <div className="text-left">
            <p className="text-sm text-slate-600">Complete</p>
            <p className="text-xs text-slate-500">{completedItems}/{totalItems} checks</p>
          </div>
        </div>
      </div>

      {checks.map((category) => {
        const Icon = category.icon;
        const categoryComplete = category.items.every(item => item.status);
        
        return (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${categoryComplete ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  <Icon className={`w-5 h-5 ${categoryComplete ? 'text-emerald-600' : 'text-slate-600'}`} />
                </div>
                {category.category}
                {categoryComplete && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                    ✓ Complete
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {category.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
                  >
                    <CheckCircle2 
                      className={`w-5 h-5 ${
                        item.status ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <span className={item.status ? 'text-slate-700' : 'text-slate-400'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardContent className="p-6">
          <h3 className="font-bold text-teal-900 mb-4 text-lg">Next Steps for Publishing:</h3>
          <ol className="space-y-3 text-sm text-teal-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Create app icons (192x192 and 512x512 PNG) and add to /public folder</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Take screenshots for App Store and Play Store listings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Configure custom domain in Base44 dashboard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Test on real iOS and Android devices</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">5.</span>
              <span>Use TWA (Trusted Web Activity) or Capacitor for native app packaging</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">6.</span>
              <span>Submit to Google Play Store and Apple App Store</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}