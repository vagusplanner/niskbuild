import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Shield, FileText, Mail, HelpCircle } from 'lucide-react';

export default function CopyrightFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-white font-semibold mb-4">MyAssistant</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your Islamic travel and lifestyle companion with AI-powered assistance for prayer times, calendar management, and spiritual growth.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Legal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={createPageUrl('PrivacyPolicy')} className="hover:text-teal-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to={createPageUrl('TermsOfService')} className="hover:text-teal-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to={createPageUrl('DataProtection')} className="hover:text-teal-400 transition-colors">
                  Data Protection (GDPR)
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Support
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={createPageUrl('Support')} className="hover:text-teal-400 transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <a href="mailto:support@myassistant.com" className="hover:text-teal-400 transition-colors">
                  support@myassistant.com
                </a>
              </li>
              <li>
                <Link to={createPageUrl('Support')} className="hover:text-teal-400 transition-colors">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-white font-semibold mb-4">Features</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={createPageUrl('Calendar')} className="hover:text-teal-400 transition-colors">
                  Smart Calendar
                </Link>
              </li>
              <li>
                <Link to={createPageUrl('Islamic')} className="hover:text-teal-400 transition-colors">
                  Islamic Tools
                </Link>
              </li>
              <li>
                <Link to={createPageUrl('Holidays')} className="hover:text-teal-400 transition-colors">
                  Travel Planning
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              © {currentYear} MyAssistant. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">Made with ❤️ for the Muslim community</span>
              <Badge variant="outline" className="border-teal-400 text-teal-400">
                GDPR Compliant
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}