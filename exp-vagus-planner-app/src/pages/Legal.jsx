import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, FileText, Cookie, HelpCircle, Scale, Lock } from 'lucide-react';

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-3">Legal Information</h1>
          <p className="text-slate-600">Privacy, Terms, and Compliance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Privacy Policy */}
          <Link to={createPageUrl('PrivacyPolicy')}>
            <Card className="h-full hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <Shield className="w-12 h-12 text-blue-600 mb-3" />
                <CardTitle>Privacy Policy</CardTitle>
                <CardDescription>
                  How we collect, use, and protect your personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Data collection practices</li>
                  <li>• Information security</li>
                  <li>• Your privacy rights (GDPR)</li>
                  <li>• Third-party integrations</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          {/* Terms of Service */}
          <Link to={createPageUrl('TermsOfService')}>
            <Card className="h-full hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader>
                <FileText className="w-12 h-12 text-purple-600 mb-3" />
                <CardTitle>Terms of Service</CardTitle>
                <CardDescription>
                  Rules and guidelines for using our service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• User responsibilities</li>
                  <li>• Acceptable use policy</li>
                  <li>• Intellectual property</li>
                  <li>• Liability limitations</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          {/* Data Protection (GDPR) */}
          <Link to={createPageUrl('DataProtection')}>
            <Card className="h-full hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
              <CardHeader>
                <Scale className="w-12 h-12 text-emerald-600 mb-3" />
                <CardTitle>Data Protection</CardTitle>
                <CardDescription>
                  GDPR compliance and your data rights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Export your data</li>
                  <li>• Delete your account</li>
                  <li>• Data security measures</li>
                  <li>• Exercise your rights</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          {/* Support */}
          <Link to={createPageUrl('Support')}>
            <Card className="h-full hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardHeader>
                <HelpCircle className="w-12 h-12 text-amber-600 mb-3" />
                <CardTitle>Support & Contact</CardTitle>
                <CardDescription>
                  Get help and reach our support team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Contact support</li>
                  <li>• FAQs</li>
                  <li>• Help center</li>
                  <li>• Report issues</li>
                </ul>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Compliance Badges */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Our Commitments</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">GDPR Compliant</h3>
              <p className="text-xs text-slate-500">Full EU data protection</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">Encrypted</h3>
              <p className="text-xs text-slate-500">End-to-end security</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">Transparent</h3>
              <p className="text-xs text-slate-500">Clear policies</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">Responsive Support</h3>
              <p className="text-xs text-slate-500">24/7 assistance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}