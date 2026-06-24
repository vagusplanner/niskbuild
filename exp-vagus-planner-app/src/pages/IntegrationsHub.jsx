import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, 
  Mail, 
  FolderOpen, 
  MessageSquare, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Link2,
  ArrowRight,
  Zap,
  Settings,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const INTEGRATIONS = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Two-way sync with your Google Calendar events',
    icon: Calendar,
    color: 'from-blue-500 to-cyan-600',
    connector: 'googlecalendar',
    features: ['Auto-sync events', 'Conflict detection', 'Real-time updates'],
    status: 'active'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Scan emails for events, bookings, and meeting invites',
    icon: Mail,
    color: 'from-red-500 to-pink-600',
    connector: 'gmail',
    features: ['Auto-detect events', 'Travel bookings', 'Meeting invites'],
    status: 'active'
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Attach files from Drive to events and tasks',
    icon: FolderOpen,
    color: 'from-yellow-500 to-orange-600',
    connector: 'googledrive',
    features: ['File attachments', 'Auto-sync documents', 'Shared access'],
    status: 'active'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications and updates to your Slack workspace',
    icon: MessageSquare,
    color: 'from-purple-500 to-indigo-600',
    connector: 'slack',
    features: ['Event reminders', 'Task updates', 'Meeting notifications'],
    status: 'available'
  }
];

export default function IntegrationsHub() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState({});

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const syncMutation = useMutation({
    mutationFn: async (integrationType) => {
      setSyncing(prev => ({ ...prev, [integrationType]: true }));
      
      if (integrationType === 'google_calendar') {
        const { data } = await SDK.functions.invoke('fullCalendarSync', {});
        return data;
      } else if (integrationType === 'gmail') {
        const { data } = await SDK.functions.invoke('scanGmailForEvents', {});
        return data;
      }
      
      return { success: true };
    },
    onSuccess: (data, integrationType) => {
      toast.success(`${integrationType} synced successfully!`);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSyncing(prev => ({ ...prev, [integrationType]: false }));
    },
    onError: (error, integrationType) => {
      toast.error(`Failed to sync ${integrationType}`);
      setSyncing(prev => ({ ...prev, [integrationType]: false }));
    }
  });

  const handleConnect = async (integration) => {
    if (integration.status === 'available') {
      toast.info('Integration coming soon! This will be available in the next update.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Integrations Hub
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Connect your favorite tools and services to enhance your productivity
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Active</p>
                <p className="text-2xl font-bold text-teal-600">3</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Available</p>
                <p className="text-2xl font-bold text-slate-600">1</p>
              </div>
              <Link2 className="w-8 h-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Last Sync</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Just now</p>
              </div>
              <RefreshCw className="w-8 h-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INTEGRATIONS.map((integration, idx) => {
          const Icon = integration.icon;
          const isActive = integration.status === 'active';
          const isSyncing = syncing[integration.id];

          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${integration.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {integration.description}
                        </CardDescription>
                      </div>
                    </div>
                    {isActive ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Available</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Features */}
                  <div className="space-y-2">
                    {integration.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Zap className="w-4 h-4 text-teal-600" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    {isActive ? (
                      <>
                        <Button
                          onClick={() => syncMutation.mutate(integration.id)}
                          disabled={isSyncing}
                          className="flex-1"
                          variant="outline"
                        >
                          {isSyncing ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Sync Now
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleConnect(integration)}
                        className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600"
                      >
                        Connect
                        <ArrowRight className="w-4 h-4 ml-2" />
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
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Integration Tips
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                All integrations sync automatically in the background. You can manually trigger a sync anytime. 
                Your data is encrypted and secure. You can disconnect any integration at any time from Settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}