import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Mail, CheckCircle, AlertCircle, 
  ExternalLink, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function ExternalIntegrations() {
  const integrations = [
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      description: 'Sync your calendar events with Google Calendar',
      icon: Calendar,
      connected: true,
      scopes: ['calendar.readonly', 'calendar.events'],
      color: 'blue'
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Import events and meetings from your Gmail inbox',
      icon: Mail,
      connected: true,
      scopes: ['gmail.readonly'],
      color: 'red'
    }
  ];

  const handleSync = async (integrationId) => {
    toast.info(`Starting sync for ${integrationId}...`);
    // Sync functionality is already implemented in Calendar page
  };

  const handleDisconnect = (integrationId) => {
    toast.info('Contact admin to disconnect integrations');
  };

  return (
    <div className="space-y-4">
      {integrations.map((integration) => {
        const Icon = integration.icon;
        return (
          <Card key={integration.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl bg-${integration.color}-100 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${integration.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800">{integration.name}</h3>
                      {integration.connected ? (
                        <Badge className="bg-green-100 text-green-700 border-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{integration.description}</p>
                    {integration.connected && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {integration.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {integration.connected ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSync(integration.id)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Sync Now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDisconnect(integration.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button size="sm">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-dashed border-2">
        <CardContent className="p-8 text-center">
          <p className="text-slate-500 mb-4">More integrations coming soon!</p>
          <Button variant="outline" disabled>
            <ExternalLink className="w-4 h-4 mr-2" />
            Request Integration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}