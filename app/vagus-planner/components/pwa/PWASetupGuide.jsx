import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, Check, Copy, Download, 
  FileCode, Settings, Bell, Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function PWASetupGuide() {
  const [copiedStep, setCopiedStep] = useState(null);

  const copyToClipboard = (text, step) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const manifestJson = `{
  "name": "MyAssistant - Personal Calendar & Islamic Planner",
  "short_name": "MyAssistant",
  "description": "Your personal calendar, task manager, and Islamic companion",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#14b8a6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/pwa-icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/pwa-icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}`;

  const indexHtmlAddition = `<!-- Add this to your index.html head section -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#14b8a6">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="MyAssistant">
<link rel="apple-touch-icon" href="/pwa-icon-192.png">

<!-- Add this before closing body tag -->
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.error('Service Worker registration failed', err));
    });
  }
</script>`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-teal-600" />
          PWA Setup Guide
          <Badge variant="outline" className="ml-auto">Admin Only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-teal-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-teal-600 mt-0.5" />
            <div>
              <p className="font-medium text-teal-900 mb-1">PWA Features Ready!</p>
              <p className="text-sm text-teal-700">
                Install prompts, push notifications, and offline support are configured. 
                Complete the steps below to activate full PWA functionality.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Create manifest.json */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
              1
            </div>
            <h3 className="font-semibold">Create manifest.json</h3>
          </div>
          <p className="text-sm text-slate-600 pl-10">
            Create a <code className="bg-slate-100 px-1 rounded">manifest.json</code> file in your public folder:
          </p>
          <div className="pl-10">
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                {manifestJson}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(manifestJson, 1)}
              >
                {copiedStep === 1 ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Step 2: Add icons */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
              2
            </div>
            <h3 className="font-semibold">Add App Icons</h3>
          </div>
          <p className="text-sm text-slate-600 pl-10">
            Create two PNG icons and place them in your public folder:
          </p>
          <ul className="text-sm text-slate-600 pl-10 space-y-1">
            <li>• <code className="bg-slate-100 px-1 rounded">pwa-icon-192.png</code> (192x192 pixels)</li>
            <li>• <code className="bg-slate-100 px-1 rounded">pwa-icon-512.png</code> (512x512 pixels)</li>
          </ul>
        </div>

        {/* Step 3: Update index.html */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
              3
            </div>
            <h3 className="font-semibold">Update index.html</h3>
          </div>
          <p className="text-sm text-slate-600 pl-10">
            Add these meta tags and service worker registration to your index.html:
          </p>
          <div className="pl-10">
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                {indexHtmlAddition}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(indexHtmlAddition, 3)}
              >
                {copiedStep === 3 ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Step 4: Deploy */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
              4
            </div>
            <h3 className="font-semibold">Deploy & Test</h3>
          </div>
          <p className="text-sm text-slate-600 pl-10">
            Deploy your app and test PWA features:
          </p>
          <ul className="text-sm text-slate-600 pl-10 space-y-1">
            <li>• Visit your app on mobile (HTTPS required)</li>
            <li>• Look for the "Install App" prompt</li>
            <li>• Test offline functionality</li>
            <li>• Enable push notifications in Settings</li>
          </ul>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> Service worker file is already configured in the components. 
            The app will automatically register it once deployed. Push notifications require 
            HTTPS and user permission.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}