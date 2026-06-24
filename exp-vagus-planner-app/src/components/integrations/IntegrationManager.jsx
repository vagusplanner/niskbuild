import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Video, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle,
  Link,
  Unlink,
  Settings,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';

const INTEGRATIONS = [
  {
    id: 'googledrive',
    name: 'Google Drive',
    icon: FileText,
    color: 'from-blue-500 to-cyan-500',
    description: 'Link and upload files directly from the app',
    features: ['Upload files', 'Attach to events', 'Share documents'],
    authorized: true
  },
  {
    id: 'googlecalendar',
    name: 'Google Calendar',
    icon: FileText,
    color: 'from-red-500 to-pink-500',
    description: 'Sync events and collaborate with others',
    features: ['Sync events', 'Share calendars', 'See availability'],
    authorized: true
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: MessageSquare,
    color: 'from-red-500 to-orange-500',
    description: 'Create events from emails and send invites',
    features: ['Email to event', 'Send invitations', 'Notifications'],
    authorized: true
  },
  {
    id: 'zoom',
    name: 'Zoom',
    icon: Video,
    color: 'from-blue-600 to-blue-400',
    description: 'Start video calls directly from events',
    features: ['Video meetings', 'Recording', 'Screen sharing'],
    authorized: false,
    comingSoon: true
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: MessageSquare,
    color: 'from-violet-500 to-purple-500',
    description: 'Send notifications to Slack channels',
    features: ['Event notifications', 'Channel updates'],
    authorized: false,
    comingSoon: true
  }
];

export default function IntegrationManager() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [disconnectingId, setDisconnectingId] = useState(null);

  const handleAuthorize = async (integration) => {
    toast.info(`Opening ${integration.name} authorization...`);
    // Authorization would be handled through the request_oauth_authorization tool
    // For now, show placeholder
    toast.success(`${integration.name} authorized successfully!`);
  };

  const handleDisconnect = async (integration) => {
    setDisconnectingId(integration.id);
    try {
      // Backend function would handle token removal
      await SDK.functions.invoke('disconnectIntegration', {
        integration_type: integration.id
      });
      
      setIntegrations(prev =>
        prev.map(int =>
          int.id === integration.id ? { ...int, authorized: false } : int
        )
      );
      toast.success(`${integration.name} disconnected`);
    } catch (error) {
      toast.error(`Failed to disconnect ${integration.name}`);
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Link className="w-6 h-6 text-teal-600" />
          Connected Applications
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Integrate with your favorite tools to enhance your productivity
        </p>
      </motion.div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration, index) => {
          const Icon = integration.icon;
          const isAuthorized = integration.authorized;

          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <CardHeader className={`bg-gradient-to-r ${integration.color} text-white`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-8 h-8" />
                      <div>
                        <CardTitle className="text-white">
                          {integration.name}
                        </CardTitle>
                        <CardDescription className="text-white/80 text-xs mt-1">
                          {integration.description}
                        </CardDescription>
                      </div>
                    </div>
                    {isAuthorized && (
                      <Badge className="bg-green-500 text-white">Connected</Badge>
                    )}
                    {integration.comingSoon && (
                      <Badge className="bg-slate-500 text-white">Coming Soon</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  {/* Features */}
                  <div className="space-y-2">
                    {integration.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Status Info */}
                  {isAuthorized && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                        <CheckCircle className="w-4 h-4" />
                        <span>Successfully connected</span>
                      </div>
                    </div>
                  )}

                  {!isAuthorized && !integration.comingSoon && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4" />
                        <span>Not connected yet</span>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-2 flex gap-2">
                    {isAuthorized ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(integration)}
                        disabled={disconnectingId === integration.id}
                        className="w-full"
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    ) : !integration.comingSoon ? (
                      <Button
                        size="sm"
                        onClick={() => handleAuthorize(integration)}
                        className="w-full bg-teal-600 hover:bg-teal-700"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled
                        className="w-full"
                      >
                        Coming Soon
                      </Button>
                    )}
                    
                    {isAuthorized && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-10"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 border-teal-200 dark:border-teal-800">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <AlertCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-teal-900 dark:text-teal-100">
                Secure Connection
              </h4>
              <p className="text-sm text-teal-800 dark:text-teal-200">
                All integrations use OAuth 2.0 for secure authentication. We never store your passwords, and you can disconnect at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}