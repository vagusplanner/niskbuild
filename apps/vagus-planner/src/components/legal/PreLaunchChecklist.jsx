import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

export default function PreLaunchChecklist() {
  const checklist = [
    {
      category: 'Legal Compliance',
      items: [
        { task: 'Privacy Policy page created', status: 'complete' },
        { task: 'Terms of Service page created', status: 'complete' },
        { task: 'Data Protection (GDPR) page created', status: 'complete' },
        { task: 'Cookie consent banner implemented', status: 'complete' },
        { task: 'Legal consent flow for new users', status: 'complete' },
        { task: 'Copyright footer added', status: 'complete' },
        { task: 'User consent tracking system', status: 'complete' }
      ]
    },
    {
      category: 'Data Protection',
      items: [
        { task: 'Data export functionality (GDPR)', status: 'complete' },
        { task: 'Account deletion feature', status: 'complete' },
        { task: 'Encryption in transit (HTTPS)', status: 'complete' },
        { task: 'User data isolation', status: 'complete' },
        { task: 'Consent withdrawal mechanism', status: 'complete' }
      ]
    },
    {
      category: 'User Experience',
      items: [
        { task: 'Enhanced onboarding flow', status: 'complete' },
        { task: 'Interactive tutorials', status: 'complete' },
        { task: 'Help center integrated', status: 'complete' },
        { task: 'Support page with contact form', status: 'complete' }
      ]
    },
    {
      category: 'PWA & Mobile',
      items: [
        { task: 'PWA manifest configured', status: 'complete' },
        { task: 'Offline functionality', status: 'complete' },
        { task: 'Install prompts', status: 'complete' },
        { task: 'Touch optimizations', status: 'complete' },
        { task: 'Responsive design', status: 'complete' }
      ]
    },
    {
      category: 'Still Needed',
      items: [
        { task: 'Update contact emails (privacy@, support@, legal@)', status: 'todo', note: 'Replace placeholder emails with real ones' },
        { task: 'Add company address in legal pages', status: 'todo', note: 'Update [Your Company Address] placeholders' },
        { task: 'Set jurisdiction in Terms of Service', status: 'todo', note: 'Specify governing law location' },
        { task: 'Test GDPR data export', status: 'todo', note: 'Verify all user data exports correctly' },
        { task: 'Review with legal counsel', status: 'todo', note: 'Have lawyer review all legal documents' },
        { task: 'Set up proper email infrastructure', status: 'todo', note: 'Configure support@, privacy@, legal@ email addresses' }
      ]
    }
  ];

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
      <CardHeader>
        <CardTitle>Pre-Launch Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {checklist.map((section, i) => (
          <div key={i}>
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              {section.category}
              <Badge variant={section.category === 'Still Needed' ? 'destructive' : 'default'}>
                {section.items.filter(item => item.status === 'complete').length}/{section.items.length}
              </Badge>
            </h3>
            <div className="space-y-2">
              {section.items.map((item, j) => (
                <div key={j} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  {item.status === 'complete' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : item.status === 'todo' ? (
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{item.task}</p>
                    {item.note && (
                      <p className="text-xs text-slate-500 mt-1">→ {item.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Final Notes */}
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-300">
          <h3 className="font-semibold text-purple-900 mb-3">📋 Next Steps for Launch</h3>
          <ol className="text-sm text-slate-700 space-y-2 ml-4">
            <li>1. Replace all placeholder contact information with real email addresses</li>
            <li>2. Add your company's physical address in all legal documents</li>
            <li>3. Specify your jurisdiction in Terms of Service</li>
            <li>4. Have a lawyer review all legal documents</li>
            <li>5. Test GDPR export and deletion thoroughly</li>
            <li>6. Set up proper email infrastructure for support@, privacy@, legal@</li>
            <li>7. Configure custom domain (if needed)</li>
            <li>8. Test on multiple devices and browsers</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}